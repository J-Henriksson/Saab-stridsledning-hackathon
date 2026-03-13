import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { GameEvent } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";

interface LarmPanelProps {
  events: GameEvent[];
}

const iconMap = {
  critical: <XCircle className="h-3.5 w-3.5 text-status-red" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />,
  info: <Info className="h-3.5 w-3.5 text-status-blue" />,
  success: <CheckCircle className="h-3.5 w-3.5 text-status-green" />,
};

const bgMap = {
  critical: "border-status-red/30 bg-status-red/5",
  warning: "border-status-amber/30 bg-status-amber/5",
  info: "border-border",
  success: "border-status-green/30 bg-status-green/5",
};

export function LarmPanel({ events }: LarmPanelProps) {
  const sorted = [...events].slice(0, 8);
  const kritiska = events.filter((e) => e.type === "critical" || e.type === "warning").length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-amber" />
          <h3 className="font-sans font-bold text-sm text-foreground">LARM & HÄNDELSER</h3>
        </div>
        {kritiska > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-red/20 text-status-red border border-status-red/30">
            {kritiska} VARNINGAR
          </span>
        )}
      </div>
      <div className="p-3 space-y-2 overflow-y-auto max-h-[280px]">
        <AnimatePresence>
          {sorted.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 p-2 rounded border text-xs ${bgMap[event.type]}`}
            >
              <span className="mt-0.5 shrink-0">{iconMap[event.type]}</span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground">{event.message}</div>
                <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                  {event.timestamp}
                  {event.base && ` · ${event.base}`}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Inga händelser</div>
        )}
      </div>
    </div>
  );
}
