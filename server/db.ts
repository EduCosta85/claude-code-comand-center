import { Database } from "bun:sqlite";
import type { HookEvent, FilterOptions, SessionSummary } from "./types";

let db: Database;

export function initDatabase(dbPath: string) {
  db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_app TEXT NOT NULL,
      session_id TEXT NOT NULL,
      hook_event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      summary TEXT,
      timestamp INTEGER NOT NULL,
      model_name TEXT
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_source_app ON events(source_app)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_session_id ON events(session_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_event_type ON events(hook_event_type)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)");
}

export function insertEvent(event: HookEvent): HookEvent {
  const stmt = db.prepare(`
    INSERT INTO events (source_app, session_id, hook_event_type, payload, summary, timestamp, model_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    event.source_app,
    event.session_id,
    event.hook_event_type,
    JSON.stringify(event.payload),
    event.summary ?? null,
    event.timestamp ?? Date.now(),
    event.model_name ?? null
  );

  return { ...event, id: Number(result.lastInsertRowid) };
}

export function getRecentEvents(limit = 300, offset = 0, filters?: {
  eventType?: string;
  sessionId?: string;
  sourceApp?: string;
}): HookEvent[] {
  let where = "1=1";
  const params: unknown[] = [];

  if (filters?.eventType) {
    where += " AND hook_event_type = ?";
    params.push(filters.eventType);
  }
  if (filters?.sessionId) {
    where += " AND session_id = ?";
    params.push(filters.sessionId);
  }
  if (filters?.sourceApp) {
    where += " AND source_app = ?";
    params.push(filters.sourceApp);
  }

  params.push(limit, offset);

  const rows = db.prepare(
    `SELECT * FROM events WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  ).all(...params) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload as string),
  })) as HookEvent[];
}

export function getFilterOptions(): FilterOptions {
  const apps = db.prepare("SELECT DISTINCT source_app FROM events ORDER BY source_app").all() as Array<{ source_app: string }>;
  const sessions = db.prepare("SELECT DISTINCT session_id FROM events ORDER BY rowid DESC LIMIT 50").all() as Array<{ session_id: string }>;
  const types = db.prepare("SELECT DISTINCT hook_event_type FROM events ORDER BY hook_event_type").all() as Array<{ hook_event_type: string }>;

  return {
    source_apps: apps.map((r) => r.source_app),
    session_ids: sessions.map((r) => r.session_id),
    hook_event_types: types.map((r) => r.hook_event_type),
  };
}

export function getSessions(limit = 50): SessionSummary[] {
  const rows = db.prepare(`
    SELECT
      session_id,
      source_app,
      MIN(timestamp) as first_event,
      MAX(timestamp) as last_event,
      COUNT(*) as event_count,
      GROUP_CONCAT(DISTINCT model_name) as models
    FROM events
    GROUP BY session_id
    ORDER BY MAX(timestamp) DESC
    LIMIT ?
  `).all(limit) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    // Get event type breakdown for this session
    const typeCounts = db.prepare(
      "SELECT hook_event_type, COUNT(*) as cnt FROM events WHERE session_id = ? GROUP BY hook_event_type"
    ).all(row.session_id as string) as Array<{ hook_event_type: string; cnt: number }>;

    const event_types: Record<string, number> = {};
    for (const t of typeCounts) {
      event_types[t.hook_event_type] = t.cnt;
    }

    return {
      session_id: row.session_id as string,
      source_app: row.source_app as string,
      first_event: row.first_event as number,
      last_event: row.last_event as number,
      event_count: row.event_count as number,
      event_types,
      models: (row.models as string)?.split(",").filter(Boolean) ?? [],
    };
  });
}

export function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const total = db.prepare("SELECT COUNT(*) as c FROM events").get() as { c: number };
  const todayCount = db.prepare("SELECT COUNT(*) as c FROM events WHERE timestamp >= ?").get(todayMs) as { c: number };
  const activeSessions = db.prepare(
    "SELECT COUNT(DISTINCT session_id) as c FROM events WHERE timestamp >= ?"
  ).get(Date.now() - 3600000) as { c: number }; // last hour

  return {
    total_events: total.c,
    events_today: todayCount.c,
    active_sessions: activeSessions.c,
  };
}
