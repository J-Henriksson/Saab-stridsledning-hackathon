import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { AirDefenseUnit } from "@/types/units";
import type { EnemyEntity, EnemyBase } from "@/types/game";

interface Props {
  adUnits: AirDefenseUnit[];
  enemyEntities: EnemyEntity[];
  enemyBases: EnemyBase[];
}

export function WTALayer({ adUnits, enemyEntities, enemyBases }: Props) {
  const data = useMemo(() => {
    const allTargets = [
      ...enemyEntities.map((e) => ({ id: e.id, coords: e.coords })),
      ...enemyBases.map((b) => ({ id: b.id, coords: b.coords })),
    ];

    const features = adUnits
      .filter((u) => u.assignedTargetId)
      .flatMap((u) => {
        const target = allTargets.find((t) => t.id === u.assignedTargetId);
        if (!target) return [];
        return [{
          type: "Feature" as const,
          properties: { unitId: u.id },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [u.position.lng, u.position.lat],
              [target.coords.lng, target.coords.lat],
            ],
          },
        }];
      });

    return { type: "FeatureCollection" as const, features };
  }, [adUnits, enemyEntities, enemyBases]);

  return (
    <Source id="wta-lines" type="geojson" data={data}>
      <Layer
        id="wta-lines-layer"
        type="line"
        paint={{
          "line-color": "#DC2626",
          "line-width": 1.5,
          "line-dasharray": [3, 3],
          "line-opacity": 0.75,
        }}
      />
    </Source>
  );
}
