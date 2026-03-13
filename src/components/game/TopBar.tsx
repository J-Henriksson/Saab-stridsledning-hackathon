import { GameState } from "@/types/game";
import { PhaseBadge } from "./StatusBadge";
import { Clock, RotateCcw, Send, LayoutDashboard, Map } from "lucide-react";
import { NavLink } from "react-router-dom";

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
      <div className="flex items-center gap-4">
        {/* ROAD2AIR × SAAB brand mark */}
        <div className="flex items-center gap-2.5">
          {/* Gripen silhouette SVG logo */}
          <svg width="32" height="22" viewBox="-18 -14 36 28" className="shrink-0">
            <path d="M -15,0 L -12,-2.5 L 10,-1 L 14,0 L 10,1 L -12,2.5 Z" fill="hsl(var(--primary))" />
            <polygon points="2,-2 -8,-13 -12,-3 -3,-2" fill="hsl(var(--primary))" opacity="0.88" />
            <polygon points="2,2 -8,13 -12,3 -3,2" fill="hsl(var(--primary))" opacity="0.88" />
            <polygon points="-8,-2 -10,-7 -5,-6 -5,-2" fill="hsl(var(--primary))" opacity="0.82" />
            <polygon points="-8,2 -10,7 -5,6 -5,2" fill="hsl(var(--primary))" opacity="0.82" />
            <rect x="11" y="-2.5" width="4" height="5" rx="2" fill="hsl(var(--primary))" opacity="0.7" />
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-black font-mono tracking-widest text-primary">ROAD2AIR</span>
            <span className="text-[8px] font-mono text-muted-foreground tracking-widest">× SAAB SMART AIRBASE</span>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`
            }
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            DASHBOARD
          </NavLink>
          <NavLink
            to="/ato"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`
            }
          >
            <Send className="h-3.5 w-3.5" />
            ATO
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`
            }
          >
            <Map className="h-3.5 w-3.5" />
            KARTA
          </NavLink>
        </nav>
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
          <span className="text-primary font-bold">{mcAircraft}</span>/{totalAircraft} MC
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
