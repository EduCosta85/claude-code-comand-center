import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Calendar, Bot, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import type { Stats, HookEvent } from "../lib/types";
import { StatCard } from "../components/StatCard";
import { EventCard } from "../components/EventCard";
import { useRegistry } from "../hooks/useRegistry";
import { formatTimestamp } from "../lib/utils";

interface ChartPoint {
  time: string;
  count: number;
}

function buildChart(events: HookEvent[]): ChartPoint[] {
  const buckets = new Map<string, number>();
  const now = Date.now();
  // Create 24 hourly buckets
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now - i * 3600_000);
    const key = t.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }) + ":00";
    buckets.set(key, 0);
  }
  for (const e of events) {
    const ts = e.timestamp < 1e12 ? e.timestamp * 1000 : e.timestamp;
    if (now - ts > 24 * 3600_000) continue;
    const d = new Date(ts);
    const key = d.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }) + ":00";
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([time, count]) => ({ time, count }));
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total_events: 0, events_today: 0, active_sessions: 0 });
  const [events, setEvents] = useState<HookEvent[]>([]);
  const { agents, skills } = useRegistry();

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.recentEvents(300).then(setEvents).catch(() => {});
  }, []);

  const chartData = buildChart(events);
  const latest = events.slice(-10).reverse();

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold"
      >
        Dashboard
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Sessions" value={stats.active_sessions} icon={Activity} color="#6366f1" />
        <StatCard label="Events Today" value={stats.events_today} icon={Calendar} color="#8b5cf6" />
        <StatCard label="Agents" value={agents.length} icon={Bot} color="#3b82f6" />
        <StatCard label="Skills" value={skills.length} icon={Sparkles} color="#10b981" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <h2 className="text-lg font-semibold mb-4">Activity (Last 24h)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value) => [`${value} events`, "Count"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#grad)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <h2 className="text-lg font-semibold mb-4">Latest Events</h2>
        <div className="space-y-1">
          {latest.length === 0 && (
            <p className="text-slate-500 text-sm py-8 text-center">No events yet. Waiting for activity...</p>
          )}
          {latest.map((e) => (
            <EventCard key={`${e.id ?? e.timestamp}-${formatTimestamp(e.timestamp)}`} event={e} compact />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
