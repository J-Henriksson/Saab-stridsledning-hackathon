import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import type { FixedAssetType } from "@/types/overlay";

const ASSET_COLOR: Record<FixedAssetType, string> = {
  army_regiment:    "#D7AB3A",
  marine_regiment:  "#22d3ee",
  naval_base:       "#2563eb",
  airport_civilian: "#94a3b8",
  ammo_depot:       "#D9192E",
};

function buildRingCollection(radiusField: "baseAreaKm" | "areaOfResponsibilityKm") {
  const features = [...FIXED_MILITARY_ASSETS, ...AMMO_DEPOTS].flatMap((asset) => {
    const radiusKm = asset[radiusField];
    if (!radiusKm) return [];
    const color = ASSET_COLOR[asset.type];
    const circle = turf.circle([asset.lng, asset.lat], radiusKm, {
      steps: 64,
      units: "kilometers",
      properties: { color, id: asset.id },
    });
    return [circle];
  });
  return turf.featureCollection(features);
}

interface CoverageRingsLayerProps {
  visible: boolean;
  showMilitary: boolean;
  showCivilian: boolean;
}

export function CoverageRingsLayer({ visible, showMilitary, showCivilian }: CoverageRingsLayerProps) {
  const baseAreaGeoJSON = useMemo(() => buildRingCollection("baseAreaKm"), []);
  const aorGeoJSON = useMemo(() => buildRingCollection("areaOfResponsibilityKm"), []);

  if (!visible) return null;

  // Filter by visibility toggles — hide civilian airports when showCivilian=false,
  // hide military when showMilitary=false
  const civilianIds = new Set(
    FIXED_MILITARY_ASSETS.filter((a) => a.type === "airport_civilian").map((a) => a.id)
  );
  const filterExpr = (geoJSON: ReturnType<typeof buildRingCollection>) => ({
    ...geoJSON,
    features: geoJSON.features.filter((f) => {
      const id = f.properties?.id as string;
      const isCivilian = civilianIds.has(id);
      if (isCivilian && !showCivilian) return false;
      if (!isCivilian && !showMilitary) return false;
      return true;
    }),
  });

  const baseAreaFiltered = filterExpr(baseAreaGeoJSON);
  const aorFiltered = filterExpr(aorGeoJSON);

  return (
    <>
      {/* ── Outer ring — Area of Responsibility ── */}
      <Source id="coverage-aor" type="geojson" data={aorFiltered}>
        {/* Fill — barely visible */}
        <Layer
          id="coverage-aor-fill"
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": 0.03,
          }}
        />
        {/* Dashed border */}
        <Layer
          id="coverage-aor-line"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": 1.5,
            "line-opacity": 0.55,
            "line-dasharray": [6, 4],
          }}
        />
      </Source>

      {/* ── Inner ring — Base Area ── */}
      <Source id="coverage-base-area" type="geojson" data={baseAreaFiltered}>
        {/* Fill — slightly more opaque than AoR */}
        <Layer
          id="coverage-base-fill"
          type="fill"
          paint={{
            "fill-color": ["get", "color"],
            "fill-opacity": 0.07,
          }}
        />
        {/* Solid border */}
        <Layer
          id="coverage-base-line"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": 1.5,
            "line-opacity": 0.75,
          }}
        />
      </Source>
    </>
  );
}
