import type { ScenarioPhase } from "@/types/game";
import { FUEL_DRAIN_RATE } from "@/data/config/capacities";
import type { Unit, GeoPosition } from "@/types/units";

const KNOTS_TO_DEG_PER_HOUR = 1 / 60;

function isGeoPosition(x: unknown): x is GeoPosition {
  return !!x && typeof x === "object" && "lat" in (x as object) && "lng" in (x as object);
}

export function enforceAirborneInvariant(unit: Unit, isAtBase: boolean): Unit {
  if (unit.category === "aircraft") {
    const shouldBeAirborne = unit.status === "on_mission" || unit.status === "returning" || !isAtBase;
    if (shouldBeAirborne && unit.movement.state === "stationary") {
      return {
        ...unit,
        movement: {
          ...unit.movement,
          state: "airborne",
          speed: unit.movement.speed || 420,
        },
      };
    }
  }
  return unit;
}

export function perMinuteFuelDrain(unit: Unit, phase: ScenarioPhase): number {
  return perHourFuelDrain(unit, phase) / 60;
}

export function perHourFuelDrain(unit: Unit, phase: ScenarioPhase): number {
  switch (unit.category) {
    case "aircraft":
      if (unit.movement.state === "airborne" || unit.status === "on_mission") {
        return FUEL_DRAIN_RATE[phase] ?? 0.5;
      }
      return 0;
    case "drone":
      if (unit.movement.state === "airborne" || unit.status === "on_mission") {
        return (FUEL_DRAIN_RATE[phase] ?? 0.5) * 0.3;
      }
      return 0;
    case "ground_vehicle":
      return unit.movement.state === "moving" ? 2 : 0;
    case "air_defense":
      return unit.movement.state === "moving" ? 2 : 0;
    case "radar":
      return 0;
  }
}

function distanceDeg(a: GeoPosition, b: GeoPosition): number {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function advanceMovement(unit: Unit, hoursElapsed: number = 1): Unit {
  if (unit.movement.state !== "moving" && unit.movement.state !== "airborne") {
    return unit;
  }
  const dest = unit.movement.destination;
  if (!isGeoPosition(dest)) return unit;

  // knots = nautical miles per hour. 
  // 1 degree latitude is approx 60 nautical miles.
  // We use a simplified deg per hour for this simulation.
  const stepDeg = unit.movement.speed * KNOTS_TO_DEG_PER_HOUR * hoursElapsed;
  const currentPos = unit.position || { lat: 0, lng: 0 };
  const remaining = distanceDeg(currentPos, dest);

  if (stepDeg >= remaining || remaining < 1e-4) {
    return {
      ...unit,
      position: { lat: dest.lat, lng: dest.lng },
      movement: { ...unit.movement, state: "stationary", speed: 0, destination: undefined },
    } as any;
  }

  const ratio = stepDeg / remaining;
  const nextPos = {
    lat: currentPos.lat + (dest.lat - currentPos.lat) * ratio,
    lng: currentPos.lng + (dest.lng - currentPos.lng) * ratio,
  };

  return {
    ...unit,
    position: nextPos,
  } as any;
}
