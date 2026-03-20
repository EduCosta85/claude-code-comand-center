import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  BookOpen,
  GitBranch,
  Clock,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { api } from "./lib/api";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/activity", icon: Activity, label: "Live Activity" },
  { to: "/registry", icon: BookOpen, label: "Registry" },
  { to: "/graph", icon: GitBranch, label: "Graph" },
  { to: "/sessions", icon: Clock, label: "Sessions" },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [serverUp, setServerUp] = useState(false);

  useEffect(() => {
    const check = () =>
      api.health().then(() => setServerUp(true)).catch(() => setServerUp(false));
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        className="h-full border-r border-white/10 bg-[#12121a] flex flex-col shrink-0"
      >
        <div className="p-4 flex items-center gap-3">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent whitespace-nowrap"
            >
              4C
            </motion.span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${serverUp ? "bg-emerald-400" : "bg-red-400"}`}
            />
            {!collapsed && (
              <span className="text-xs text-slate-500">
                {serverUp ? "Server connected" : "Server offline"}
              </span>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
