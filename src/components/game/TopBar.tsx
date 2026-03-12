import { GameState } from "@/types/game";
import { PhaseBadge } from "./StatusBadge";
import { Plane, Clock, RotateCcw } from "lucide-react";

interface TopBarProps {
  state: GameState;
  onAdvanceTurn: () => void;
  onReset: () => void;
}

export function TopBar({ state, onAdvanceTurn, onReset }: TopBarProps) {
  const totalAircraft = state.bases.reduce((s, b) => s + b.aircraft.length, 0);
  const mcAircraft = state.bases.reduce((s, b) => s + b.aircraft.filter((a) => a.status === "mission_capable").length, 0);

  return (
    <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Plane className="h-6 w-6 text-primary" />
        <h1 className="font-sans text-lg font-bold text-foreground tracking-wide">SMART AIRBASE</h1>
        <span className="text-xs text-muted-foreground">LOGISTIK</span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-mono">
            DAG {state.day} / {String(state.hour).padStart(2, "0")}:00
          </span>
        </div>
        <PhaseBadge phase={state.phase} />
        <div className="text-muted-foreground">
          <span className="text-status-green">{mcAircraft}</span>/{totalAircraft} MC
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onAdvanceTurn}
          className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-mono rounded hover:opacity-90 transition-opacity"
        >
          NÄSTA VARV →
        </button>
        <button
          onClick={onReset}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Starta om"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
