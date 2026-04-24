import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { Unit, GeoPosition } from "@/types/units";
import { isAircraft, isAirDefense } from "@/types/units";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import { useGame } from "@/context/GameContext";

// Matches useGameClock: tickMs = max(1000 / gameSpeed, FRAME_MS).
// The lerp window tracks the actual wall-time between ticks so the marker
// catches up. A floor of LERP_WINDOW_MIN_MS keeps motion smooth at high game
// speeds — otherwise the ~60ms tick cadence at 16× leaves only 3-4 RAF frames
// per segment and the marker visibly stair-steps. With the floor the visual
// lags game-state by at most a few hundred ms, which is imperceptible at
// map scale but eliminates the jumps.
const FRAME_MS = 1000 / 60;
const LERP_WINDOW_MIN_MS = 220;
function expectedTickMs(gameSpeed: number): number {
  return Math.max(1000 / Math.max(1, gameSpeed), FRAME_MS, LERP_WINDOW_MIN_MS);
}

// Keep the @keyframes once per mount
const PULSE_STYLE = `
@keyframes unit-pulse {
  0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
}
`;

interface Snapshot {
  prevPos: GeoPosition;
  currPos: GeoPosition;
  observedAtMs: number; // wall-clock time the currPos was observed
}

interface UnitsLayerProps {
  units: Unit[];
  onSelectUnit?: (unitId: string) => void;
  selectedUnitId?: string | null;
}

function MovementTrails({ units, selectedUnitId }: { units: Unit[]; selectedUnitId?: string | null }) {
  const features = useMemo(() => {
    // Only the selected unit's heading vector is drawn — keeps the map clean.
    if (!selectedUnitId) return [] as GeoJSON.Feature<GeoJSON.LineString>[];
    const u = units.find((x) => x.id === selectedUnitId);
    if (!u) return [];
    const m = u.movement;
    if (!(m.state === "moving" || m.state === "airborne")) return [];
    if (!m.destination || typeof m.destination !== "object" || !("lat" in m.destination)) return [];
    const dest = m.destination as GeoPosition;
    return [{
      type: "Feature" as const,
      properties: { id: u.id, affiliation: u.affiliation },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [u.position.lng, u.position.lat],
          [dest.lng, dest.lat],
        ],
      },
    }];
  }, [units, selectedUnitId]);

  const data = {
    type: "FeatureCollection" as const,
    features,
  };

  return (
    <Source id="unit-trails" type="geojson" data={data}>
      <Layer
        id="unit-trails-line"
        type="line"
        paint={{
          "line-color": "#D7AB3A",
          "line-width": 1.2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.6,
        }}
      />
    </Source>
  );
}

export function UnitsLayer({ units, onSelectUnit, selectedUnitId }: UnitsLayerProps) {
  const { state, dispatch } = useGame();
  const tickMs = expectedTickMs(state.gameSpeed);
  // Keep base-owned flight animation in AircraftLayer, but allow deployed/airborne aircraft
  // plus all other unit categories to render through the shared unit layer.
  const renderable = useMemo(
    () => units.filter((u) => !isAircraft(u) || u.movement.state !== "stationary"),
    [units]
  );

  // Snapshot history keyed by unit id
  const snapshotsRef = useRef<Map<string, Snapshot>>(new Map());
  const [, setFrameTick] = useState(0);

  // On every incoming state, fold new target positions into the snapshot map
  useEffect(() => {
    const now = performance.now();
    const map = snapshotsRef.current;
    // Drop snapshots for units that no longer exist
    const alive = new Set(renderable.map((u) => u.id));
    for (const id of map.keys()) if (!alive.has(id)) map.delete(id);
    // Update or create snapshots
    for (const u of renderable) {
      const prev = map.get(u.id);
      if (!prev) {
        map.set(u.id, {
          prevPos: { ...u.position },
          currPos: { ...u.position },
          observedAtMs: now,
        });
      } else if (
        prev.currPos.lat !== u.position.lat ||
        prev.currPos.lng !== u.position.lng
      ) {
        // Compute where we visually are right now, use that as the new prevPos
        const ratio = Math.min(1, (now - prev.observedAtMs) / tickMs);
        const currentVisualPos = {
          lat: prev.prevPos.lat + (prev.currPos.lat - prev.prevPos.lat) * ratio,
          lng: prev.prevPos.lng + (prev.currPos.lng - prev.prevPos.lng) * ratio,
        };
        map.set(u.id, {
          prevPos: currentVisualPos,
          currPos: { ...u.position },
          observedAtMs: now,
        });
      }
    }
  }, [renderable]);

  // RAF loop re-renders every frame while any unit is mid-lerp
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      setFrameTick((n) => (n + 1) & 0xffff);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const now = performance.now();
  return (
    <>
      <style>{PULSE_STYLE}</style>
      <MovementTrails units={renderable} selectedUnitId={selectedUnitId} />
      {renderable.map((unit) => {
        const snap = snapshotsRef.current.get(unit.id);
        let pos: GeoPosition = unit.position;
        if (snap) {
          const ratio = Math.min(1, (now - snap.observedAtMs) / tickMs);
          pos = {
            lat: snap.prevPos.lat + (snap.currPos.lat - snap.prevPos.lat) * ratio,
            lng: snap.prevPos.lng + (snap.currPos.lng - snap.prevPos.lng) * ratio,
          };
        }

        const isMoving =
          unit.movement.state === "moving" || unit.movement.state === "airborne";
        const dest = unit.movement.destination;
        const destIsGeo = !!dest && typeof dest === "object" && "lat" in dest;

        const isAD = isAirDefense(unit);
        // Pre-placed static Lv batteries never accept drag, even when deployed.
        const isStaticAD = isAD && (unit as import("@/types/units").AirDefenseUnit).isStatic === true;
        const isDraggable = unit.currentBase === null && !isStaticAD;
        const glowFilter = selectedUnitId === unit.id
          ? isAD
            ? "drop-shadow(0 0 6px #DC2626)"
            : "drop-shadow(0 0 4px #D7AB3A)"
          : undefined;

        return (
          <Marker
            key={unit.id}
            longitude={pos.lng}
            latitude={pos.lat}
            anchor="center"
            draggable={isDraggable}
            onDragEnd={(e) => {
              dispatch({
                type: "RELOCATE_UNIT",
                unitId: unit.id,
                destination: { lat: e.lngLat.lat, lng: e.lngLat.lng },
              });
            }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectUnit?.(unit.id);
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectUnit?.(unit.id);
              }}
              style={{
                cursor: isDraggable ? "grab" : "pointer",
                filter: glowFilter,
                transform: selectedUnitId === unit.id ? "scale(1.15)" : undefined,
                transition: "transform 120ms ease",
                position: "relative",
              }}
              title={`${unit.name} — ${unit.category} (${unit.affiliation})`}
            >
              <UnitSymbol sidc={unit.sidc} size={28} title={unit.name} />
              {isMoving && destIsGeo && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#D7AB3A",
                    boxShadow: "0 0 8px #D7AB3A",
                    transform: "translate(-50%, -50%)",
                    animation: "unit-pulse 1.2s infinite",
                  }}
                />
              )}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
