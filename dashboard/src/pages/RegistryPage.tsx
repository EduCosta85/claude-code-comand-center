import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Webhook, Puzzle, FolderOpen } from "lucide-react";
import { useRegistry, useProjectDirs } from "../hooks/useRegistry";
import { Badge } from "../components/Badge";

type Tab = "agents" | "skills" | "hooks" | "plugins";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "agents", label: "Agents", icon: <Bot size={16} /> },
  { id: "skills", label: "Skills", icon: <Sparkles size={16} /> },
  { id: "hooks", label: "Hooks", icon: <Webhook size={16} /> },
  { id: "plugins", label: "Plugins", icon: <Puzzle size={16} /> },
];

export function RegistryPage() {
  const [tab, setTab] = useState<Tab>("agents");
  const [projectDir, setProjectDir] = useState<string | undefined>();
  const projectDirs = useProjectDirs();
  const { agents, skills, hooks, plugins, loading } = useRegistry(projectDir);

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold"
      >
        Registry
      </motion.h1>

      {projectDirs.length > 0 && (
        <div className="flex items-center gap-3">
          <FolderOpen size={16} className="text-slate-400" />
          <select
            value={projectDir || ""}
            onChange={(e) => setProjectDir(e.target.value || undefined)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:border-indigo-500/50"
          >
            <option value="" className="bg-slate-900">Global only</option>
            {projectDirs.map((dir) => (
              <option key={dir} value={dir} className="bg-slate-900">
                {dir.split("/").pop()} — {dir}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-500 text-sm">Loading registry...</p>}

      {tab === "agents" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((a) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-white">{a.name}</h3>
                <Badge color={a.scope === "global" ? "#f59e0b" : "#6366f1"}>{a.scope}</Badge>
              </div>
              {a.model && <Badge color="#8b5cf6">{a.model}</Badge>}
              <p className="text-sm text-slate-400 line-clamp-2">{a.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {a.tools && <span className="text-xs text-slate-500">{a.tools.length} tools</span>}
                {a.skills && a.skills.length > 0 && (
                  <span className="text-xs text-slate-500">{a.skills.length} skills</span>
                )}
                {a.permissionMode && <Badge>{a.permissionMode}</Badge>}
              </div>
            </motion.div>
          ))}
          {agents.length === 0 && !loading && (
            <p className="text-slate-500 text-sm col-span-full text-center py-8">No agents registered</p>
          )}
        </div>
      )}

      {tab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {skills.map((s) => (
            <motion.div
              key={`${s.name}-${s.scope}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-white font-mono">/{s.name}</h3>
                <Badge color={s.scope === "global" ? "#f59e0b" : s.scope === "plugin" ? "#10b981" : "#6366f1"}>
                  {s.scope}
                </Badge>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2">{s.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {s.userInvocable && <Badge color="#10b981">user-invocable</Badge>}
                {s.agent && <Badge color="#3b82f6">agent: {s.agent}</Badge>}
                {s.pluginName && <Badge color="#10b981">{s.pluginName}</Badge>}
              </div>
            </motion.div>
          ))}
          {skills.length === 0 && !loading && (
            <p className="text-slate-500 text-sm col-span-full text-center py-8">No skills registered</p>
          )}
        </div>
      )}

      {tab === "hooks" && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-left">
                <th className="p-3 font-medium">Event Type</th>
                <th className="p-3 font-medium">Matcher</th>
                <th className="p-3 font-medium">Command</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {hooks.map((h, i) => (
                <tr key={`${h.eventType}-${h.command}-${i}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <Badge color="#f59e0b">{h.eventType}</Badge>
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-xs">{h.matcher || "-"}</td>
                  <td className="p-3 text-slate-300 font-mono text-xs max-w-xs truncate">{h.command}</td>
                  <td className="p-3"><Badge>{h.type}</Badge></td>
                  <td className="p-3">
                    <Badge color={h.source === "global" ? "#f59e0b" : h.source === "plugin" ? "#10b981" : "#6366f1"}>
                      {h.source}{h.pluginName ? `: ${h.pluginName}` : ""}
                    </Badge>
                  </td>
                </tr>
              ))}
              {hooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No hooks registered</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "plugins" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plugins.map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-white">{p.name}</h3>
                <Badge color={p.enabled ? "#10b981" : "#ef4444"}>
                  {p.enabled ? "enabled" : "disabled"}
                </Badge>
              </div>
              <p className="text-sm text-slate-400">{p.description}</p>
              <div className="flex items-center gap-2">
                <Badge>v{p.version}</Badge>
                <Badge>{p.scope}</Badge>
              </div>
            </motion.div>
          ))}
          {plugins.length === 0 && !loading && (
            <p className="text-slate-500 text-sm col-span-full text-center py-8">No plugins registered</p>
          )}
        </div>
      )}
    </div>
  );
}
