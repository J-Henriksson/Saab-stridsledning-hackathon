import { useMemo } from "react";
import { GameState } from "@/types/game";
import { getAircraft } from "@/core/units/helpers";
import { PhaseBadge } from "./StatusBadge";
import { Pause, Play, RotateCcw, LayoutDashboard, Map } from "lucide-react";
import { NavLink } from "react-router-dom";
import gripenSilhouette from "@/assets/gripen-silhouette.png";

const WEEKDAYS = ["SÖN", "MÅN", "TIS", "ONS", "TOR", "FRE", "LÖR"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const SPEEDS = [
  { label: "▶", value: 1 },
  { label: "▶▶", value: 60 },
  { label: "▶▶▶", value: 360 },
  { label: "▶▶▶▶", value: 3600 },
];


interface TopBarProps {
  state: GameState;
  onTogglePause: () => void;
  onSetSpeed: (speed: number) => void;
  onReset: () => void;
}

export function TopBar({ state, onTogglePause, onSetSpeed, onReset }: TopBarProps) {
  const hh = String(state.hour).padStart(2, "0");
  const mm = String(state.minute).padStart(2, "0");
  const ss = String(state.second).padStart(2, "0");
  const today = useMemo(() => new Date(), []);
  const dateStr = `${WEEKDAYS[today.getDay()]} ${today.getDate()} ${MONTHS[today.getMonth()]}`;

  const totalAircraft = state.bases.reduce((s, b) => s + getAircraft(b).length, 0);
  const mcAircraft = state.bases.reduce((s, b) => s + getAircraft(b).filter((a) => a.status === "ready").length, 0);
  const mcPct = totalAircraft > 0 ? Math.round((mcAircraft / totalAircraft) * 100) : 0;

  return (
    <header
      className="flex items-center justify-between gap-4 px-5 py-0"
      style={{
        background: "var(--gradient-navy)",
        borderBottom: "2px solid hsl(42 64% 53% / 0.6)",
        boxShadow: "0 2px 16px hsl(220 63% 10% / 0.25)",
        minHeight: "52px",
      }}
    >
      {/* Brand + Nav */}
      <div className="flex items-center gap-5">
        <NavLink to="/" className="flex items-center gap-3" title="Basöversikt">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden"
            style={{ background: "hsl(42 64% 53% / 0.15)", border: "1px solid hsl(42 64% 53% / 0.4)" }}>
            <img
              src={gripenSilhouette}
              alt="Gripen"
              className="h-6 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(3deg) brightness(1.1)" }}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-black font-sans tracking-widest"
              style={{ color: "hsl(42 64% 62%)", letterSpacing: "0.18em" }}>
              ROAD2AIR
            </span>
            <span className="text-[8px] font-mono tracking-widest"
              style={{ color: "hsl(200 12% 72%)" }}>
              SAAB SMART AIRBASE SIM
            </span>
          </div>
        </NavLink>

        <nav className="flex items-center gap-0.5 ml-2">
          {[
            { to: "/", icon: <LayoutDashboard className="h-3.5 w-3.5" />, label: "DASHBOARD" },
            { to: "/map", icon: <Map className="h-3.5 w-3.5" />, label: "KARTA" },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-semibold rounded transition-all duration-150 tracking-wider ${
                  isActive ? "text-white" : "hover:text-white"
                }`
              }
              style={({ isActive }) => isActive
                ? { background: "hsl(42 64% 53% / 0.2)", color: "hsl(42 64% 62%)", borderBottom: "2px solid hsl(42 64% 53%)" }
                : { color: "hsl(200 12% 72%)" }
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Center: MC stats + phase */}
      <div className="flex items-center gap-6">
        <PhaseBadge phase={state.phase} />
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] font-mono" style={{ color: "hsl(200 12% 60%)" }}>MC-RATE</div>
            <div className="text-base font-black font-mono leading-none"
              style={{ color: mcPct >= 70 ? "hsl(152 60% 52%)" : mcPct >= 40 ? "hsl(42 64% 53%)" : "hsl(353 74% 60%)" }}>
              {mcPct}%
            </div>
          </div>
          <div className="w-px h-8 opacity-20" style={{ background: "hsl(200 12% 86%)" }} />
          <div className="text-right">
            <div className="text-[10px] font-mono" style={{ color: "hsl(200 12% 60%)" }}>FLYG MC</div>
            <div className="font-mono font-bold text-base leading-none text-white">
              {mcAircraft}<span className="text-[10px] opacity-50">/{totalAircraft}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Date + clock + speed + pause + reset */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <span className="font-mono text-sm font-semibold tracking-widest" style={{ color: "hsl(200 12% 70%)" }}>
          {dateStr}
        </span>

        {/* Time */}
        <div className="flex items-baseline gap-0.5 font-mono font-black tabular-nums" style={{ color: "hsl(42 64% 62%)" }}>
          <span className="text-3xl leading-none">{hh}:{mm}</span>
          <span className="text-lg leading-none opacity-60">:{ss}</span>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 ml-1">
          {SPEEDS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onSetSpeed(value)}
              className="px-2 py-1 text-[10px] font-mono font-bold rounded transition-all duration-100"
              style={state.gameSpeed === value
                ? { background: "hsl(42 64% 53% / 0.3)", color: "hsl(42 64% 70%)", border: "1px solid hsl(42 64% 53% / 0.6)" }
                : { background: "transparent", color: "hsl(200 12% 50%)", border: "1px solid hsl(200 12% 28%)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className="p-2 rounded-lg transition-all hover:bg-white/10 active:scale-95"
          title={state.isRunning ? "Pausa" : "Fortsätt"}
          style={{ color: state.isRunning ? "hsl(42 64% 62%)" : "hsl(152 60% 52%)" }}
        >
          {state.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2 rounded-lg transition-all hover:bg-white/10"
          title="Starta om"
          style={{ color: "hsl(200 12% 72%)" }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
