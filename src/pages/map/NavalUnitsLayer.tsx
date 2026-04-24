import { useMemo } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { NavalUnit } from "@/types/game";
import { Ship, Anchor, Waves } from "lucide-react";

interface NavalUnitsLayerProps {
  visible: NavalUnit[];
  lastKnown: NavalUnit[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

function iconFor(kind: NavalUnit["kind"]) {
  switch (kind) {
    case "submarine":
      return Anchor;
    case "amphib":
    case "logistics_ship":
      return Waves;
    default:
      return Ship;
  }
}

function colorFor(affiliation: NavalUnit["affiliation"]): string {
  return affiliation === "hostile" ? "#D9192E" : "#3DB168";
}

/**
 * Renders naval markers (friendly + currently-detected hostile) and fog-of-war
 * "last known" ghosts for hostiles that have slipped out of sensor coverage.
 */
export function NavalUnitsLayer({ visible, lastKnown, onSelect, selectedId }: NavalUnitsLayerProps) {
  // Selected ship's historic trail — FlightRadar-style bright gradient.
  const selectedNaval = useMemo(
    () => (selectedId ? visible.find((n) => n.id === selectedId) : undefined),
    [visible, selectedId],
  );
  const selectedTrail = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!selectedNaval || !selectedNaval.pathHistory || selectedNaval.pathHistory.length < 2) return null;
    const coords: [number, number][] = selectedNaval.pathHistory.map((p) => [p.lng, p.lat]);
    return {
      type: "Feature",
      properties: { id: selectedNaval.id },
      geometry: { type: "LineString", coordinates: coords },
    };
  }, [selectedNaval]);

  return (
    <>
      {selectedTrail && selectedNaval && (
        <Source id="naval-trails-selected" type="geojson" data={{ type: "FeatureCollection", features: [selectedTrail] }} lineMetrics>
          <Layer
            id="naval-trails-selected-halo"
            type="line"
            paint={{
              "line-color": colorFor(selectedNaval.affiliation),
              "line-width": 9,
              "line-opacity": 0.25,
              "line-blur": 6,
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
          <Layer
            id="naval-trails-selected-line"
            type="line"
            paint={{
              "line-width": 3,
              "line-gradient": [
                "interpolate",
                ["linear"],
                ["line-progress"],
                0, "rgba(250,204,21,0)",
                0.4, `${colorFor(selectedNaval.affiliation)}66`,
                1, colorFor(selectedNaval.affiliation),
              ],
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      {visible.map((n) => {
        const Icon = iconFor(n.kind);
        const color = colorFor(n.affiliation);
        const isSelected = selectedId === n.id;
        return (
          <Marker
            key={n.id}
            longitude={n.position.lng}
            latitude={n.position.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect?.(n.id);
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(n.id);
              }}
              title={`${n.name} — ${n.kind} (${n.affiliation})`}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background: `${color}22`,
                border: `1.5px solid ${color}`,
                cursor: "pointer",
                filter: isSelected ? `drop-shadow(0 0 6px ${color})` : undefined,
                transform: isSelected ? "scale(1.15)" : undefined,
                transition: "transform 120ms ease",
              }}
            >
              <Icon size={16} color={color} strokeWidth={2.2} />
            </div>
          </Marker>
        );
      })}

      {/* Last-known fog-of-war ghosts: rendered faded + dashed ring. */}
      {lastKnown.map((n) => {
        const pos = n.lastKnownPosition ?? n.position;
        const Icon = iconFor(n.kind);
        const color = colorFor(n.affiliation);
        return (
          <Marker key={`lk-${n.id}`} longitude={pos.lng} latitude={pos.lat} anchor="center">
            <div
              title={`${n.name} — LAST KNOWN`}
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                background: "transparent",
                border: `1.5px dashed ${color}`,
                opacity: 0.55,
                cursor: "default",
                position: "relative",
              }}
            >
              <Icon size={14} color={color} strokeWidth={1.8} style={{ opacity: 0.7 }} />
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 8,
                  fontFamily: "monospace",
                  color,
                  whiteSpace: "nowrap",
                  opacity: 0.75,
                }}
              >
                LAST KNOWN
              </div>
            </div>
          </Marker>
        );
      })}
    </>
  );
}
