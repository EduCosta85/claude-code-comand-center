const EVENT_COLORS: Record<string, string> = {
  "tool_use": "#6366f1",
  "tool_result": "#8b5cf6",
  "assistant_response": "#3b82f6",
  "user_message": "#10b981",
  "error": "#ef4444",
  "session_start": "#f59e0b",
  "session_end": "#f97316",
  "mcp_tool_call": "#06b6d4",
  "mcp_tool_result": "#14b8a6",
  "command": "#ec4899",
  "notification": "#a78bfa",
};

const FALLBACK_COLORS = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#f97316", "#a78bfa",
];

export function eventColor(eventType: string): string {
  if (EVENT_COLORS[eventType]) return EVENT_COLORS[eventType];
  let hash = 0;
  for (let i = 0; i < eventType.length; i++) {
    hash = eventType.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatDate(ts: number): string {
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function timeAgo(ts: number): string {
  const now = Date.now();
  const ms = now - (ts < 1e12 ? ts * 1000 : ts);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function duration(startTs: number, endTs: number): string {
  const ms = (endTs < 1e12 ? endTs * 1000 : endTs) - (startTs < 1e12 ? startTs * 1000 : startTs);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
