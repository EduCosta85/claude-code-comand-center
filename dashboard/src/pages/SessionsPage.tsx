import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Hash, Cpu } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import type { SessionSummary } from "../lib/types";
import { Badge } from "../components/Badge";
import { shortId, duration, formatDate, eventColor } from "../lib/utils";

export function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions(50)
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold"
      >
        Sessions
      </motion.h1>

      {loading && <p className="text-slate-500 text-sm">Loading sessions...</p>}

      <div className="space-y-2">
        {sessions.map((s) => {
          const isExpanded = expanded === s.session_id;
          const chartData = Object.entries(s.event_types).map(([name, value]) => ({
            name,
            value,
            fill: eventColor(name),
          }));

          return (
            <motion.div
              key={s.session_id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : s.session_id)}
                className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-mono text-indigo-400 font-semibold">{shortId(s.session_id)}</span>
                <Badge>{s.source_app}</Badge>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock size={14} />
                  {duration(s.first_event, s.last_event)}
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Hash size={14} />
                  {s.event_count} events
                </div>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {s.models.map((m) => (
                    <Badge key={m} color="#8b5cf6">
                      <Cpu size={10} className="mr-1" />
                      {m}
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-slate-500">{formatDate(s.first_event)}</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Session ID</span>
                          <p className="font-mono text-slate-300">{s.session_id}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Time Range</span>
                          <p className="text-slate-300">{formatDate(s.first_event)} - {formatDate(s.last_event)}</p>
                        </div>
                      </div>

                      {chartData.length > 0 && (
                        <div className="h-48 rounded-lg bg-black/20 p-3">
                          <p className="text-xs text-slate-500 mb-2">Event Type Breakdown</p>
                          <ResponsiveContainer width="100%" height="85%">
                            <BarChart data={chartData} layout="vertical">
                              <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={120} />
                              <Tooltip
                                contentStyle={{
                                  background: "#1a1a2e",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 8,
                                  color: "#e2e8f0",
                                  fontSize: 12,
                                }}
                              />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {sessions.length === 0 && !loading && (
          <p className="text-slate-500 text-sm text-center py-8">No sessions found</p>
        )}
      </div>
    </div>
  );
}
