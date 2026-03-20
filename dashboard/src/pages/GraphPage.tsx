import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { motion } from "framer-motion";
import { useRegistry } from "../hooks/useRegistry";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const n = g.node(node.id);
    return {
      ...node,
      position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  agent: { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.5)", text: "#818cf8" },
  skill: { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.5)", text: "#a78bfa" },
  hookType: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.5)", text: "#fbbf24" },
  plugin: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.5)", text: "#34d399" },
};

function makeNodeStyle(type: string): React.CSSProperties {
  const c = nodeColors[type] ?? nodeColors.agent;
  return {
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: "8px 16px",
    color: c.text,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: `0 0 20px ${c.border}`,
    width: NODE_WIDTH,
  };
}

export function GraphPage() {
  const { agents, skills, hooks, plugins, loading } = useRegistry();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { initialNodes, initialEdges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];

    for (const a of agents) {
      ns.push({
        id: `agent:${a.name}`,
        data: { label: `Agent: ${a.name}` },
        position: { x: 0, y: 0 },
        style: makeNodeStyle("agent"),
      });

      if (a.skills) {
        for (const sk of a.skills) {
          es.push({
            id: `agent:${a.name}->skill:${sk}`,
            source: `agent:${a.name}`,
            target: `skill:${sk}`,
            animated: true,
            style: { stroke: "rgba(139,92,246,0.4)" },
          });
        }
      }
    }

    for (const s of skills) {
      ns.push({
        id: `skill:${s.name}`,
        data: { label: `/${s.name}` },
        position: { x: 0, y: 0 },
        style: makeNodeStyle("skill"),
      });
    }

    const hookEventTypes = new Set<string>();
    for (const h of hooks) {
      hookEventTypes.add(h.eventType);
    }
    for (const et of hookEventTypes) {
      ns.push({
        id: `hookType:${et}`,
        data: { label: et },
        position: { x: 0, y: 0 },
        style: makeNodeStyle("hookType"),
      });
    }
    for (const h of hooks) {
      const hookId = `hook:${h.eventType}:${h.command.slice(0, 20)}`;
      if (!ns.find((n) => n.id === hookId)) {
        ns.push({
          id: hookId,
          data: { label: h.command.length > 30 ? h.command.slice(0, 30) + "..." : h.command },
          position: { x: 0, y: 0 },
          style: makeNodeStyle("hookType"),
        });
        es.push({
          id: `${hookId}->hookType:${h.eventType}`,
          source: hookId,
          target: `hookType:${h.eventType}`,
          style: { stroke: "rgba(245,158,11,0.4)" },
        });
      }
    }

    for (const p of plugins) {
      ns.push({
        id: `plugin:${p.name}`,
        data: { label: `Plugin: ${p.name}` },
        position: { x: 0, y: 0 },
        style: makeNodeStyle("plugin"),
      });
    }

    // Link plugin skills
    for (const s of skills) {
      if (s.pluginName) {
        es.push({
          id: `plugin:${s.pluginName}->skill:${s.name}`,
          source: `plugin:${s.pluginName}`,
          target: `skill:${s.name}`,
          animated: true,
          style: { stroke: "rgba(16,185,129,0.4)" },
        });
      }
    }

    // Link plugin hooks
    for (const h of hooks) {
      if (h.pluginName) {
        const hookId = `hook:${h.eventType}:${h.command.slice(0, 20)}`;
        es.push({
          id: `plugin:${h.pluginName}->hook:${hookId}`,
          source: `plugin:${h.pluginName}`,
          target: hookId,
          style: { stroke: "rgba(16,185,129,0.4)" },
        });
      }
    }

    // Deduplicate edges
    const edgeMap = new Map<string, Edge>();
    for (const e of es) {
      // Only add edge if both source and target nodes exist
      if (ns.find((n) => n.id === e.source) && ns.find((n) => n.id === e.target)) {
        edgeMap.set(e.id, e);
      }
    }

    return { initialNodes: ns, initialEdges: Array.from(edgeMap.values()) };
  }, [agents, skills, hooks, plugins]);

  const applyLayout = useCallback(() => {
    if (initialNodes.length === 0) return;
    const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(ln);
    setEdges(le);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Loading graph...</p>
      </div>
    );
  }

  if (initialNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">No registry data to visualize</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-4"
      >
        Connection Graph
      </motion.h1>

      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries(nodeColors).map(([type, c]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.text }} />
            {type === "hookType" ? "Hook Events" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
          </div>
        ))}
      </div>

      <div className="flex-1 rounded-xl border border-white/10 overflow-hidden" style={{ minHeight: 400 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0a0a0f" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
          <MiniMap
            nodeColor={(n) => {
              const id = n.id;
              if (id.startsWith("agent:")) return "#6366f1";
              if (id.startsWith("skill:")) return "#8b5cf6";
              if (id.startsWith("plugin:")) return "#10b981";
              return "#f59e0b";
            }}
            maskColor="rgba(0,0,0,0.8)"
            style={{ background: "#12121a", borderRadius: 8 }}
          />
          <Controls
            style={{ background: "#1a1a2e", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
