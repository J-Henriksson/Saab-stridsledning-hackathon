import { Siren, RadioTower, ShieldAlert, BadgeCheck } from "lucide-react";
import { GameEvent } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";

interface LarmPanelProps {
  events: GameEvent[];
}

const eventConfig = {
  critical: {
    icon: <Siren className="h-3.5 w-3.5" />,
    border: "border-red-300/60",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  warning: {
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    border: "border-amber-300/60",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  info: {
    icon: <RadioTower className="h-3.5 w-3.5" />,
    border: "border-blue-300/50",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  success: {
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    border: "border-blue-300/50",
    bg: "bg-blue-50/70",
    text: "text-blue-600",
    dot: "bg-blue-500",
  },
};

export function LarmPanel({ events }: LarmPanelProps) {
  const sorted = [...events].slice(0, 8);
  const kritiska = events.filter((e) => e.type === "critical" || e.type === "warning").length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-amber-500" />
          <h3 className="font-sans font-bold text-sm text-foreground tracking-wider">LARM & HÄNDELSER</h3>
        </div>
        {kritiska > 0 ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {kritiska} AKTIVA LARM
          </span>
        ) : (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300/50">
            NOMINELLT
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5 overflow-y-auto flex-1 max-h-[280px]">
        <AnimatePresence>
          {sorted.map((event) => {
            const cfg = eventConfig[event.type];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${cfg.border} ${cfg.bg}`}
              >
                <span className={`mt-0.5 shrink-0 ${cfg.text}`}>{cfg.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[10px] font-mono font-bold ${cfg.text} mb-0.5`}>
                    {event.type.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-foreground/90 leading-snug">{event.message}</div>
                  <div className="text-[9px] text-muted-foreground/60 font-mono mt-0.5">
                    {event.timestamp}{event.base && ` · ${event.base}`}
                  </div>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center py-6 font-mono">
            INGA HÄNDELSER REGISTRERADE
          </div>
        )}
      </div>
    </div>
  );
}
