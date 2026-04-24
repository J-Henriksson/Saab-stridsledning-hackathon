import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { Unit, GeoPosition } from "@/types/units";
import { isAircraft } from "@/types/units";
import { UnitSymbol } from "@/components/map/UnitSymbol";

// How long, in wall-ms, we expect a single engine tick to take at 1× game speed.
// This is the lerp window. If the next tick lands sooner, the next render snaps
// to the new target and starts a fresh lerp.
const EXPECTED_TICK_MS = 1000;

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

function MovementTrails({ units }: { units: Unit[] }) {
  const features = useMemo(() => {
    return units
      .filter((u) => {
        const m = u.movement;
        return (
          (m.state === "moving" || m.state === "airborne") &&
          !!m.destination &&
          typeof m.destination === "object" &&
          "lat" in m.destination
        );
      })
      .map((u) => {
        const dest = u.movement.destination as GeoPosition;
        return {
          type: "Feature" as const,
          properties: { id: u.id, affiliation: u.affiliation },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [u.position.lng, u.position.lat],
              [dest.lng, dest.lat],
            ],
          },
        };
      });
  }, [units]);

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
        const ratio = Math.min(1, (now - prev.observedAtMs) / EXPECTED_TICK_MS);
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
      <MovementTrails units={renderable} />
      {renderable.map((unit) => {
        const snap = snapshotsRef.current.get(unit.id);
        let pos: GeoPosition = unit.position;
        if (snap) {
          const ratio = Math.min(1, (now - snap.observedAtMs) / EXPECTED_TICK_MS);
          pos = {
            lat: snap.prevPos.lat + (snap.currPos.lat - snap.prevPos.lat) * ratio,
            lng: snap.prevPos.lng + (snap.currPos.lng - snap.prevPos.lng) * ratio,
          };
        }

        const isMoving =
          unit.movement.state === "moving" || unit.movement.state === "airborne";
        const dest = unit.movement.destination;
        const destIsGeo = !!dest && typeof dest === "object" && "lat" in dest;

        return (
          <Marker
            key={unit.id}
            longitude={pos.lng}
            latitude={pos.lat}
            anchor="center"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectUnit?.(unit.id);
              }}
              style={{
                cursor: "pointer",
                filter:
                  selectedUnitId === unit.id ? "drop-shadow(0 0 4px #D7AB3A)" : undefined,
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
