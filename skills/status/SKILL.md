---
name: status
description: Show Control Center server status, active sessions, and event summary
disable-model-invocation: true
---

Check the Control Center server status.

Fetch these endpoints and display the results:
1. `GET http://localhost:48900/health` — server health
2. `GET http://localhost:48900/stats` — event stats
3. `GET http://localhost:48900/events/sessions?limit=5` — recent sessions

Format the output as a concise status report.
