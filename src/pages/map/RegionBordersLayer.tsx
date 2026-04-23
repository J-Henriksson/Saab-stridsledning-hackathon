import { useState, useEffect, useCallback } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { useMap } from "react-map-gl/maplibre";

// Simplified (but geographically representative) county polygons [lng, lat][]
// Covers the Stockholm–Linköping tactical corridor
const REGIONS: {
  id: string;
  name: string;
  shortName: string;
  color: string;
  ring: [number, number][];
  labelPos: [number, number]; // [lng, lat]
}[] = [
  {
    id: "ostergotland",
    name: "Östergötlands Län",
    shortName: "ÖSTG",
    color: "#D7AB3A",
    labelPos: [15.62, 58.22],
    ring: [
      [14.18, 57.72], [16.90, 57.72], [17.10, 58.30],
      [16.82, 58.90], [14.18, 58.90], [14.18, 57.72],
    ],
  },
  {
    id: "sodermanland",
    name: "Södermanlands Län",
    shortName: "SÖDM",
    color: "#22d3ee",
    labelPos: [15.90, 59.10],
    ring: [
      [14.18, 58.90], [16.82, 58.90], [17.10, 58.30],
      [17.32, 58.72], [17.32, 59.50], [16.20, 59.50],
      [14.18, 59.50], [14.18, 58.90],
    ],
  },
  {
    id: "vastmanland",
    name: "Västmanlands Län",
    shortName: "VSTM",
    color: "#a78bfa",
    labelPos: [15.82, 59.75],
    ring: [
      [14.18, 59.50], [16.20, 59.50], [17.32, 59.50],
      [17.32, 59.90], [17.00, 60.10], [16.40, 60.10],
      [14.18, 60.02], [14.18, 59.50],
    ],
  },
  {
    id: "stockholm",
    name: "Stockholms Län",
    shortName: "STHM",
    color: "#D9192E",
    labelPos: [18.30, 59.32],
    ring: [
      [17.32, 58.72], [17.90, 58.68], [18.50, 58.88],
      [18.90, 59.14], [19.12, 59.52], [18.92, 59.72],
      [18.22, 59.82], [17.32, 59.50], [17.32, 58.72],
    ],
  },
  {
    id: "uppsala",
    name: "Uppsala Län",
    shortName: "UPP",
    color: "#22c55e",
    labelPos: [17.90, 60.10],
    ring: [
      [17.32, 59.50], [18.22, 59.82], [18.92, 59.72],
      [19.12, 59.52], [19.30, 60.00], [19.05, 60.28],
      [18.60, 60.52], [17.96, 60.64], [17.20, 60.60],
      [16.60, 60.42], [16.38, 60.10], [17.00, 60.10],
      [17.32, 59.90], [17.32, 59.50],
    ],
  },
];

const REGION_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: REGIONS.map((r) => ({
    type: "Feature",
    properties: { id: r.id, name: r.name, color: r.color },
    geometry: {
      type: "Polygon",
      coordinates: [[...r.ring, r.ring[0]]],
    },
  })),
};

// SVG label overlay — re-projects on every map move (same approach as SwedenOutline.tsx)
function RegionLabels() {
  const { current: mapRef } = useMap();
  const [, setTick] = useState(0);

  const rerender = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!mapRef) return;
    const m = mapRef.getMap();
    m.on("move", rerender);
    m.on("zoom", rerender);
    return () => {
      m.off("move", rerender);
      m.off("zoom", rerender);
    };
  }, [mapRef, rerender]);

  if (!mapRef) return null;
  const m = mapRef.getMap();
  const zoom = m.getZoom();
  if (zoom < 6) return null; // hide labels when too zoomed out

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {REGIONS.map((r) => {
        const p = m.project(r.labelPos);
        const fontSize = Math.max(9, Math.min(13, (zoom - 5) * 2.5));
        return (
          <g key={r.id}>
            {/* Background pill */}
            <rect
              x={p.x - 22}
              y={p.y - 9}
              width={44}
              height={15}
              rx={4}
              fill="rgba(5,10,20,0.75)"
              stroke={r.color}
              strokeWidth={0.8}
              strokeOpacity={0.7}
            />
            {/* Short name */}
            <text
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fill={r.color}
              fontSize={fontSize}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="bold"
              letterSpacing="0.08em"
            >
              {r.shortName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Color expression for MapLibre — matches region id → color
const COLOR_EXPR: maplibregl.ExpressionSpecification = [
  "match",
  ["get", "id"],
  "ostergotland", "#D7AB3A",
  "sodermanland", "#22d3ee",
  "vastmanland",  "#a78bfa",
  "stockholm",    "#D9192E",
  "uppsala",      "#22c55e",
  "#94a3b8",
];

export function RegionBordersLayer() {
  return (
    <>
      <Source id="region-borders" type="geojson" data={REGION_GEOJSON}>
        {/* Very subtle fill so the map stays readable */}
        <Layer
          id="region-fill"
          type="fill"
          paint={{
            "fill-color": COLOR_EXPR,
            "fill-opacity": 0.04,
          }}
        />
        {/* Distinct county border line */}
        <Layer
          id="region-border"
          type="line"
          paint={{
            "line-color": COLOR_EXPR,
            "line-width": 1.5,
            "line-opacity": 0.55,
            "line-dasharray": [5, 3],
          }}
        />
        {/* Inner glow for county borders */}
        <Layer
          id="region-border-glow"
          type="line"
          paint={{
            "line-color": COLOR_EXPR,
            "line-width": 4,
            "line-opacity": 0.08,
            "line-blur": 4,
          }}
        />
      </Source>
      <RegionLabels />
    </>
  );
}
