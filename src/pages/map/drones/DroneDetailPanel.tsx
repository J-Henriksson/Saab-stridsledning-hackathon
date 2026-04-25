import { useState } from "react";
import { Radio, RotateCcw, Eye, Link, Plus, Trash2, Navigation } from "lucide-react";
import type { DroneUnit, DroneWaypoint } from "@/types/units";
import { Row } from "@/pages/map/StatBox";
import { uuid } from "@/core/uuid";
import { analyzeEnemyDrone } from "@/lib/enemyAnalysis";
import { ContextualRecommendation } from "@/components/game/ContextualRecommendation";
import { WarningList, BorderAlertPanel } from "@/components/game/EnemyAnalysisPanels";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ready:             { label: "Klar",         cls: "text-status-green bg-status-green/10 border-status-green/40" },
  allocated:         { label: "Tilldelad",    cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
  on_mission:        { label: "På uppdrag",   cls: "text-status-blue bg-status-blue/10 border-status-blue/40" },
  returning:         { label: "Återvänder",   cls: "text-purple-400 bg-purple-400/10 border-purple-400/40" },
  under_maintenance: { label: "Underhåll",    cls: "text-status-yellow bg-status-yellow/10 border-status-yellow/40" },
  unavailable:       { label: "Ej operativ",  cls: "text-status-red bg-status-red/10 border-status-red/40" },
};

interface DroneDetailPanelProps {
  drone: DroneUnit;
  onBack: () => void;
  onRecall: (droneId: string) => void;
  onUpdateWaypoints: (droneId: string, waypoints: DroneWaypoint[]) => void;
  onSetOverlay: (droneId: string, rangeRadiusVisible?: boolean, connectionLineVisible?: boolean) => void;
  onDeploy?: (droneId: string) => void;
  planningMode: boolean;
}

export function DroneDetailPanel({
  drone,
  onBack,
  onRecall,
  onUpdateWaypoints,
  onSetOverlay,
  onDeploy,
  planningMode,
}: DroneDetailPanelProps) {
  const [localWaypoints, setLocalWaypoints] = useState<DroneWaypoint[]>(drone.waypoints ?? []);

  const analysis = drone.affiliation === "hostile" ? analyzeEnemyDrone(drone) : null;

  const s = STATUS_MAP[drone.status] ?? STATUS_MAP.unavailable;
  const canRecall = drone.status === "on_mission" || drone.status === "returning";
  const fuelColor = drone.fuel < 25 ? "#ef4444" : drone.fuel < 50 ? "#eab308" : "#22c55e";
  const homeBase = drone.currentBase ?? drone.lastBase ?? "–";
  const activeWaypoint = drone.waypoints[drone.currentWaypointIdx];
  const remainingWaypoints = Math.max(drone.waypoints.length - drone.currentWaypointIdx, 0);

  function addWaypoint() {
    setLocalWaypoints((prev) => [
      ...prev,
      { id: uuid(), lat: drone.position?.lat ?? 60, lng: drone.position?.lng ?? 18 },
    ]);
  }

  function removeWaypoint(id: string) {
    setLocalWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  function updateWaypoint(id: string, field: "lat" | "lng", value: number) {
    setLocalWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w)),
    );
  }

  function commitWaypoints() {
    onUpdateWaypoints(drone.id, localWaypoints);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
      <button
        onClick={onBack}
        className="text-[10px] font-mono text-primary flex items-center gap-1 hover:underline"
      >
        ← Tillbaka
      </button>

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${s.cls}`}>
        <Radio className="h-4 w-4" />
        {s.label}
      </div>

      {/* Info rows */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
        <Row label="Callsign" value={drone.name} />
        <Row label="Typ" value={drone.type} />
        <Row label="Hemabas" value={homeBase} />
        <Row label="Basstatus" value={drone.currentBase ? `Kopplad till ${drone.currentBase}` : "Fristående"} />
        <Row label="Sensor ⌀" value={`${drone.sensorRangeKm} km`} />
        <Row label="Max räckvidd" value={`${drone.rangeKm} km`} />
        <Row label="Last" value={drone.payload?.trim() || "Ej angiven"} />
        <Row label="Uppdragsläge" value={s.label} />
        {drone.currentMission && <Row label="Uppdrag" value={drone.currentMission} />}
        <Row
          label="Waypoint"
          value={
            drone.waypoints.length > 0
              ? `${Math.min(drone.currentWaypointIdx + 1, drone.waypoints.length)} / ${drone.waypoints.length}`
              : "Inga waypoints"
          }
        />
        <Row label="Återstående ben" value={drone.waypoints.length > 0 ? `${remainingWaypoints}` : "0"} />
      </div>

      {/* Fuel bar */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Bränsle</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              style={{ width: `${drone.fuel}%`, background: fuelColor, height: "100%", transition: "width 0.3s" }}
            />
          </div>
          <span className="text-xs font-mono font-bold" style={{ color: fuelColor }}>
            {Math.round(drone.fuel)}%
          </span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          Uthållighet: {drone.enduranceHours} h
        </div>
        {activeWaypoint && (
          <div className="text-[10px] font-mono text-muted-foreground">
            Aktiv punkt: {activeWaypoint.lat.toFixed(3)} / {activeWaypoint.lng.toFixed(3)}
          </div>
        )}
      </div>

      {/* Overlay toggles */}
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Visning</div>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
          <input
            type="checkbox"
            checked={drone.rangeRadiusVisible}
            onChange={(e) => onSetOverlay(drone.id, e.target.checked, undefined)}
            className="accent-primary"
          />
          <Eye className="h-3 w-3" />
          Sensorradie
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
          <input
            type="checkbox"
            checked={drone.connectionLineVisible}
            onChange={(e) => onSetOverlay(drone.id, undefined, e.target.checked)}
            className="accent-primary"
          />
          <Link className="h-3 w-3" />
          Basanslutning
        </label>
      </div>

      {/* Deploy button — only when ready */}
      {drone.status === "ready" && onDeploy && (
        <button
          onClick={() => onDeploy(drone.id)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono
            border-purple-500/60 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
        >
          <Navigation className="h-3.5 w-3.5" />
          Deployer på karta — sätt ISR-position
        </button>
      )}

      {/* Recall button — only for friendly drones */}
      {drone.affiliation !== "hostile" && (
        <button
          onClick={() => onRecall(drone.id)}
          disabled={!canRecall}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:border-amber-500/60 enabled:text-amber-400 enabled:bg-amber-400/10
            enabled:hover:bg-amber-400/20 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          RTB – Återkalla till bas
        </button>
      )}

      {/* Waypoint editor (planning mode only) */}
      {planningMode && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-400/5 p-3 space-y-3">
          <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
            Waypoints — PLANERING
          </div>

          {localWaypoints.map((wp, idx) => (
            <div key={wp.id} className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground w-4">{idx + 1}.</span>
              <input
                type="number"
                step="0.01"
                value={wp.lat}
                onChange={(e) => updateWaypoint(wp.id, "lat", parseFloat(e.target.value))}
                className="w-20 text-[10px] font-mono bg-muted/30 border border-border rounded px-1 py-0.5"
                placeholder="Lat"
              />
              <input
                type="number"
                step="0.01"
                value={wp.lng}
                onChange={(e) => updateWaypoint(wp.id, "lng", parseFloat(e.target.value))}
                className="w-20 text-[10px] font-mono bg-muted/30 border border-border rounded px-1 py-0.5"
                placeholder="Lng"
              />
              <button
                onClick={() => removeWaypoint(wp.id)}
                className="text-red-400 hover:text-red-300 ml-1"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              onClick={addWaypoint}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-border text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Lägg till
            </button>
            <button
              onClick={commitWaypoints}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-amber-500/60 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
            >
              Bekräfta
            </button>
          </div>
        </div>
      )}

      {/* Current waypoint info (realtime mode) */}
      {!planningMode && drone.waypoints && drone.waypoints.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Waypoint</div>
          <div className="text-xs font-mono">
            {drone.currentWaypointIdx + 1} / {drone.waypoints.length}
          </div>
          {drone.waypoints[drone.currentWaypointIdx] && (
            <div className="text-[10px] font-mono text-muted-foreground">
              {drone.waypoints[drone.currentWaypointIdx].lat.toFixed(4)}°N{" "}
              {drone.waypoints[drone.currentWaypointIdx].lng.toFixed(4)}°E
            </div>
          )}
        </div>
      )}

      {/* AI analysis — hostile drones only */}
      {analysis && (
        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            AI-analys
          </div>
          <ContextualRecommendation text={analysis.recommendation} type={analysis.type} />
          {analysis.warnings.length > 0 && <WarningList warnings={analysis.warnings} />}
          {analysis.borderAlert && <BorderAlertPanel alert={analysis.borderAlert} />}
        </div>
      )}
    </div>
  );
}
