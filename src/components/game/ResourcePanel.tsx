import { Base } from "@/types/game";
import { motion } from "framer-motion";

export function ResourcePanel({ bases }: { bases: Base[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="font-sans font-bold text-sm text-foreground">RESERVDELAR & AMMUNITION</h3>
      </div>
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {bases.map((base) => (
          <div key={base.id}>
            <h4 className="text-xs font-mono text-muted-foreground mb-2">{base.id}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {base.spareParts.map((part) => {
                const pct = (part.quantity / part.maxQuantity) * 100;
                return (
                  <div key={part.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground truncate flex-1">{part.name}</span>
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct < 30 ? "bg-status-red" : pct < 60 ? "bg-status-amber" : "bg-status-green"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`font-mono w-8 text-right ${pct < 30 ? "text-status-red" : "text-foreground"}`}>
                      {part.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {base.ammunition.map((ammo) => {
                const pct = (ammo.quantity / ammo.max) * 100;
                return (
                  <div key={ammo.type} className="flex items-center gap-2">
                    <span className="text-status-amber truncate flex-1">{ammo.type}</span>
                    <span className="font-mono">{ammo.quantity}/{ammo.max}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
