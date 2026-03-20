import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Filter } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";
import { api } from "../lib/api";
import type { FilterOptions } from "../lib/types";
import { EventCard } from "../components/EventCard";

export function ActivityPage() {
  const { events, status } = useWebSocket(500);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [options, setOptions] = useState<FilterOptions>({ source_apps: [], session_ids: [], hook_event_types: [] });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.filterOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const filtered = events.filter((e) => {
    if (filterType && e.hook_event_type !== filterType) return false;
    if (filterSession && e.session_id !== filterSession) return false;
    if (filterSource && e.source_app !== filterSource) return false;
    return true;
  });

  const statusColor = status === "connected" ? "#10b981" : status === "connecting" ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
        >
          Live Activity
        </motion.h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            {status}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              showFilters ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            <Filter size={16} />
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              autoScroll ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "border-white/10 text-slate-400 hover:text-white"
            }`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            {autoScroll ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border border-white/10 bg-white/5"
        >
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none"
          >
            <option value="">All Event Types</option>
            {options.hook_event_types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none"
          >
            <option value="">All Sessions</option>
            {options.session_ids.map((s) => (
              <option key={s} value={s}>{s.slice(0, 8)}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none"
          >
            <option value="">All Sources</option>
            {options.source_apps.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {(filterType || filterSession || filterSource) && (
            <button
              onClick={() => { setFilterType(""); setFilterSession(""); setFilterSource(""); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </motion.div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500 text-sm">
              {status === "connected" ? "Waiting for events..." : "Connecting to server..."}
            </p>
          </div>
        )}
        {filtered.map((e, i) => (
          <EventCard key={e.id ?? `${e.timestamp}-${i}`} event={e} />
        ))}
      </div>
    </div>
  );
}
