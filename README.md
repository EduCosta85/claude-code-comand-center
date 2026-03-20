# Claude Code Command Center (4c)

A Claude Code plugin that provides a local control center with event tracking, session management, and a web dashboard. Runs a Bun server on port 48900 that captures Claude Code hook events and provides a real-time dashboard.

## Features

- **Event tracking** — Captures all Claude Code hook events (PreToolUse, PostToolUse, Stop, etc.) via HTTP POST
- **Session viewer** — Browse and filter sessions with full event history
- **Web dashboard** — Real-time React dashboard with charts, session graph, and registry explorer

## Prerequisites

- [Bun](https://bun.sh) runtime (for the server and hooks)

## Installation

**From marketplace:**
```bash
/plugin install 4c@claude-code-marketplace
```

Or add to `~/.claude/settings.json`:
```json
{
  "plugins": {
    "4c": {
      "source": {
        "source": "directory",
        "path": "/path/to/4c"
      }
    }
  }
}
```

**Post-install setup:**

The plugin hooks auto-configure on install. To build the dashboard:
```bash
cd dashboard && npm install && npm run build
```

Start the server:
```bash
bun run server/index.ts
```

## Usage

The server starts on `http://localhost:48900`.

### Skills

| Skill | Description |
|-------|-------------|
| `/4c:status` | Show server status and recent event counts |
| `/4c:sessions` | List recent sessions |
| `/4c:open` | Open the dashboard in the browser |

### Hook integration

Add to your Claude Code hooks config to forward events automatically:

```json
{
  "hooks": {
    "PreToolUse": [{ "command": "bun /path/to/control-center/hooks/send.ts" }],
    "PostToolUse": [{ "command": "bun /path/to/control-center/hooks/send.ts" }],
    "Stop": [{ "command": "bun /path/to/control-center/hooks/send.ts" }]
  }
}
```

## Architecture

```
server/       Bun HTTP + WebSocket server (port 48900)
  index.ts    Request routing, WebSocket broadcast
  db.ts       SQLite persistence via bun:sqlite
  registry.ts Reads agents, skills, hooks, plugins from ~/.claude
  types.ts    Shared TypeScript types
dashboard/    React + Vite frontend
  src/        Components, pages, hooks
hooks/        Claude Code hook scripts
  send.ts     Forwards hook events to the server
skills/       Claude Code skill definitions
  status/     /4c:status skill
  sessions/   /4c:sessions skill
  open/       /4c:open skill
```

Events are stored in `~/.claude/control-center/events.db` (SQLite).

## License

MIT
