import type { Aircraft, Base } from "@/types/game";
import { Row } from "./StatBox";
import { Plane, RotateCcw, User } from "lucide-react";
import { PILOT_ROSTER } from "@/data/pilotRoster";
import { TacticalDashboard } from "./TacticalDashboard";

export function AircraftDetailPanel({
  aircraft,
  base,
  onBack,
  onRecall,
  currentHour,
}: {
  aircraft: Aircraft;
  base?: Base;
  onBack: () => void;
  onRecall?: () => void;
  currentHour?: number;
}) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    ready: { label: "Mission Capable", cls: "text-status-green bg-status-green/10 border-status-green/40" },
    allocated: { label: "Tilldelad", cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
    in_preparation: { label: "Klargoring", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" },
    awaiting_launch: { label: "Vantar start", cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/40" },
    on_mission: { label: "Pa uppdrag", cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
    returning: { label: "Retur", cls: "text-purple-400 bg-purple-400/10 border-purple-400/40" },
    recovering: { label: "Mottagning", cls: "text-orange-400 bg-orange-400/10 border-orange-400/40" },
    under_maintenance: { label: "Underhall pagar", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" },
    unavailable: { label: "Ej operativ (NMC)", cls: "text-status-red bg-status-red/10 border-status-red/40" },
  };
  const s = statusMap[aircraft.status] ?? statusMap.unavailable;

  const health = aircraft.health ?? 100;
  const healthColor = health < 30 ? "#ef4444" : health < 60 ? "#eab308" : "#22c55e";
  const canRecall = aircraft.status === "on_mission" && !!onRecall;
  const pilot = PILOT_ROSTER[aircraft.tailNumber];

  return (
    <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
      >
        Back to base
      </button>

      <TacticalDashboard aircraft={aircraft} base={base} />

      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold font-mono ${s.cls}`}>
        <Plane className="h-4 w-4" />
        {s.label}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
        {pilot ? (
          <div className="min-w-0">
            <div className="truncate text-xs font-bold font-mono text-foreground">{pilot.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              <span className="font-bold text-amber-400">"{pilot.callsign}"</span>
              {" · "}
              {pilot.rank}
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">Okand pilot</span>
        )}
      </div>

      {(() => {
        const remaining =
          aircraft.missionEndHour != null && currentHour != null
            ? Math.max(0, aircraft.missionEndHour - currentHour)
            : null;
        const hasMission = !!aircraft.currentMission;
        return (
          <div
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-mono ${
              hasMission
                ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">UPPDRAG:</span>
              <span className="font-bold tracking-wider">{aircraft.currentMission ?? "-"}</span>
            </div>
            {remaining != null && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: remaining <= 1 ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                  color: remaining <= 1 ? "#f87171" : "#93c5fd",
                  border: `1px solid ${remaining <= 1 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                }}
              >
                {remaining}h kvar
              </span>
            )}
          </div>
        );
      })()}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">KVARVARANDE LIVSLANGD</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: healthColor }}>
            {health}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${health}%`, backgroundColor: healthColor }} />
        </div>
      </div>

      <div className="space-y-2">
        <Row label="Typ" value={aircraft.type} />
        <Row label="Svans #" value={aircraft.tailNumber} />
        <Row label="Bas" value={aircraft.currentBase ?? "-"} />
        {aircraft.homeBaseId && (
          <Row label="Hor till bas" value={base?.name ?? aircraft.homeBaseId} />
        )}
        {aircraft.originBase && (
          <Row label="Origin" value={aircraft.originBase} />
        )}
        {aircraft.estimatedLandingTime && (
          <Row label="ETA landning" value={aircraft.estimatedLandingTime} />
        )}
        {aircraft.transponderCode && (
          <Row label="Transponder" value={aircraft.transponderCode} />
        )}
        {aircraft.weaponStatus && (
          <Row label="Vapenstatus" value={aircraft.weaponStatus} />
        )}
        <Row label="Flygtid" value={`${aircraft.flightHours} h`} />
        <Row label="Till service" value={`${aircraft.hoursToService} h kvar`} highlight={aircraft.hoursToService < 20} />
        {aircraft.payload && <Row label="Lastning" value={aircraft.payload} />}
        {aircraft.maintenanceType && (
          <Row label="Underhallstyp" value={aircraft.maintenanceType.replace(/_/g, " ")} />
        )}
        {aircraft.maintenanceTimeRemaining && (
          <Row label="Kvar i underhall" value={`${aircraft.maintenanceTimeRemaining} h`} highlight />
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Service-intervall</span>
          <span className="text-[10px] font-mono text-foreground">{aircraft.hoursToService}h kvar</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, aircraft.hoursToService) }%`,
              backgroundColor: aircraft.hoursToService < 20 ? "#ef4444" : aircraft.hoursToService < 40 ? "#eab308" : "#22c55e",
            }}
          />
        </div>
      </div>

      <div className="mt-auto pt-2">
        <button
          onClick={canRecall ? onRecall : undefined}
          disabled={!canRecall}
          className={`w-full rounded-lg border px-3 py-2.5 text-xs font-bold font-mono transition-colors ${
            canRecall
              ? "cursor-pointer border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "cursor-not-allowed border-border bg-muted/30 text-muted-foreground opacity-50"
          } flex items-center justify-center gap-2`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          ATERKALLA
        </button>
        {!canRecall && (
          <p className="mt-1 text-center text-[9px] font-mono text-muted-foreground">
            Recall is only available for stateful aircraft tied to the live engine.
          </p>
        )}
      </div>
    </div>
  );
}
