import type { Unit, AircraftUnit, DroneUnit, GeoPosition } from "@/types/units";
import { isAircraft, isDrone } from "@/types/units";
import type { AircraftType } from "@/types/game";
import { AIRCRAFT_SPECS } from "@/data/config/unitSpecs";
import { haversineDistance } from "@/utils/geoDistance";

export type CruiseMode = "eco" | "cruise" | "dash";
export type PayloadMod = "none" | "light" | "heavy";

/** Cruise-mode multipliers — eco buys range, dash buys speed. */
const CRUISE_MULTIPLIERS: Record<CruiseMode, { range: number; speed: number }> = {
  eco:    { range: 1.15, speed: 0.85 },
  cruise: { range: 1.00, speed: 1.00 },
  dash:   { range: 0.75, speed: 1.20 },
};

/** Payload weight modifiers (mock — units don't track payload weight). */
const PAYLOAD_MULTIPLIERS: Record<PayloadMod, number> = {
  none:  1.05,
  light: 1.00,
  heavy: 0.85,
};

export interface TravelRangeOptions {
  /** Fuel reserve held back (0–1, default 0.10). */
  reservePct: number;
  cruiseMode: CruiseMode;
  payload: PayloadMod;
}

export const DEFAULT_TRAVEL_OPTS: TravelRangeOptions = {
  reservePct: 0.10,
  cruiseMode: "cruise",
  payload: "light",
};

export interface TravelRangeResult {
  /** Effective max one-way distance in km from current position. */
  maxRangeKm: number;
  /** Effective cruise speed in knots. */
  cruiseSpeedKts: number;
  /** Hours of flight at the effective cruise speed before bingo. */
  enduranceHours: number;
}

/** Returns true iff this unit is supported by the travel-range feature. */
export function isTravelRangeUnit(unit: Unit): unit is AircraftUnit | DroneUnit {
  return isAircraft(unit) || isDrone(unit);
}

/** Spec used for the unit (aircraft type lookup, or drone's per-instance fields). */
function getBaseSpec(unit: AircraftUnit | DroneUnit): { maxRangeKm: number; cruiseSpeedKts: number } {
  if (isAircraft(unit)) {
    const spec = AIRCRAFT_SPECS[unit.type as AircraftType];
    return spec ?? { maxRangeKm: 2000, cruiseSpeedKts: 450 };
  }
  // Drone — speed comes from rangeKm / enduranceHours, fall back to a minimum.
  const speedKmh = unit.enduranceHours > 0 ? unit.rangeKm / unit.enduranceHours : 80;
  const speedKts = Math.max(60, speedKmh / 1.852);
  return { maxRangeKm: unit.rangeKm, cruiseSpeedKts: speedKts };
}

export function computeTravelRange(
  unit: AircraftUnit | DroneUnit,
  opts: TravelRangeOptions = DEFAULT_TRAVEL_OPTS
): TravelRangeResult {
  const base = getBaseSpec(unit);
  const fuelFrac = Math.max(0, Math.min(1, (unit.fuel ?? 0) / 100));
  const usable = Math.max(0, fuelFrac - Math.max(0, Math.min(0.5, opts.reservePct)));

  const cruise = CRUISE_MULTIPLIERS[opts.cruiseMode];
  const payloadMul = PAYLOAD_MULTIPLIERS[opts.payload];

  const maxRangeKm = base.maxRangeKm * usable * cruise.range * payloadMul;
  const cruiseSpeedKts = base.cruiseSpeedKts * cruise.speed;
  const cruiseSpeedKmh = cruiseSpeedKts * 1.852;
  const enduranceHours = cruiseSpeedKmh > 0 ? maxRangeKm / cruiseSpeedKmh : 0;

  return { maxRangeKm, cruiseSpeedKts, enduranceHours };
}

/** Format hours as Hh MMm. */
export function formatHoursMinutes(h: number): string {
  if (!isFinite(h) || h <= 0) return "0h 00m";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}h ${mm.toString().padStart(2, "0")}m`;
}

/**
 * Build a GeoJSON polygon approximating the ellipse of all points P where
 * dist(focus1, P) + dist(P, focus2) ≤ sumDistanceKm. Used for the
 * "where can I go and still make it back to base" reachable region.
 *
 * If sumDistanceKm < dist(focus1, focus2), returns an empty (degenerate) feature.
 */
export function createEllipseGeoJSON(
  focus1: GeoPosition,
  focus2: GeoPosition,
  sumDistanceKm: number,
  steps: number = 96
): GeoJSON.Feature<GeoJSON.Polygon> {
  const fociDistKm = haversineDistance(focus1, focus2) / 1000;
  if (sumDistanceKm <= fociDistKm + 0.001) {
    // No reachable round-trip — return a tiny degenerate polygon at midpoint.
    const mid = {
      lat: (focus1.lat + focus2.lat) / 2,
      lng: (focus1.lng + focus2.lng) / 2,
    };
    return {
      type: "Feature",
      properties: { reachable: false },
      geometry: { type: "Polygon", coordinates: [[
        [mid.lng, mid.lat], [mid.lng, mid.lat], [mid.lng, mid.lat], [mid.lng, mid.lat],
      ]] },
    };
  }

  // Local equirectangular projection (km per degree at the midpoint latitude).
  const midLat = (focus1.lat + focus2.lat) / 2;
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((midLat * Math.PI) / 180);

  // Convert foci to local km coords.
  const f1 = { x: focus1.lng * kmPerDegLng, y: focus1.lat * kmPerDegLat };
  const f2 = { x: focus2.lng * kmPerDegLng, y: focus2.lat * kmPerDegLat };

  // Ellipse geometry in local km space.
  const cx = (f1.x + f2.x) / 2;
  const cy = (f1.y + f2.y) / 2;
  const dx = f2.x - f1.x;
  const dy = f2.y - f1.y;
  const focal = Math.sqrt(dx * dx + dy * dy);  // 2c
  const cAxis = focal / 2;
  const aAxis = sumDistanceKm / 2;
  const bAxis = Math.sqrt(Math.max(0, aAxis * aAxis - cAxis * cAxis));
  const rot = Math.atan2(dy, dx);

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const lx = aAxis * Math.cos(t);
    const ly = bAxis * Math.sin(t);
    // Rotate then translate.
    const rx = lx * Math.cos(rot) - ly * Math.sin(rot) + cx;
    const ry = lx * Math.sin(rot) + ly * Math.cos(rot) + cy;
    // Back to lng/lat.
    const lng = rx / kmPerDegLng;
    const lat = ry / kmPerDegLat;
    coords.push([lng, lat]);
  }

  return {
    type: "Feature",
    properties: { reachable: true },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

/** Direct ETA to a point at cruise speed (hours). */
export function etaHoursTo(from: GeoPosition, to: GeoPosition, cruiseSpeedKts: number): number {
  const km = haversineDistance(from, to) / 1000;
  const speedKmh = cruiseSpeedKts * 1.852;
  return speedKmh > 0 ? km / speedKmh : 0;
}
