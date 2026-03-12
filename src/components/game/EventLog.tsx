import { GameEvent } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, AlertOctagon } from "lucide-react";

const icons = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
  success: CheckCircle,
};

const colors = {
  info: "text-status-blue",
  warning: "text-status-amber",
  critical: "text-status-red",
  success: "text-status-green",
};

export function EventLog({ events }: { events: GameEvent[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="font-sans font-bold text-sm text-foreground">HÄNDELSELOGG</h3>
      </div>
      <div className="max-h-60 overflow-y-auto">
        <AnimatePresence>
          {events.map((event) => {
            const Icon = icons[event.type];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-2 border-b border-border/50 flex items-start gap-2 text-xs"
              >
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colors[event.type]}`} />
                <span className="text-muted-foreground shrink-0">{event.timestamp}</span>
                <span className="text-foreground">{event.message}</span>
                {event.base && <span className="text-muted-foreground ml-auto">[{event.base}]</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
