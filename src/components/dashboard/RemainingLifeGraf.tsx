import { Base } from "@/types/game";
import { motion } from "framer-motion";

interface RemainingLifeGrafProps {
  base: Base;
}

export function RemainingLifeGraf({ base }: RemainingLifeGrafProps) {
  const sorted = [...base.aircraft].sort((a, b) => a.hoursToService - b.hoursToService);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[100px_1fr_60px] gap-2 text-[9px] font-mono text-muted-foreground mb-1">
        <span>FLYGPLAN</span>
        <span>REMAINING LIFE</span>
        <span className="text-right">TIMMAR</span>
      </div>
      {sorted.map((ac, i) => {
        const pct = Math.min(100, (ac.hoursToService / 100) * 100);
        const isCritical = ac.hoursToService < 20;
        const isLow = ac.hoursToService < 40;

        return (
          <motion.div
            key={ac.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="grid grid-cols-[100px_1fr_60px] gap-2 items-center"
          >
            <div className="text-[10px] font-mono text-foreground truncate">
              {ac.tailNumber}
              <span className="text-muted-foreground ml-1 text-[8px]">{ac.type === "GripenE" ? "E" : ac.type === "GripenF_EA" ? "F" : ac.type === "GlobalEye" ? "GE" : ac.type === "VLO_UCAV" ? "UC" : "LO"}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isCritical ? "bg-status-red" : isLow ? "bg-status-amber" : "bg-status-green"}`}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
              />
            </div>
            <div className={`text-[10px] font-mono font-bold text-right ${isCritical ? "text-status-red" : isLow ? "text-status-amber" : "text-foreground"}`}>
              {ac.hoursToService}h
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
