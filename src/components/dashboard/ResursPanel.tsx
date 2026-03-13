import { Base, ScenarioPhase } from "@/types/game";
import { Fuel, Package, Zap, Users, Wrench } from "lucide-react";
import { motion } from "framer-motion";

interface ResPanelProps {
  base: Base;
  phase: ScenarioPhase;
}

function Bar({ label, value, max, warning }: { label: string; value: number; max: number; warning?: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const isCritical = pct < 25;
  const isLow = pct < 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-foreground">{label}</span>
        <span className={`font-mono font-bold ${isCritical ? "text-status-red" : isLow ? "text-status-amber" : "text-foreground"}`}>
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isCritical ? "bg-status-red" : isLow ? "bg-status-amber" : "bg-status-green"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

export function ResursPanel({ base, phase }: ResPanelProps) {
  const fuelRate = phase === "KRIG" ? 3 : phase === "KRIS" ? 1.5 : 0.5;
  const fuelHours = base.fuel > 0 ? Math.floor(base.fuel / fuelRate) : 0;
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);
  const totalPersonnelMax = base.personnel.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-4">
      {/* Fuel */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Fuel className="h-3.5 w-3.5 text-status-amber" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bränsle</span>
        </div>
        <Bar label="Drivmedel" value={Math.round(base.fuel)} max={base.maxFuel} />
        <div className="text-[9px] text-muted-foreground font-mono mt-1">
          {fuelRate}%/h · ~{fuelHours}h kvar
        </div>
      </div>

      {/* Spare parts */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reservdelar (UE)</span>
        </div>
        <div className="space-y-2">
          {base.spareParts.map((part) => (
            <Bar key={part.id} label={part.name} value={part.quantity} max={part.maxQuantity} />
          ))}
        </div>
      </div>

      {/* Ammo */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-3.5 w-3.5 text-status-red" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vapen / Last</span>
        </div>
        <div className="space-y-2">
          {base.ammunition.map((ammo) => (
            <Bar key={ammo.type} label={ammo.type} value={ammo.quantity} max={ammo.max} />
          ))}
        </div>
      </div>

      {/* Personnel summary */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Personal</span>
        </div>
        <Bar label="Tillgänglig personal" value={totalPersonnel} max={totalPersonnelMax} />
        <div className="mt-2 space-y-1">
          {base.personnel.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{p.role}</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${p.available / p.total < 0.5 ? "text-status-red" : "text-foreground"}`}>
                  {p.available}/{p.total}
                </span>
                <span className={`text-[8px] px-1 py-px rounded ${p.onDuty ? "bg-status-green/20 text-status-green" : "bg-muted text-muted-foreground"}`}>
                  {p.onDuty ? "TJÄNST" : "VILA"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance bays */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">UH-platser</span>
        </div>
        <Bar
          label="Lediga platser"
          value={base.maintenanceBays.total - base.maintenanceBays.occupied}
          max={base.maintenanceBays.total}
        />
        <div className="text-[9px] text-muted-foreground font-mono mt-1">
          {base.maintenanceBays.occupied} upptagna / {base.maintenanceBays.total} totalt
        </div>
      </div>
    </div>
  );
}
