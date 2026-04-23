import { Siren, RadioTower, ShieldAlert, BadgeCheck, AlertTriangle } from "lucide-react";
import { GameEvent } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";

interface LarmPanelProps {
  events: GameEvent[];
}

const eventConfig = {
  critical: {
    icon: <Siren className="h-3.5 w-3.5" />,
    border: "hsl(353 74% 47% / 0.3)",
    bg: "hsl(353 74% 47% / 0.05)",
    text: "hsl(353 74% 42%)",
    dot: "hsl(353 74% 47%)",
    label: "KRITISK",
    stripColor: "hsl(353 74% 47%)",
  },
  warning: {
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    border: "hsl(42 64% 53% / 0.35)",
    bg: "hsl(42 64% 53% / 0.06)",
    text: "hsl(42 64% 38%)",
    dot: "hsl(42 64% 53%)",
    label: "VARNING",
    stripColor: "hsl(42 64% 53%)",
  },
  info: {
    icon: <RadioTower className="h-3.5 w-3.5" />,
    border: "hsl(220 63% 38% / 0.25)",
    bg: "hsl(220 63% 18% / 0.04)",
    text: "hsl(220 63% 38%)",
    dot: "hsl(220 63% 50%)",
    label: "INFO",
    stripColor: "hsl(220 63% 40%)",
  },
  success: {
    icon: <BadgeCheck className="h-3.5 w-3.5" />,
    border: "hsl(152 60% 32% / 0.3)",
    bg: "hsl(152 60% 32% / 0.05)",
    text: "hsl(152 60% 32%)",
    dot: "hsl(152 60% 40%)",
    label: "OK",
    stripColor: "hsl(152 60% 38%)",
  },
};

export function LarmPanel({ events }: LarmPanelProps) {
  const sorted = [...events].slice(0, 8);
  const kritiska = events.filter((e) => e.type === "critical").length;
  const varningar = events.filter((e) => e.type === "warning").length;

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{
        background: "linear-gradient(160deg, hsl(0 0% 100%), hsl(216 18% 98%))",
        border: "1px solid hsl(215 14% 84%)",
        boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06), 0 4px 12px hsl(220 63% 18% / 0.04)",
      }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: "hsl(42 64% 53% / 0.12)" }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "hsl(42 64% 48%)" }} />
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
              LARM & HÄNDELSER
            </h3>
            <div className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
              SYSTEMÖVERVAKNING
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {kritiska > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold"
              style={{
                background: "hsl(353 74% 47% / 0.10)",
                color: "hsl(353 74% 42%)",
                border: "1px solid hsl(353 74% 47% / 0.3)",
              }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(353 74% 47%)" }} />
              {kritiska} KRITISK
            </span>
          )}
          {varningar > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full"
              style={{
                background: "hsl(42 64% 53% / 0.10)",
                color: "hsl(42 64% 38%)",
                border: "1px solid hsl(42 64% 53% / 0.3)",
              }}>
              {varningar} VARNING
            </span>
          )}
          {kritiska === 0 && varningar === 0 && (
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full"
              style={{
                background: "hsl(152 60% 32% / 0.10)",
                color: "hsl(152 60% 32%)",
                border: "1px solid hsl(152 60% 32% / 0.3)",
              }}>
              ✓ NOMINELLT
            </span>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="p-3 space-y-1.5 overflow-y-auto flex-1 max-h-[280px]">
        <AnimatePresence>
          {sorted.map((event, i) => {
            const cfg = eventConfig[event.type];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-0 rounded-lg overflow-hidden"
                style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
              >
                {/* Color strip */}
                <div className="w-1 self-stretch shrink-0" style={{ background: cfg.stripColor }} />
                <div className="flex items-start gap-2.5 px-3 py-2 flex-1 min-w-0">
                  <span className="mt-0.5 shrink-0" style={{ color: cfg.text }}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-px rounded"
                        style={{ background: `${cfg.dot}20`, color: cfg.text }}>
                        {cfg.label}
                      </span>
                      {event.base && (
                        <span className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
                          {event.base}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] leading-snug" style={{ color: "hsl(220 63% 18%)" }}>
                      {event.message}
                    </div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: "hsl(218 15% 60%)" }}>
                      {event.timestamp}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <BadgeCheck className="h-8 w-8" style={{ color: "hsl(152 60% 40%)" }} />
            <div className="text-[10px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
              INGA HÄNDELSER REGISTRERADE
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
