import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { FixedMilitaryAsset } from "@/types/overlay";
import { buildRings, calculateOverlaps, type OverlapZone } from "@/utils/coverageAnalysis";

interface Props {
  assets: FixedMilitaryAsset[];
  showRings: boolean;
  showOverlaps: boolean;
}

export function CoverageRingsLayer({ assets, showRings, showOverlaps }: Props) {
  const rings = useMemo(() => buildRings(assets), [assets]);

  const ringsGeoJSON = useMemo((): FeatureCollection<Polygon> => ({
    type: "FeatureCollection",
    features: rings.map((r) =>
      turf.circle([r.lng, r.lat], r.radiusKm, {
        steps: 64,
        units: "kilometers",
        properties: { id: r.id, color: r.color },
      })
    ),
  }), [rings]);

  const overlapZones: OverlapZone[] = useMemo(
    () => calculateOverlaps(rings),
    [rings]
  );

  const overlapsGeoJSON = useMemo((): FeatureCollection<Polygon | MultiPolygon> => ({
    type: "FeatureCollection",
    features: overlapZones.map((oz, i) => ({
      ...oz.geometry,
      properties: { depth: oz.depth, id: `overlap-${i}` },
    })),
  }), [overlapZones]);

  if (!showRings && !showOverlaps) return null;

  return (
    <>
      {/* ── Base rings ── */}
      {showRings && (
        <Source id="coverage-rings" type="geojson" data={ringsGeoJSON}>
          {/* Subtle fill */}
          <Layer
            id="coverage-rings-fill"
            type="fill"
            paint={{
              "fill-color": ["get", "color"],
              "fill-opacity": 0.04,
            }}
          />
          {/* Dashed stroke */}
          <Layer
            id="coverage-rings-stroke"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 1.5,
              "line-opacity": 0.55,
              "line-dasharray": [6, 4],
            }}
          />
        </Source>
      )}

      {/* ── Overlap zones ── */}
      {showOverlaps && overlapZones.length > 0 && (
        <Source id="coverage-overlaps" type="geojson" data={overlapsGeoJSON}>
          <Layer
            id="coverage-overlaps-fill"
            type="fill"
            paint={{
              "fill-color": "#3A9FFF",
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["get", "depth"],
                2, 0.10,
                3, 0.15,
                4, 0.20,
              ],
            }}
          />
          <Layer
            id="coverage-overlaps-stroke"
            type="line"
            paint={{
              "line-color": "#3A9FFF",
              "line-width": 1,
              "line-opacity": 0.4,
            }}
          />
        </Source>
      )}
    </>
  );
}
