// Reusable sub-panel: live sensor coverage + satellite countdown + intel card.
// Used by EnemyEntityDetailPanel, NavalDetailPanel, and AircraftDetailPanel
// when showing units involved in the Baltic-incursion scenario.

import { Radio, Satellite, BookOpen } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { computeFriendlySensorCoverage } from "@/core/intel/visibility";
import { haversineDistance } from "@/utils/geoDistance";
import { DEMO_RADAR_UNITS } from "@/data/radarUnits";
import { intelFor } from "./intel";
import { absoluteGameSec } from "@/core/engine";

interface Props {
  position: { lat: number; lng: number };
  /** When set, attempts to look up rigged intel by id. */
  intelId?: string;
  /** Optional override — for friendly aircraft, show "own sensor" instead of
   *  passive coverage. */
  ownSensorRangeKm?: number;
}

const RADAR_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  DEMO_RADAR_UNITS.map((r) => [r.id, r.name]),
);

function discLabel(id: string, sourceKind: string): string {
  if (RADAR_NAME_BY_ID[id]) return RADAR_NAME_BY_ID[id];
  if (sourceKind === "aircraft") return `Flygburen sensor (${id})`;
  if (sourceKind === "drone") return `Drönarsensor (${id})`;
  return id;
}

export function ScenarioSensorPanel({ position, intelId, ownSensorRangeKm }: Props) {
  const { state } = useGame();
  const discs = computeFriendlySensorCoverage(state);

  // Coverage rows — radars that contain `position` within their disc.
  const covering = discs
    .map((d) => {
      const km = haversineDistance(position, d.center) / 1000;
      return { id: d.id, kind: d.sourceKind, km, radius: d.radiusKm };
    })
    .filter((row) => row.km <= row.radius)
    .sort((a, b) => a.km - b.km);

  // Satellite countdown — driven by scenario clock, otherwise a stable estimate.
  const sc = state.scenario;
  let satEtaSec = 4 * 60 + 12;
  if (sc) {
    const elapsed = absoluteGameSec(state) - sc.startedAtSec;
    satEtaSec = Math.max(0, sc.satelliteEtaSec - elapsed);
  }
  const satMin = Math.floor(satEtaSec / 60);
  const satSec = Math.floor(satEtaSec % 60);
  const satLabel = `${String(satMin).padStart(2, "0")}:${String(satSec).padStart(2, "0")}`;

  const intel = intelId ? intelFor(intelId) : undefined;

  return (
    <div className="space-y-3">
      {/* Sensor coverage */}
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Radio className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-widest">
            {ownSensorRangeKm ? "Egen + datalänkad sensor" : "Sensortäckning"}
          </span>
        </div>
        {ownSensorRangeKm !== undefined && (
          <div className="text-[11px] font-mono text-foreground mb-1.5">
            Egen sensor: {ownSensorRangeKm} km radie
          </div>
        )}
        {covering.length === 0 ? (
          <div className="text-[11px] font-mono text-muted-foreground">
            Ingen aktiv täckning — målet är ej spårbart för närvarande.
          </div>
        ) : (
          <ul className="space-y-1">
            {covering.map((row) => (
              <li key={row.id} className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-foreground truncate">{discLabel(row.id, row.kind)}</span>
                <span className="text-muted-foreground/80">
                  {Math.round(row.km)} km / {Math.round(row.radius)} km
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Satellite window */}
      <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Satellite className="h-3 w-3 text-violet-400" />
          <span className="text-[9px] font-mono text-violet-400/80 uppercase tracking-widest">
            Satellitfönster
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-mono text-foreground">Ej över mål</span>
          <span className="text-[10px] font-mono text-muted-foreground">·</span>
          <span className="text-[11px] font-mono font-bold text-violet-300 tabular-nums">
            {satLabel}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">till nästa pass</span>
        </div>
      </div>

      {/* Intel card */}
      {intel && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3 w-3 text-amber-400" />
            <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest">
              Underrättelseöversikt
            </span>
          </div>
          <div className="text-[11px] font-mono text-foreground">{intel.classification}</div>
          <p className="text-[11px] leading-relaxed text-foreground/85">{intel.aiAssessment}</p>

          <div>
            <div className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider mb-0.5">
              Uppskattade fakta
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {intel.estimates.map((e) => (
                <div key={e.label} className="text-[10px] font-mono">
                  <span className="text-muted-foreground/70">{e.label}:</span>{" "}
                  <span className="text-foreground">{e.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider mb-0.5">
              Vapen / utrustning
            </div>
            <ul className="space-y-0.5">
              {intel.weapons.map((w) => (
                <li key={w} className="text-[10px] font-mono text-foreground/85 leading-snug">
                  · {w}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider mb-0.5">
              AI-historikanalys
            </div>
            <ul className="space-y-0.5">
              {intel.history.map((h) => (
                <li key={h} className="text-[10px] font-mono text-foreground/80 leading-snug">
                  · {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
