import type { Base } from "@/types/game";
import type { AircraftUnit, Unit } from "@/types/units";
import { isAircraft } from "@/types/units";

/**
 * Returns the aircraft-variant units at a base. This is the single read path
 * for aircraft, since the legacy `Base.aircraft` field has been removed and
 * aircraft now live in `base.units` alongside other unit categories.
 */
export function getAircraft(base: Base): AircraftUnit[] {
  return base.units.filter(isAircraft);
}

/** Returns every unit across all bases plus the field-deployed list. */
export function allUnits(bases: Base[], deployedUnits: Unit[]): Unit[] {
  return [...bases.flatMap((b) => b.units), ...deployedUnits];
}
