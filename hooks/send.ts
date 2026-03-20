#!/usr/bin/env bun

const PORT = 48900;
const SERVER_URL = `http://localhost:${PORT}`;
const eventType = process.argv[2];

if (!eventType) process.exit(0);

// Read stdin (Claude Code pipes hook data as JSON)
let input = "";
for await (const chunk of Bun.stdin.stream()) {
  input += new TextDecoder().decode(chunk);
}

let payload: Record<string, unknown> = {};
try {
  payload = JSON.parse(input);
} catch {
  // stdin might be empty for some events
}

// Auto-start server on SessionStart
if (eventType === "SessionStart") {
  try {
    const health = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (!health.ok) throw new Error();
  } catch {
    // Server not running — start it
    const pluginRoot = import.meta.dir.replace("/hooks", "");
    const dbDir = `${Bun.env.HOME}/.claude/control-center`;
    await Bun.$`mkdir -p ${dbDir}`.quiet();

    Bun.spawn(["bun", "run", `${pluginRoot}/server/index.ts`], {
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        ...process.env,
        CC_PORT: String(PORT),
        CC_DB_PATH: `${dbDir}/events.db`,
        CC_DASHBOARD_DIR: `${pluginRoot}/dashboard/dist`,
      },
    });

    // Wait for server to be ready
    for (let i = 0; i < 10; i++) {
      await Bun.sleep(500);
      try {
        const check = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(500) });
        if (check.ok) break;
      } catch {}
    }
  }
}

// Send event to server
const event = {
  source_app: payload.cwd
    ? String(payload.cwd).split("/").pop()
    : process.env.CLAUDE_PROJECT_DIR?.split("/").pop() ?? "unknown",
  session_id: (payload.session_id as string) ?? "unknown",
  hook_event_type: eventType,
  payload,
  timestamp: Date.now(),
};

try {
  await fetch(`${SERVER_URL}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(3000),
  });
} catch {
  // Server unreachable — silently fail, never block Claude Code
}

process.exit(0);
