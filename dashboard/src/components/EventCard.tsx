import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { HookEvent } from "../lib/types";
import { eventColor, formatTimestamp } from "../lib/utils";
import { Badge } from "./Badge";
import { JsonViewer } from "./JsonViewer";

interface EventCardProps {
  event: HookEvent;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = eventColor(event.hook_event_type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-slate-500 font-mono w-18 shrink-0">
          {formatTimestamp(event.timestamp)}
        </span>
        <Badge color={color}>{event.hook_event_type}</Badge>
        <Badge>{event.source_app}</Badge>
        {event.model_name && !compact && (
          <Badge color="#8b5cf6">{event.model_name}</Badge>
        )}
        <span className="text-sm text-slate-300 truncate flex-1">
          {event.summary || toolFromPayload(event.payload)}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <div className="text-xs text-slate-500 mb-2">
                Session: {event.session_id.slice(0, 8)}
                {event.model_name && ` | Model: ${event.model_name}`}
              </div>
              <JsonViewer data={event.payload} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function toolFromPayload(payload: Record<string, unknown>): string {
  if (typeof payload.tool_name === "string") return payload.tool_name;
  if (typeof payload.tool === "string") return payload.tool;
  if (typeof payload.message === "string") return payload.message.slice(0, 80);
  return "";
}
