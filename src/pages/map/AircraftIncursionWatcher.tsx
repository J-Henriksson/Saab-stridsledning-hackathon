import { useMemo } from "react";
import type { Base, GameAction } from "@/types/game";
import type { TacticalZone } from "@/types/overlay";
import { getAircraft } from "@/core/units/helpers";
import { useIncursionDetection } from "./useIncursionDetection";

/**
 * Headless watcher: runs incursion detection against real airborne-aircraft
 * positions (movement.state === "airborne") in `base.units`. Replaces the
 * previous responsibility carried by AircraftLayer; renders nothing.
 */
export function AircraftIncursionWatcher({
  bases,
  tacticalZones,
  dispatch,
  currentHour,
}: {
  bases: Base[];
  tacticalZones?: TacticalZone[];
  dispatch?: (action: GameAction) => void;
  currentHour?: number;
}) {
  const restrictedZones = useMemo(
    () =>
      (tacticalZones ?? []).filter(
        (z) =>
          z.userType === "restricted" ||
          z.fixedType === "no_fly" ||
          z.fixedType === "high_security",
      ),
    [tacticalZones],
  );

  const aircraftPoints = useMemo(() => {
    const pts: { id: string; tailNumber: string; lng: number; lat: number }[] = [];
    for (const base of bases) {
      for (const ac of getAircraft(base)) {
        if (ac.movement.state !== "airborne" && ac.movement.state !== "moving") continue;
        pts.push({
          id: ac.id,
          tailNumber: ac.tailNumber,
          lng: ac.position.lng,
          lat: ac.position.lat,
        });
      }
    }
    return pts;
  }, [bases]);

  useIncursionDetection({
    aircraftPoints,
    restrictedZones,
    dispatch: dispatch ?? (() => {}),
    currentHour: currentHour ?? 0,
  });

  return null;
}
