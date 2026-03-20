import { useEffect, useRef, useState, useCallback } from "react";
import type { HookEvent } from "../lib/types";

type Status = "connecting" | "connected" | "disconnected";

export function useWebSocket(maxEvents = 500) {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [status, setStatus] = useState<Status>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed.type === "initial" && Array.isArray(parsed.data)) {
          setEvents(parsed.data.slice(-maxEvents));
        } else if (parsed.type === "event" && parsed.data) {
          setEvents((prev) => [...prev.slice(-(maxEvents - 1)), parsed.data]);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [maxEvents]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { events, status };
}
