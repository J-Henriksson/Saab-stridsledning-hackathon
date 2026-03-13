import { Base } from "@/types/game";
import { motion } from "framer-motion";
import { Fuel, Zap, Package, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface ResourceDetailProps {
  base: Base;
  phase: string;
}

export function ResourceDetail({ base, phase }: ResourceDetailProps) {
  const fuelRate = phase === "KRIG" ? 3 : phase === "KRIS" ? 1.5 : 0.5;
  const fuelHoursLeft = base.fuel > 0 ? Math.floor(base.fuel / fuelRate) : 0;

  return (
    <div className="space-y-4">
      {/* Fuel */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-status-amber" />
            <h3 className="font-sans font-bold text-sm text-foreground">DRIVMEDEL</h3>
          </div>
          <span className={`text-lg font-mono font-bold ${base.fuel < 30 ? "text-status-red" : base.fuel < 60 ? "text-status-amber" : "text-status-green"}`}>
            {base.fuel.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
          <motion.div
            className={`h-full rounded-full ${base.fuel < 30 ? "bg-status-red" : base.fuel < 60 ? "bg-status-amber" : "bg-status-green"}`}
            animate={{ width: `${base.fuel}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>Förbrukning: {fuelRate}%/h ({phase})</span>
          <span className={fuelHoursLeft < 10 ? "text-status-red" : ""}>~{fuelHoursLeft}h kvar</span>
        </div>
      </div>

      {/* Spare parts */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-sans font-bold text-sm text-foreground">RESERVDELAR (UE)</h3>
        </div>
        <div className="space-y-2.5">
          {base.spareParts.map((part) => {
            const pct = (part.quantity / part.maxQuantity) * 100;
            const critical = pct < 30;
            const low = pct < 60;
            return (
              <div key={part.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground">{part.name}</span>
                    <span className="text-[10px] text-muted-foreground">({part.category})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {part.onOrder > 0 && (
                      <span className="text-[10px] text-status-blue">+{part.onOrder} beställd</span>
                    )}
                    <span className={`text-xs font-mono font-bold ${critical ? "text-status-red" : low ? "text-status-amber" : "text-foreground"}`}>
                      {part.quantity}/{part.maxQuantity}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${critical ? "bg-status-red" : low ? "bg-status-amber" : "bg-status-green"}`}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  Påfyllningstid: {part.resupplyDays} dagar
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ammunition */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-status-red" />
          <h3 className="font-sans font-bold text-sm text-foreground">AMMUNITION & PAYLOAD</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {base.ammunition.map((ammo) => {
            const pct = (ammo.quantity / ammo.max) * 100;
            const critical = pct < 30;
            return (
              <div key={ammo.type} className={`p-3 rounded border ${critical ? "border-status-red/40 bg-status-red/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{ammo.type}</span>
                  {critical ? <TrendingDown className="h-3 w-3 text-status-red" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="text-2xl font-mono font-bold text-foreground">{ammo.quantity}</div>
                <div className="text-[10px] text-muted-foreground">av {ammo.max} max</div>
                <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full ${critical ? "bg-status-red" : "bg-status-green"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
