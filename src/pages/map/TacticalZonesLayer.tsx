import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import type { TacticalZone } from "@/types/overlay";
import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";

function zoneTypeKey(zone: TacticalZone): string {
  return zone.userType ?? zone.fixedType ?? "restricted";
}

function zoneToFeature(zone: TacticalZone): GeoJSON.Feature | null {
  if (zone.shape === "circle" && zone.center && zone.radiusKm) {
    const circ = turf.circle(
      [zone.center.lng, zone.center.lat],
      zone.radiusKm,
      { steps: 64, units: "kilometers" }
    );
    return {
      ...circ,
      properties: {
        id: zone.id,
        typeKey: zoneTypeKey(zone),
        category: zone.category,
      },
    };
  }
  if (zone.shape === "polygon" && zone.coordinates && zone.coordinates.length >= 3) {
    return {
      type: "Feature",
      properties: {
        id: zone.id,
        typeKey: zoneTypeKey(zone),
        category: zone.category,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[...zone.coordinates, zone.coordinates[0]]],
      },
    };
  }
  return null;
}

const COLOR_EXPR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "typeKey"],
  "restricted",    "#D9192E",
  "surveillance",  "#D7AB3A",
  "logistics",     "#2563eb",
  "roadstrip",     "#22d3ee",
  "no_fly",        "#D9192E",
  "high_security", "#7c3aed",
  "#94a3b8",
];

const FILL_OPACITY_EXPR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "typeKey"],
  "restricted",    0.18,
  "surveillance",  0.14,
  "logistics",     0.14,
  "roadstrip",     0.20,
  "no_fly",        0.10,
  "high_security", 0.14,
  0.12,
];

const fillPaint: FillLayerSpecification["paint"] = {
  "fill-color": COLOR_EXPR,
  "fill-opacity": FILL_OPACITY_EXPR,
};

const borderPaint: LineLayerSpecification["paint"] = {
  "line-color": COLOR_EXPR,
  "line-width": ["match", ["get", "category"], "fixed", 2.5, 1.8],
  "line-opacity": 0.85,
};

export function TacticalZonesLayer({
  zones,
  visible,
}: {
  zones: TacticalZone[];
  visible: boolean;
}) {
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!visible) return { type: "FeatureCollection", features: [] };
    const features = zones
      .map(zoneToFeature)
      .filter((f): f is GeoJSON.Feature => f !== null);
    return { type: "FeatureCollection", features };
  }, [zones, visible]);

  return (
    <Source id="tactical-zones" type="geojson" data={geojson}>
      <Layer id="tactical-zones-fill" type="fill" paint={fillPaint} />
      <Layer
        id="tactical-zones-border"
        type="line"
        paint={borderPaint}
        layout={{}}
      />
    </Source>
  );
}
