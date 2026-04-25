import type { GeoPosition, PatrolConfig, Unit } from "@/types/units";
import { isPositionInSea } from "./geoUtils";

// 111 km per degree of latitude (and per degree of longitude at the equator).
const KM_PER_DEG = 111;

const DEFAULT_TRACK_POINTS = 24;
const DEFAULT_ASPECT = 0.45;

/** Convert km offset (dLat km, dLng km) to degree offset at latitude `lat`. */
function kmOffsetToDegrees(lat: number, dLatKm: number, dLngKm: number): { dLat: number; dLng: number } {
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  return { dLat: dLatKm / KM_PER_DEG, dLng: dLngKm / (KM_PER_DEG * cosLat) };
}

/**
 * Generate a deterministic elliptical racetrack orbit around the patrol centre.
 * The major axis sits along `axisDeg` (0 = N-S, 90 = E-W). Clockwise by default.
 *
 * Returns `points` equally-spaced positions around the ellipse — smooth enough
 * that `advanceMovement` (linear interp between points) still looks curved.
 */
export function generatePatrolTrack(
  patrol: PatrolConfig,
  points: number = DEFAULT_TRACK_POINTS,
): GeoPosition[] {
  const axisRad = ((patrol.axisDeg ?? 0) * Math.PI) / 180;
  const clockwise = patrol.clockwise ?? true;
  const aspect = patrol.aspect ?? DEFAULT_ASPECT;
  const majorKm = patrol.radiusKm;
  const minorKm = patrol.radiusKm * aspect;

  const cosAxis = Math.cos(axisRad);
  const sinAxis = Math.sin(axisRad);

  const track: GeoPosition[] = [];
  for (let i = 0; i < points; i++) {
    // parametric angle (inverted when counter-clockwise)
    const t = (i / points) * Math.PI * 2 * (clockwise ? 1 : -1);
    // ellipse in local axis frame (x = major, y = minor)
    const localX = majorKm * Math.cos(t);
    const localY = minorKm * Math.sin(t);
    // rotate by axis — axisDeg measures CW from north, so (dNorth, dEast)
    const dNorthKm = localX * cosAxis - localY * sinAxis;
    const dEastKm  = localX * sinAxis + localY * cosAxis;
    const { dLat, dLng } = kmOffsetToDegrees(patrol.center.lat, dNorthKm, dEastKm);
    track.push({ lat: patrol.center.lat + dLat, lng: patrol.center.lng + dLng });
  }
  return track;
}

/** Return the nearest track index to `pos` — used to snap a freshly-spawned
 *  unit onto its orbit. */
function nearestTrackIdx(track: GeoPosition[], pos: GeoPosition): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < track.length; i++) {
    const dLat = track[i].lat - pos.lat;
    const dLng = track[i].lng - pos.lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function movementStateForUnit(u: Unit): "airborne" | "moving" {
  return u.category === "aircraft" || u.category === "drone" ? "airborne" : "moving";
}

/**
 * Advance the unit along its racetrack orbit.
 *   • If the unit hasn't started its orbit yet (no leg idx, no destination),
 *     snap onto the nearest track point and head for the next.
 *   • If it has arrived at its current destination, step to the next track
 *     point (wrapping the index).
 *   • If it's mid-leg, do nothing — let advanceMovement finish the segment.
 */
export function tickPatrol(unit: Unit): Unit {
  if (!unit.patrol) return unit;
  if (unit.pendingArrivalBase) return unit;
  // ATO-managed / rebasing flights override patrol control.
  if (unit.category === "aircraft") {
    if (unit.missionEndHour !== undefined || unit.rebaseTarget !== undefined) return unit;
  }
  // Dedicated waypoint-driven drones (e.g. SKYM-11 with explicit waypoints).
  if (unit.category === "drone" && unit.waypoints.length > 0) return unit;

  const track = generatePatrolTrack(unit.patrol);
  const hasConcreteDest =
    (unit.movement.state === "moving" || unit.movement.state === "airborne") &&
    unit.movement.destination &&
    typeof unit.movement.destination === "object" &&
    "lat" in unit.movement.destination;
  if (hasConcreteDest) return unit;

  const currentIdx = unit.patrolLegIdx ?? nearestTrackIdx(track, unit.position);
  let nextIdx = (currentIdx + 1) % track.length;

  // For naval units, skip waypoints on land
  if (unit.category === "naval") {
    let attempts = 0;
    while (!isPositionInSea(track[nextIdx]) && attempts < track.length) {
      nextIdx = (nextIdx + 1) % track.length;
      attempts++;
    }
  }

  return {
    ...unit,
    patrolLegIdx: nextIdx,
    movement: {
      ...unit.movement,
      state: movementStateForUnit(unit),
      speed: unit.patrol.speedKts,
      destination: track[nextIdx],
    },
  } as Unit;
}

/** Plain-object variant for naval units (not in the Unit union). */
export interface PatrollableShape {
  position: GeoPosition;
  movement: Unit["movement"];
  patrol: PatrolConfig;
  patrolLegIdx?: number;
}

export function tickPlainPatrol<T extends PatrollableShape>(
  item: T,
  movementVerb: "moving" | "airborne",
  seaOnly: boolean = false,
): T {
  const track = generatePatrolTrack(item.patrol);
  const hasConcreteDest =
    (item.movement.state === "moving" || item.movement.state === "airborne") &&
    item.movement.destination &&
    typeof item.movement.destination === "object" &&
    "lat" in item.movement.destination;
  if (hasConcreteDest) return item;

  const currentIdx = item.patrolLegIdx ?? nearestTrackIdx(track, item.position);
  let nextIdx = (currentIdx + 1) % track.length;

  // Skip points on land if seaOnly is true
  if (seaOnly) {
    let attempts = 0;
    while (!isPositionInSea(track[nextIdx]) && attempts < track.length) {
      nextIdx = (nextIdx + 1) % track.length;
      attempts++;
    }
  }

  return {
    ...item,
    patrolLegIdx: nextIdx,
    movement: {
      ...item.movement,
      state: movementVerb,
      speed: item.patrol.speedKts,
      destination: track[nextIdx],
    },
  };
}
