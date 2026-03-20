# Claude Code Command Center (4c)

A Claude Code plugin that runs a local Bun HTTP/WebSocket server on port 48900. It captures hook events from Claude Code, persists them to SQLite, and serves a real-time React dashboard.

## File structure

```
server/         Bun server (HTTP + WebSocket)
  index.ts      Entry point — routing, WebSocket, static file serving
  db.ts         SQLite schema, queries (bun:sqlite)
  registry.ts   Reads agents/skills/hooks/plugins from ~/.claude
  types.ts      Shared TypeScript types (HookEvent, etc.)

dashboard/      React + Vite frontend
  src/          Pages and components
  dist/         Built output (served by the server at /)

hooks/          Claude Code hook scripts
  send.ts       Reads stdin, POSTs event to localhost:48900/events
  hooks.json    Hook definitions for Claude Code

skills/         Claude Code skill definitions
  status/       /4c:status
  sessions/     /4c:sessions
  open/         /4c:open
```

## Tech stack

- **Runtime**: Bun (no Node.js required)
- **Database**: SQLite via `bun:sqlite` (no external ORM)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, React Flow
- **Server**: `Bun.serve` with built-in WebSocket support

## Dev commands

```bash
# Start server
bun run server/index.ts

# Dashboard dev (hot reload)
cd dashboard && npm run dev

# Build dashboard for production
cd dashboard && npm run build

# Lint dashboard
cd dashboard && npm run lint
```

## Environment variables

| Variable | Default |
|----------|---------|
| `CC_PORT` | `48900` |
| `CC_DB_PATH` | `~/.claude/control-center/events.db` |
| `CC_DASHBOARD_DIR` | `./dashboard/dist` |
