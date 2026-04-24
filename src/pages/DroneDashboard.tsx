import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio, RotateCcw } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { isDrone } from "@/types/units";
import type { DroneUnit } from "@/types/units";
import { TopBar } from "@/components/game/TopBar";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ready:             { label: "Klar",          color: "#22c55e" },
  allocated:         { label: "Tilldelad",     color: "#60a5fa" },
  in_preparation:    { label: "Klargöring",    color: "#eab308" },
  awaiting_launch:   { label: "Väntar start",  color: "#22d3ee" },
  on_mission:        { label: "På uppdrag",    color: "#60a5fa" },
  returning:         { label: "Återvänder",    color: "#a78bfa" },
  recovering:        { label: "Mottagning",    color: "#fb923c" },
  under_maintenance: { label: "Underhåll",     color: "#eab308" },
  unavailable:       { label: "Ej operativ",   color: "#ef4444" },
};

export default function DroneDashboard() {
  const { state, togglePause, setGameSpeed, resetGame, recallDrone } = useGame();

  const allDrones = useMemo(
    () => [
      ...state.bases.flatMap((b) => b.units.filter(isDrone)) as DroneUnit[],
      ...state.deployedUnits.filter(isDrone) as DroneUnit[],
    ],
    [state.bases, state.deployedUnits],
  );

  const counts = useMemo(() => ({
    airborne: allDrones.filter((d) => d.status === "on_mission" || d.status === "returning").length,
    ready:    allDrones.filter((d) => d.status === "ready").length,
    maint:    allDrones.filter((d) => d.status === "under_maintenance" || d.status === "unavailable").length,
    hostile:  allDrones.filter((d) => d.affiliation === "hostile").length,
  }), [allDrones]);

  const friendlyDrones = allDrones.filter((d) => d.affiliation !== "hostile");
  const hostileDrones  = allDrones.filter((d) => d.affiliation === "hostile");

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onTogglePause={togglePause} onSetSpeed={setGameSpeed} onReset={resetGame} />

      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard/MOB" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Radio className="h-4 w-4 text-purple-400" />
        <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">DRÖNARDASHBOARD — UAV FLEET</h2>
        <span className="text-[10px] font-mono text-muted-foreground ml-2">
          Dag {state.day} · {String(state.hour).padStart(2, "0")}:00
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Luftburna", count: counts.airborne, color: "#60a5fa" },
            { label: "Klar",      count: counts.ready,    color: "#22c55e" },
            { label: "Underhåll", count: counts.maint,    color: "#eab308" },
            { label: "Fientliga", count: counts.hostile,  color: "#ef4444" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="text-2xl font-bold font-mono" style={{ color }}>{count}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Friendly drones table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-400" />
            <span className="text-xs font-bold font-mono text-foreground">EGNA DRÖNARE</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{friendlyDrones.length} totalt</span>
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["Callsign", "Status", "Bas", "Bränsle", "Uthållighet", "Åtgärd"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {friendlyDrones.map((drone) => {
                const s = STATUS_LABELS[drone.status] ?? STATUS_LABELS.unavailable;
                const fuelColor = drone.fuel < 25 ? "#ef4444" : drone.fuel < 50 ? "#eab308" : "#22c55e";
                const canRecall = drone.status === "on_mission";
                return (
                  <tr key={drone.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-foreground">{drone.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: s.color, background: `${s.color}18` }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{drone.currentBase ?? drone.lastBase ?? "–"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div style={{ width: `${drone.fuel}%`, background: fuelColor, height: "100%" }} />
                        </div>
                        <span style={{ color: fuelColor }}>{Math.round(drone.fuel)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{drone.enduranceHours}h</td>
                    <td className="px-4 py-2.5">
                      {canRecall && (
                        <button
                          onClick={() => recallDrone(drone.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-amber-500/40 text-amber-400 text-[10px] hover:bg-amber-400/10 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" /> RTB
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {friendlyDrones.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-[10px]">Inga egna drönare</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Hostile drones table */}
        {hostileDrones.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-400" />
              <span className="text-xs font-bold font-mono text-red-400">FIENTLIGA DRÖNARE</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{hostileDrones.length} detekterade</span>
            </div>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-red-500/20 bg-red-500/5">
                  {["Designation", "Status", "Position", "Kurs"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] text-red-300/60 uppercase tracking-wider font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hostileDrones.map((drone) => (
                  <tr key={drone.id} className="border-b border-red-500/10 hover:bg-red-500/5 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-red-300">{drone.name}</td>
                    <td className="px-4 py-2.5 text-red-400/80">Luftburen</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {drone.position.lat.toFixed(2)}°N {drone.position.lng.toFixed(2)}°E
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {drone.movement.heading != null ? `${Math.round(drone.movement.heading)}°` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
