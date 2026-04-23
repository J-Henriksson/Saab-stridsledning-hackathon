import type { GameState, TurnPhase } from "@/types/game";
import { isMissionCapable, isInMaintenance } from "@/types/game";
import { AlertTriangle, CheckCircle, Fuel, Package, Users, Wrench, Zap } from "lucide-react";

interface PhasePanelProps {
  state: GameState;
}

export function PhasePanel({ state }: PhasePanelProps) {
  switch (state.turnPhase) {
    case "ReviewResources":
      return <ResourceReview state={state} />;
    case "AllocateAircraft":
      return <AllocationSummary state={state} />;
    case "ExecutePreparation":
      return <ExecutionSummary state={state} />;
    case "ReportOutcome":
      return <OutcomeReport state={state} />;
    default:
      return null;
  }
}

function ResourceReview({ state }: { state: GameState }) {
  const warnings: { icon: React.ReactNode; message: string; severity: "critical" | "warning" | "ok" }[] = [];

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

function AllocationSummary({ state }: { state: GameState }) {
  const pendingOrders = state.atoOrders.filter((o) => o.status === "pending");

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono font-bold" style={{ color: "hsl(218 15% 45%)" }}>
        {pendingOrders.length} VÄNTANDE ORDER ATT TILLDELA
      </div>
      {pendingOrders.map((order) => {
        const base = state.bases.find((b) => b.id === order.launchBase);
        const available = base?.aircraft.filter(
          (ac) => isMissionCapable(ac.status) && (!order.aircraftType || ac.type === order.aircraftType)
        ).length ?? 0;
        const ok = available >= order.requiredCount;

        return (
          <div
            key={order.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-mono"
            style={{
              background: ok ? "hsl(152 60% 32% / 0.06)" : "hsl(353 74% 47% / 0.06)",
              border: `1px solid ${ok ? "hsl(152 60% 32% / 0.2)" : "hsl(353 74% 47% / 0.2)"}`,
            }}
          >
            <span className="font-bold" style={{ color: "hsl(220 63% 18%)" }}>
              {order.missionType} — {order.label}
            </span>
            <span style={{ color: ok ? "hsl(152 60% 32%)" : "hsl(353 74% 42%)" }}>
              {available}/{order.requiredCount} MC
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ExecutionSummary({ state }: { state: GameState }) {
  const recentEvents = state.events.filter((e) => e.type === "warning" || e.type === "critical").slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-mono font-bold" style={{ color: "hsl(218 15% 45%)" }}>
        <Zap className="h-3.5 w-3.5" />
        KLARGÖRINGSRESULTAT
      </div>
      {recentEvents.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(152 60% 32% / 0.08)", border: "1px solid hsl(152 60% 32% / 0.2)" }}>
          <CheckCircle className="h-4 w-4" style={{ color: "hsl(152 60% 38%)" }} />
          <span className="text-[11px] font-mono" style={{ color: "hsl(152 60% 28%)" }}>Inga avvikelser</span>
        </div>
      ) : (
        recentEvents.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono"
            style={{
              background: e.type === "critical" ? "hsl(353 74% 47% / 0.08)" : "hsl(42 64% 53% / 0.08)",
              border: `1px solid ${e.type === "critical" ? "hsl(353 74% 47% / 0.2)" : "hsl(42 64% 53% / 0.2)"}`,
              color: e.type === "critical" ? "hsl(353 74% 40%)" : "hsl(42 64% 36%)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{e.message}</span>
          </div>
        ))
      )}
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
