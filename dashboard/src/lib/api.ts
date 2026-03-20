import type {
  Stats,
  HookEvent,
  FilterOptions,
  SessionSummary,
  RegistryAll,
} from "./types";

const BASE = "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => get<{ status: string; port: number; uptime: number }>("/health"),
  stats: () => get<Stats>("/stats"),
  recentEvents: (limit = 300, offset = 0, eventType?: string, sessionId?: string, sourceApp?: string) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (eventType) params.set("eventType", eventType);
    if (sessionId) params.set("sessionId", sessionId);
    if (sourceApp) params.set("sourceApp", sourceApp);
    return get<HookEvent[]>(`/events/recent?${params}`);
  },
  filterOptions: () => get<FilterOptions>("/events/filter-options"),
  sessions: (limit = 50) => get<SessionSummary[]>(`/events/sessions?limit=${limit}`),
  registry: (projectDir?: string) => {
    const params = projectDir ? `?projectDir=${encodeURIComponent(projectDir)}` : "";
    return get<RegistryAll>(`/registry/all${params}`);
  },
  projectDirs: () => get<string[]>("/registry/projects"),
};
