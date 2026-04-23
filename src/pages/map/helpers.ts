import { Base } from "@/types/game";

export type SelectedEntity =
  | { kind: "base"; baseId: string }
  | { kind: "aircraft"; baseId: string; aircraftId: string }
  | null;

export function statusColor(base: Base | undefined) {
  if (!base) return "#4a5568";
  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const ratio = mc / base.aircraft.length;
  if (ratio >= 0.7) return "#22c55e";
  if (ratio >= 0.4) return "#eab308";
  return "#ef4444";
}

export function fuelColor(pct: number) {
  if (pct >= 60) return "#22c55e";
  if (pct >= 30) return "#eab308";
  return "#ef4444";
}

export function getReadiness(base: Base) {
  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const total = base.aircraft.length;
  const ratio = mc / total;
  if (ratio >= 0.7) return { label: "GRÖN", cls: "text-status-green bg-status-green/10 border-status-green/40" };
  if (ratio >= 0.4) return { label: "GULT", cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" };
  return { label: "RÖTT", cls: "text-status-red bg-status-red/10 border-status-red/40" };
}
