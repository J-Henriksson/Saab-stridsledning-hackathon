import { useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import type { TacticalZone } from "@/types/overlay";
import type { GameAction } from "@/types/game";

export interface AircraftPoint {
  id: string;
  tailNumber: string;
  lng: number;
  lat: number;
}

function zoneToPolygon(zone: TacticalZone): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (zone.shape === "circle" && zone.center && zone.radiusKm) {
    return turf.circle(
      [zone.center.lng, zone.center.lat],
      zone.radiusKm,
      { steps: 64, units: "kilometers" }
    );
  }
  if (zone.shape === "polygon" && zone.coordinates && zone.coordinates.length >= 3) {
    return turf.polygon([[...zone.coordinates, zone.coordinates[0]]]);
  }
  return null;
}

export function useIncursionDetection({
  aircraftPoints,
  restrictedZones,
  dispatch,
  currentHour,
}: {
  aircraftPoints: AircraftPoint[];
  restrictedZones: TacticalZone[];
  dispatch: (action: GameAction) => void;
  currentHour: number;
}) {
  const alertedPairs = useRef<Set<string>>(new Set());
  const prevHour = useRef(currentHour);

  // Clear tracked pairs each new game hour so re-entry can re-alert
  if (prevHour.current !== currentHour) {
    alertedPairs.current.clear();
    prevHour.current = currentHour;
  }

  useEffect(() => {
    for (const zone of restrictedZones) {
      const poly = zoneToPolygon(zone);
      if (!poly) continue;

      for (const ac of aircraftPoints) {
        const pairKey = `${ac.id}::${zone.id}`;
        if (alertedPairs.current.has(pairKey)) continue;

        const pt = turf.point([ac.lng, ac.lat]);
        if (turf.booleanPointInPolygon(pt, poly)) {
          alertedPairs.current.add(pairKey);
          dispatch({
            type: "ADD_EVENT",
            event: {
              type: "critical",
              message: `INTRÅNG: ${ac.tailNumber} har kränkt "${zone.name}"`,
            },
          });
        }
      }
    }
  }, [aircraftPoints, restrictedZones, dispatch]);
}
