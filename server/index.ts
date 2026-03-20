import { initDatabase, insertEvent, getRecentEvents, getFilterOptions, getSessions, getStats, getKnownProjectDirs } from "./db";
import { getAgents, getSkills, getHooks, getPlugins } from "./registry";
import type { HookEvent } from "./types";
import { existsSync } from "fs";
import { join } from "path";

// ── Config ──
const PORT = Number(Bun.env.CC_PORT) || 48900;
const DB_PATH = Bun.env.CC_DB_PATH || join(Bun.env.HOME!, ".claude", "control-center", "events.db");
const DASHBOARD_DIR = Bun.env.CC_DASHBOARD_DIR || join(import.meta.dir, "..", "dashboard", "dist");

// Ensure DB directory exists
const dbDir = DB_PATH.replace(/\/[^/]+$/, "");
if (!existsSync(dbDir)) {
  await Bun.$`mkdir -p ${dbDir}`.quiet();
}

initDatabase(DB_PATH);

// ── WebSocket clients ──
const wsClients = new Set<unknown>();

// ── CORS headers ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── MIME types ──
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function getMime(path: string): string {
  const ext = path.match(/\.[^.]+$/)?.[0] || "";
  return MIME[ext] || "application/octet-stream";
}

// ── Registry cache (refresh every 60s, keyed by projectDir) ──
const registryCache = new Map<string, { agents?: unknown; skills?: unknown; hooks?: unknown; plugins?: unknown; ts: number }>();
const CACHE_TTL = 60_000;

function getCachedRegistry(projectDir?: string) {
  const key = projectDir || "__global__";
  const cached = registryCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached;

  const entry = {
    agents: getAgents(projectDir),
    skills: getSkills(projectDir),
    hooks: getHooks(projectDir),
    plugins: getPlugins(),
    ts: Date.now(),
  };
  registryCache.set(key, entry);
  return entry;
}

// ── Server ──
const server = Bun.serve({
  port: PORT,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined as unknown as Response;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ── API: Events ──
    if (url.pathname === "/events" && req.method === "POST") {
      try {
        const event = (await req.json()) as HookEvent;
        if (!event.source_app || !event.session_id || !event.hook_event_type) {
          return Response.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
        }
        const saved = insertEvent(event);

        // Broadcast to WebSocket clients
        const msg = JSON.stringify({ type: "event", data: saved });
        for (const ws of wsClients) {
          try { (ws as WebSocket).send(msg); } catch {}
        }

        return Response.json(saved, { status: 201, headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 400, headers: corsHeaders });
      }
    }

    if (url.pathname === "/events/recent" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 300;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const filters = {
        eventType: url.searchParams.get("eventType") || undefined,
        sessionId: url.searchParams.get("sessionId") || undefined,
        sourceApp: url.searchParams.get("sourceApp") || undefined,
      };
      return Response.json(getRecentEvents(limit, offset, filters), { headers: corsHeaders });
    }

    if (url.pathname === "/events/filter-options" && req.method === "GET") {
      return Response.json(getFilterOptions(), { headers: corsHeaders });
    }

    if (url.pathname === "/events/sessions" && req.method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 50;
      return Response.json(getSessions(limit), { headers: corsHeaders });
    }

    // ── API: Registry ──
    const projectDir = url.searchParams.get("projectDir") || undefined;

    if (url.pathname === "/registry/projects") {
      return Response.json(getKnownProjectDirs(), { headers: corsHeaders });
    }
    if (url.pathname === "/registry/agents") {
      return Response.json(getCachedRegistry(projectDir).agents, { headers: corsHeaders });
    }
    if (url.pathname === "/registry/skills") {
      return Response.json(getCachedRegistry(projectDir).skills, { headers: corsHeaders });
    }
    if (url.pathname === "/registry/hooks") {
      return Response.json(getCachedRegistry(projectDir).hooks, { headers: corsHeaders });
    }
    if (url.pathname === "/registry/plugins") {
      return Response.json(getCachedRegistry(projectDir).plugins, { headers: corsHeaders });
    }
    if (url.pathname === "/registry/all") {
      const reg = getCachedRegistry(projectDir);
      return Response.json({
        agents: reg.agents,
        skills: reg.skills,
        hooks: reg.hooks,
        plugins: reg.plugins,
      }, { headers: corsHeaders });
    }

    // ── API: Stats & Health ──
    if (url.pathname === "/stats") {
      return Response.json(getStats(), { headers: corsHeaders });
    }

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", port: PORT, uptime: process.uptime() }, { headers: corsHeaders });
    }

    // ── Static files (dashboard) ──
    if (existsSync(DASHBOARD_DIR)) {
      let filePath = join(DASHBOARD_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      if (!existsSync(filePath)) {
        // SPA fallback
        filePath = join(DASHBOARD_DIR, "index.html");
      }
      if (existsSync(filePath)) {
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: { ...corsHeaders, "Content-Type": getMime(filePath) },
        });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
  },

  websocket: {
    open(ws) {
      wsClients.add(ws);
      // Send recent events on connect
      const recent = getRecentEvents(100);
      ws.send(JSON.stringify({ type: "initial", data: recent }));
    },
    message(_ws, _msg) {
      // No client messages expected
    },
    close(ws) {
      wsClients.delete(ws);
    },
  },
});


console.log(`🎛️  4C — Claude Code Command Center`);
console.log(`   http://localhost:${PORT}`);
console.log(`   ws://localhost:${PORT}/ws`);
console.log(`   db: ${DB_PATH}`);
