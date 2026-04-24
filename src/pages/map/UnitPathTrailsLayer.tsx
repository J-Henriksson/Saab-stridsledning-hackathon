import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { Unit, GeoPosition } from "@/types/units";

interface UnitPathTrailsLayerProps {
  units: Unit[];
  /** Only this unit's trail renders — FlightRadar24-style bright gradient with halo. */
  selectedUnitId?: string | null;
}

function highlightColorFor(affiliation: string): string {
  if (affiliation === "hostile") return "#FF5555";
  if (affiliation === "friend") return "#FFD24D";
  return "#facc15";
}

/**
 * Historic flight-path layer.
 *
 * Only the selected unit's trail is drawn. The trail is the raw `pathHistory`
 * — a bright gradient that fades from transparent (oldest breadcrumb) to
 * saturated (most recent) with a soft halo underneath.
 *
 * Deliberately NOT connected to the live marker: the marker lerps ahead of
 * the latest game-tick breadcrumb, so extending the line to the marker would
 * jitter/overshoot. A small gap between the tip of the trail and the marker
 * is correct and reads as "current position".
 */
export function UnitPathTrailsLayer({ units, selectedUnitId }: UnitPathTrailsLayerProps) {
  const selectedUnit = useMemo(
    () => (selectedUnitId ? units.find((x) => x.id === selectedUnitId) : undefined),
    [units, selectedUnitId],
  );

  const feature = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!selectedUnit) return null;
    const hist = selectedUnit.pathHistory;
    if (!hist || hist.length < 2) return null;
    const coords: [number, number][] = hist.map((p: GeoPosition) => [p.lng, p.lat]);
    return {
      type: "Feature",
      properties: { id: selectedUnit.id, affiliation: selectedUnit.affiliation },
      geometry: { type: "LineString", coordinates: coords },
    };
  }, [selectedUnit]);

  const color = selectedUnit ? highlightColorFor(selectedUnit.affiliation) : "#facc15";

  if (!feature) return null;

  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [feature],
  };

  return (
    <Source id="unit-path-trails-selected" type="geojson" data={data} lineMetrics>
      <Layer
        id="unit-path-trails-selected-halo"
        type="line"
        paint={{
          "line-color": color,
          "line-width": 9,
          "line-opacity": 0.25,
          "line-blur": 6,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
      <Layer
        id="unit-path-trails-selected-line"
        type="line"
        paint={{
          "line-width": 3,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,   "rgba(250,204,21,0)",
            0.4, `${color}66`,
            1,   color,
          ],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
}
