import { Base, ScenarioPhase } from "@/types/game";
import { Fuel, Package, Zap, Users, Wrench, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface ResPanelProps {
  base: Base;
  phase: ScenarioPhase;
}

function ResourceBar({
  label, value, max, unit = "",
}: { label: string; value: number; max: number; unit?: string; }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isCritical = pct < 25;
  const isLow = pct < 50;
  const barColor = isCritical
    ? "hsl(353 74% 47%)"
    : isLow
    ? "hsl(42 64% 53%)"
    : "hsl(152 60% 38%)";
  const textColor = isCritical
    ? "hsl(353 74% 42%)"
    : isLow
    ? "hsl(42 64% 38%)"
    : "hsl(220 63% 18%)";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px]">
        <span style={{ color: "hsl(218 15% 45%)" }}>{label}</span>
        <span className="font-mono font-bold" style={{ color: textColor }}>
          {value}{unit}/{max}{unit}
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden"
        style={{ background: "hsl(216 18% 90%)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ background: barColor }}
        />
        {/* Tick marks */}
        {[25, 50, 75].map((tick) => (
          <div key={tick} className="absolute inset-y-0 w-px opacity-30"
            style={{ left: `${tick}%`, background: "hsl(220 63% 18%)" }} />
        ))}
      </div>
    </div>
  );
}

function Section({
  icon, title, children, accent,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: "1px solid hsl(215 14% 86%)" }}>
      <div className="flex items-center gap-2 px-3 py-2"
        style={{
          background: "linear-gradient(90deg, hsl(220 63% 18% / 0.04), transparent)",
          borderBottom: "1px solid hsl(215 14% 88%)",
        }}>
        <span style={{ color: accent || "hsl(220 63% 38%)" }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest font-sans"
          style={{ color: "hsl(220 63% 26%)" }}>
          {title}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </div>
  );
}

export function ResursPanel({ base, phase }: ResPanelProps) {
  const fuelRate = phase === "KRIG" ? 3 : phase === "KRIS" ? 1.5 : 0.5;
  const fuelHours = base.fuel > 0 ? Math.floor(base.fuel / fuelRate) : 0;
  const fuelPct = Math.round((base.fuel / base.maxFuel) * 100);
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);
  const totalPersonnelMax = base.personnel.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-3">
      {/* Header label */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-widest font-sans"
          style={{ color: "hsl(220 63% 22%)" }}>
          RESURSSTATUS
        </span>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded"
          style={{ background: "hsl(220 63% 18% / 0.08)", color: "hsl(220 63% 38%)" }}>
          {base.name}
        </span>
      </div>

      {/* Fuel */}
      <Section icon={<Fuel className="h-3.5 w-3.5" />} title="Bränsle"
        accent="hsl(42 64% 48%)">
        <ResourceBar label="Drivmedel" value={Math.round(base.fuel)} max={base.maxFuel} unit="%" />
        <div className="flex items-center justify-between text-[9px] font-mono mt-0.5"
          style={{ color: "hsl(218 15% 55%)" }}>
          <span className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            {fuelRate}%/h förbrukning
          </span>
          <span className="font-bold" style={{ color: fuelPct < 30 ? "hsl(353 74% 47%)" : "hsl(152 60% 38%)" }}>
            ~{fuelHours}h kvar
          </span>
        </div>
      </Section>

      {/* Spare parts */}
      <Section icon={<Package className="h-3.5 w-3.5" />} title="Reservdelar (UE)"
        accent="hsl(220 63% 38%)">
        {base.spareParts.map((part) => (
          <ResourceBar key={part.id} label={part.name} value={part.quantity} max={part.maxQuantity} />
        ))}
      </Section>

      {/* Ammo */}
      <Section icon={<Zap className="h-3.5 w-3.5" />} title="Vapen / Last"
        accent="hsl(353 74% 47%)">
        {base.ammunition.map((ammo) => (
          <ResourceBar key={ammo.type} label={ammo.type} value={ammo.quantity} max={ammo.max} />
        ))}
      </Section>

      {/* Personnel */}
      <Section icon={<Users className="h-3.5 w-3.5" />} title="Personal"
        accent="hsl(220 63% 30%)">
        <ResourceBar label="Tillgänglig" value={totalPersonnel} max={totalPersonnelMax} />
        <div className="space-y-1 mt-1 pt-1" style={{ borderTop: "1px solid hsl(215 14% 90%)" }}>
          {base.personnel.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px]">
              <span style={{ color: "hsl(218 15% 45%)" }}>{p.role}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold"
                  style={{ color: p.available / p.total < 0.5 ? "hsl(353 74% 47%)" : "hsl(220 63% 22%)" }}>
                  {p.available}/{p.total}
                </span>
                <span className="text-[8px] px-1.5 py-px rounded-full font-mono"
                  style={{
                    background: p.onDuty ? "hsl(152 60% 32% / 0.12)" : "hsl(216 18% 90%)",
                    color: p.onDuty ? "hsl(152 60% 32%)" : "hsl(218 15% 55%)",
                    border: p.onDuty ? "1px solid hsl(152 60% 32% / 0.3)" : "1px solid hsl(215 14% 82%)",
                  }}>
                  {p.onDuty ? "TJÄNST" : "VILA"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Maintenance bays */}
      <Section icon={<Wrench className="h-3.5 w-3.5" />} title="UH-platser"
        accent="hsl(42 64% 48%)">
        <ResourceBar
          label="Lediga platser"
          value={base.maintenanceBays.total - base.maintenanceBays.occupied}
          max={base.maintenanceBays.total}
        />
        <div className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
          {base.maintenanceBays.occupied} upptagna · {base.maintenanceBays.total} totalt
        </div>
      </Section>
    </div>
  );
}
