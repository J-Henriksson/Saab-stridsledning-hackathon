import type { Base } from "@/types/game";
import type { AircraftUnit, Unit } from "@/types/units";
import { isAircraft } from "@/types/units";

/**
 * Migration helper. Returns the aircraft-variant units at a base. Intended as
 * the single read path once `Base.aircraft` is removed. Until then, existing
 * callers continue to use `base.aircraft` and this helper coexists.
 */
export function getAircraft(base: Base): AircraftUnit[] {
  return base.units.filter(isAircraft);
}

/** Returns every unit across all bases plus the field-deployed list. */
export function allUnits(bases: Base[], deployedUnits: Unit[]): Unit[] {
  return [...bases.flatMap((b) => b.units), ...deployedUnits];
}
