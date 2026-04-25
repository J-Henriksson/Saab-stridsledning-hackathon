import { useMemo } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { NavalUnit } from "@/types/game";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import {
  WarshipIcon,
  FrigateIcon,
  SubmarineIcon,
  PatrolBoatIcon,
  AmphIbShipIcon,
  LogisticsShipIcon,
} from "@/components/symbols/UnitIcons";

// NATO SIDC for naval units — affiliation digit at index 3 (3=friend, 6=hostile)
function navalSidc(kind: NavalUnit["kind"], affiliation: NavalUnit["affiliation"]): string {
  const a = affiliation === "friend" ? "3" : "6";
  if (kind === "submarine") return `100${a}1000004520000000`; // subsurface
  return `100${a}1000004501000000`; // surface warship
}

interface NavalUnitsLayerProps {
  visible: NavalUnit[];
  lastKnown: NavalUnit[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  iconStyle?: "custom" | "nato";
  highlightBaseId?: string | null;
}

function IconForKind({ kind, color, size }: { kind: NavalUnit["kind"]; color: string; size: number }) {
  switch (kind) {
    case "submarine":     return <SubmarineIcon     size={size} color={color} />;
    case "frigate":       return <FrigateIcon        size={size} color={color} />;
    case "amphib":        return <AmphIbShipIcon     size={size} color={color} />;
    case "logistics_ship":return <LogisticsShipIcon  size={size} color={color} />;
    case "patrol_boat":   return <PatrolBoatIcon     size={size} color={color} />;
    default:              return <WarshipIcon         size={size} color={color} />;
  }
}

function colorFor(affiliation: NavalUnit["affiliation"]): string {
  return affiliation === "hostile" ? "#D9192E" : "#3DB168";
}

/**
 * Renders naval markers (friendly + currently-detected hostile) and fog-of-war
 * "last known" ghosts for hostiles that have slipped out of sensor coverage.
 */
export function NavalUnitsLayer({ visible, lastKnown, onSelect, selectedId, iconStyle = "custom", highlightBaseId }: NavalUnitsLayerProps) {
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
        const color = colorFor(n.affiliation);
        const isSelected = selectedId === n.id;
        // Only dim friendly naval (no base association); enemies are never dimmed
        const isDimmed = !!highlightBaseId && n.affiliation !== "hostile";
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
                cursor: "pointer",
                opacity: isDimmed ? 0.15 : 1,
                filter: isSelected ? `drop-shadow(0 0 6px ${color})` : undefined,
                transform: isSelected ? "scale(1.15)" : undefined,
                transition: "transform 120ms ease, opacity 0.35s ease",
              }}
            >
              {iconStyle === "nato"
                ? <UnitSymbol sidc={navalSidc(n.kind, n.affiliation)} size={28} title={n.name} />
                : <IconForKind kind={n.kind} color={color} size={28} />
              }
            </div>
          </Marker>
        );
      })}

      {/* Last-known fog-of-war ghosts: rendered faded. */}
      {lastKnown.map((n) => {
        const pos = n.lastKnownPosition ?? n.position;
        const color = colorFor(n.affiliation);
        return (
          <Marker key={`lk-${n.id}`} longitude={pos.lng} latitude={pos.lat} anchor="center">
            <div
              title={`${n.name} — LAST KNOWN`}
              style={{ opacity: 0.45, cursor: "default", position: "relative" }}
            >
              {iconStyle === "nato"
                ? <UnitSymbol sidc={navalSidc(n.kind, n.affiliation)} size={24} title={n.name} />
                : <IconForKind kind={n.kind} color={color} size={24} />
              }
              <div
                style={{
                  position: "absolute",
                  top: -13,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 8,
                  fontFamily: "monospace",
                  color,
                  whiteSpace: "nowrap",
                  opacity: 0.8,
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
