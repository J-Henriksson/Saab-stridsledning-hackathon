import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { DroneUnit } from "@/types/units";
import { BASE_COORDS } from "@/pages/map/constants";

interface DroneConnectionLineProps {
  drones: DroneUnit[];
}

export function DroneConnectionLine({ drones }: DroneConnectionLineProps) {
  const visible = drones.filter((d) => {
    if (!d.connectionLineVisible) return false;
    const base = d.currentBase ?? d.lastBase;
    return !!base && !!BASE_COORDS[base] && !!d.position;
  });

  const features = useMemo(() => visible.map((drone) => {
    const base = (drone.currentBase ?? drone.lastBase)!;
    const baseCoords = BASE_COORDS[base];
    return {
      type: "Feature" as const,
      properties: { id: drone.id },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [drone.position.lng, drone.position.lat],
          [baseCoords.lng, baseCoords.lat],
        ],
      },
    };
  }), [visible]);

  if (features.length === 0) return null;

  const data = { type: "FeatureCollection" as const, features };

  return (
    <Source id="drone-connections" type="geojson" data={data}>
      <Layer
        id="drone-connections-line"
        type="line"
        paint={{
          "line-color": "rgba(200,200,200,0.55)",
          "line-width": 1,
          "line-dasharray": [4, 4],
        }}
      />
    </Source>
  );
}
