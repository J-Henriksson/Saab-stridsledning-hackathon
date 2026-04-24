import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { DroneUnit } from "@/types/units";

const AFFIL_COLORS: Record<string, string> = {
  friend:  "#22c55e",
  hostile: "#ef4444",
  neutral: "#a3a3a3",
  unknown: "#eab308",
  pending: "#a78bfa",
};

function makeCirclePolygon(centerLat: number, centerLng: number, radiusKm: number, steps = 64): [number, number][] {
  const coords: [number, number][] = [];
  const latDeg = radiusKm / 111;
  const lngDeg = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      centerLng + lngDeg * Math.cos(angle),
      centerLat + latDeg * Math.sin(angle),
    ]);
  }
  return coords;
}

interface DroneRangeOverlayProps {
  drones: DroneUnit[];
}

export function DroneRangeOverlay({ drones }: DroneRangeOverlayProps) {
  const visible = drones.filter((d) => d.rangeRadiusVisible && d.position);

  const features = useMemo(() => visible.map((drone) => ({
    type: "Feature" as const,
    properties: { id: drone.id, color: AFFIL_COLORS[drone.affiliation] ?? "#e2e8f0" },
    geometry: {
      type: "Polygon" as const,
      coordinates: [makeCirclePolygon(drone.position.lat, drone.position.lng, drone.sensorRangeKm)],
    },
  })), [visible]);

  if (features.length === 0) return null;

  const data = { type: "FeatureCollection" as const, features };

  return (
    <Source id="drone-ranges" type="geojson" data={data}>
      <Layer
        id="drone-ranges-line"
        type="line"
        paint={{
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-dasharray": [3, 3],
          "line-opacity": 0.65,
        }}
      />
    </Source>
  );
}
