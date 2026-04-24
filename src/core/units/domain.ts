import type { Unit } from "@/types/units";
import type { AircraftStatus } from "@/types/game";

export type UnitDomain = "air" | "land" | "sea";

/** Classify a Unit into the dashboard's Air / Land / Sea buckets. */
export function unitDomain(u: Unit): UnitDomain {
  switch (u.category) {
    case "aircraft":
    case "drone":
      return "air";
    case "air_defense":
    case "ground_vehicle":
    case "radar":
      return "land";
  }
}

export type UnitStatusBucket = "inflight" | "onbase" | "maintenance";

/**
 * Classify a unit by where it is / what it's doing, for the dashboard's
 * In-flight / On-base / Under-maintenance columns.
 *
 * `isOnBase` is passed explicitly so callers can distinguish between
 * `base.units[*]` (on-base) and `state.deployedUnits[*]` (in-flight / in-field).
 */
export function unitStatusBucket(u: Unit, isOnBase: boolean): UnitStatusBucket {
  // Aircraft have an explicit status field that takes priority.
  if (u.category === "aircraft") {
    const s = u.status as AircraftStatus;
    if (s === "under_maintenance" || s === "unavailable") return "maintenance";
    if (s === "on_mission" || s === "returning" || u.movement.state === "airborne") return "inflight";
    return isOnBase ? "onbase" : "inflight";
  }
  if (u.category === "drone") {
    if (u.status === "under_maintenance" || u.status === "unavailable") return "maintenance";
    if (!isOnBase || u.movement.state === "airborne" || u.movement.state === "moving") return "inflight";
    return "onbase";
  }
  // Land units (AD / ground / radar): maintenance bucket is skipped for now
  // since we don't track that state on them; classify by location.
  return isOnBase ? "onbase" : "inflight";
}
