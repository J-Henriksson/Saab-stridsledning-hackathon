import { Base } from "@/types/game";
import { motion } from "framer-motion";
import { Fuel, Package, Users, Zap, Wrench as WrenchIcon, Cog } from "lucide-react";

interface ResourceSidebarProps {
  base: Base;
  phase: string;
}

function ResourceBar({ label, value, max, unit, critical }: { label: string; value: number; max: number; unit?: string; critical?: boolean }) {
  const pct = (value / max) * 100;
  const isCritical = critical ?? pct < 30;
  const isLow = pct < 60;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${isCritical ? "text-status-red" : isLow ? "text-status-amber" : "text-foreground"}`}>
          {value}{unit || ""}/{max}
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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  );
}

export function ResourceSidebar({ base, phase }: ResourceSidebarProps) {
  const fuelRate = phase === "KRIG" ? 3 : phase === "KRIS" ? 1.5 : 0.5;
  const fuelHours = base.fuel > 0 ? Math.floor(base.fuel / fuelRate) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-1 overflow-y-auto">
      <h3 className="font-sans font-bold text-sm text-foreground mb-3">RESURSER</h3>

      {/* Fuel */}
      <SectionHeader icon={<Fuel className="h-3.5 w-3.5 text-status-amber" />} title="Bränsle" />
      <ResourceBar label="Drivmedel" value={Math.round(base.fuel)} max={base.maxFuel} unit="%" />
      <div className="text-[9px] text-muted-foreground font-mono">
        {fuelRate}%/h • ~{fuelHours}h kvar
      </div>

      {/* Spare Parts / UE */}
      <SectionHeader icon={<Package className="h-3.5 w-3.5 text-muted-foreground" />} title="Utbytes­enheter (UE)" />
      <div className="space-y-2">
        {base.spareParts.map((part) => (
          <ResourceBar key={part.id} label={part.name} value={part.quantity} max={part.maxQuantity} />
        ))}
      </div>

      {/* Ammunition / Payload */}
      <SectionHeader icon={<Zap className="h-3.5 w-3.5 text-status-red" />} title="Vapen / Last" />
      <div className="space-y-2">
        {base.ammunition.map((ammo) => (
          <ResourceBar key={ammo.type} label={ammo.type} value={ammo.quantity} max={ammo.max} />
        ))}
      </div>

      {/* Personnel */}
      <SectionHeader icon={<Users className="h-3.5 w-3.5 text-primary" />} title="Personal" />
      <div className="space-y-2">
        {base.personnel.map((group) => (
          <div key={group.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-foreground">{group.role}</span>
                <span className={`text-[8px] px-1 py-px rounded ${group.onDuty ? "bg-status-green/20 text-status-green" : "bg-muted text-muted-foreground"}`}>
                  {group.onDuty ? "TJÄNST" : "VILA"}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-foreground">{group.available}/{group.total}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${group.available / group.total < 0.5 ? "bg-status-red" : "bg-primary"}`}
                style={{ width: `${(group.available / group.total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tools / Maintenance bays */}
      <SectionHeader icon={<Cog className="h-3.5 w-3.5 text-muted-foreground" />} title="Verktyg & UH-platser" />
      <ResourceBar
        label="UH-platser"
        value={base.maintenanceBays.total - base.maintenanceBays.occupied}
        max={base.maintenanceBays.total}
      />
      <div className="text-[9px] text-muted-foreground font-mono">
        {base.maintenanceBays.occupied} upptagna / {base.maintenanceBays.total} totalt
      </div>
    </div>
  );
}
