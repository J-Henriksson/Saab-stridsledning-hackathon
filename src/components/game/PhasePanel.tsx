import type { ReactNode } from "react";
import type { GameState } from "@/types/game";
import { isMissionCapable, isInMaintenance } from "@/types/game";
import { CheckCircle, Fuel, Package, Users } from "lucide-react";

interface PhasePanelProps {
  state: GameState;
}

export function PhasePanel({ state }: PhasePanelProps) {
  return (
    <div className="space-y-2">
      <ResourceReview state={state} />
      <OutcomeReport state={state} />
    </div>
  );
}

function ResourceReview({ state }: { state: GameState }) {
  const warnings: { icon: ReactNode; message: string; severity: "critical" | "warning" | "ok" }[] = [];

  for (const base of state.bases) {
    if (base.fuel < 20) {
      warnings.push({ icon: <Fuel className="h-3.5 w-3.5" />, message: `${base.id}: Bränsle ${base.fuel.toFixed(0)}%`, severity: "critical" });
    } else if (base.fuel < 40) {
      warnings.push({ icon: <Fuel className="h-3.5 w-3.5" />, message: `${base.id}: Bränsle ${base.fuel.toFixed(0)}%`, severity: "warning" });
    }

    for (const part of base.spareParts) {
      if (part.quantity === 0) {
        warnings.push({ icon: <Package className="h-3.5 w-3.5" />, message: `${base.id}: SLUT PÅ ${part.name}`, severity: "critical" });
      } else if (part.quantity / part.maxQuantity < 0.3) {
        warnings.push({ icon: <Package className="h-3.5 w-3.5" />, message: `${base.id}: Låg ${part.name} (${part.quantity}/${part.maxQuantity})`, severity: "warning" });
      }
    }

    const totalPers = base.personnel.reduce((s, p) => s + p.total, 0);
    const availPers = base.personnel.reduce((s, p) => s + p.available, 0);
    if (availPers / totalPers < 0.5) {
      warnings.push({ icon: <Users className="h-3.5 w-3.5" />, message: `${base.id}: Personal ${availPers}/${totalPers}`, severity: "warning" });
    }
  }

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(152 60% 32% / 0.08)", border: "1px solid hsl(152 60% 32% / 0.2)" }}>
        <CheckCircle className="h-4 w-4" style={{ color: "hsl(152 60% 38%)" }} />
        <span className="text-[11px] font-mono font-bold" style={{ color: "hsl(152 60% 28%)" }}>Alla resurser nominella</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono font-bold"
          style={{
            background: w.severity === "critical" ? "hsl(353 74% 47% / 0.08)" : "hsl(42 64% 53% / 0.08)",
            border: `1px solid ${w.severity === "critical" ? "hsl(353 74% 47% / 0.2)" : "hsl(42 64% 53% / 0.2)"}`,
            color: w.severity === "critical" ? "hsl(353 74% 40%)" : "hsl(42 64% 36%)",
          }}
        >
          {w.icon}
          {w.message}
        </div>
      ))}
    </div>
  );
}

function OutcomeReport({ state }: { state: GameState }) {
  const totalAc = state.bases.reduce((s, b) => s + b.aircraft.length, 0);
  const mc = state.bases.reduce((s, b) => s + b.aircraft.filter((a) => isMissionCapable(a.status)).length, 0);
  const onMission = state.bases.reduce((s, b) => s + b.aircraft.filter((a) => a.status === "on_mission").length, 0);
  const inMaint = state.bases.reduce((s, b) => s + b.aircraft.filter((a) => isInMaintenance(a.status)).length, 0);

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "MC", value: mc, color: "hsl(152 60% 32%)" },
        { label: "På uppdrag", value: onMission, color: "hsl(220 63% 38%)" },
        { label: "UH/NMC", value: inMaint, color: "hsl(42 64% 53%)" },
        { label: "Lyckade", value: state.successfulMissions, color: "hsl(152 60% 38%)" },
      ].map((item) => (
        <div
          key={item.label}
          className="text-center p-2 rounded-lg"
          style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}
        >
          <div className="text-lg font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
          <div className="text-[9px] font-mono" style={{ color: `${item.color}cc` }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}
