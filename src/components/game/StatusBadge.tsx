import { AircraftStatus, ScenarioPhase } from "@/types/game";

const statusConfig: Record<AircraftStatus, { label: string; className: string }> = {
  mission_capable: { label: "MC", className: "bg-status-green/20 text-status-green border-status-green" },
  not_mission_capable: { label: "NMC", className: "bg-status-red/20 text-status-red border-status-red" },
  on_mission: { label: "UPPDRAG", className: "bg-status-blue/20 text-status-blue border-status-blue" },
  maintenance: { label: "UH", className: "bg-status-amber/20 text-status-amber border-status-amber" },
};

const phaseConfig: Record<ScenarioPhase, { label: string; className: string }> = {
  FRED: { label: "FRED", className: "bg-status-green/20 text-status-green border-status-green" },
  KRIS: { label: "KRIS", className: "bg-status-amber/20 text-status-amber border-status-amber" },
  KRIG: { label: "KRIG", className: "bg-status-red/20 text-status-red border-status-red" },
};

export function AircraftStatusBadge({ status }: { status: AircraftStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-mono border rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: ScenarioPhase }) {
  const config = phaseConfig[phase];
  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm font-mono font-bold border rounded ${config.className} animate-pulse-green`}>
      {config.label}
    </span>
  );
}
