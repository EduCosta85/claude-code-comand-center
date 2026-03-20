---
name: sessions
description: List recent Claude Code sessions with stats from the Control Center
disable-model-invocation: true
argument-hint: "[limit]"
---

List recent sessions from the Control Center.

Fetch `GET http://localhost:48900/events/sessions?limit=$ARGUMENTS` (default limit 10 if no argument).

For each session display:
- Session ID (first 8 chars)
- Source app (project name)
- Duration (first to last event)
- Event count
- Event type breakdown
- Models used
