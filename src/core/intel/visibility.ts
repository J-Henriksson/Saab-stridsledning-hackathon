import type { GameState, EnemyBase, NavalUnit } from "@/types/game";
import type { Unit } from "@/types/units";
import { isRadar, isAircraft, isDrone } from "@/types/units";
import { haversineDistance } from "@/utils/geoDistance";
import { DEMO_RADAR_UNITS } from "@/data/radarUnits";

export interface SensorDisc {
  id: string;
  center: { lat: number; lng: number };
  /** radius in kilometres */
  radiusKm: number;
  sourceKind: "ground_radar" | "aircraft" | "drone";
}

const AIRCRAFT_DEFAULT_SENSOR_KM = 180;
const DRONE_DEFAULT_SENSOR_KM = 60;

function discFromUnit(u: Unit): SensorDisc | null {
  if (u.affiliation !== "friend") return null;
  if (isRadar(u)) {
    if (!u.emitting) return null;
    return {
      id: u.id,
      center: u.position,
      radiusKm: 120,
      sourceKind: "ground_radar",
    };
  }
  if (isAircraft(u)) {
    if (u.movement.state !== "airborne" && u.status !== "on_mission") return null;
    return {
      id: u.id,
      center: u.position,
      radiusKm: AIRCRAFT_DEFAULT_SENSOR_KM,
      sourceKind: "aircraft",
    };
  }
  if (isDrone(u)) {
    if (u.movement.state !== "airborne" && u.movement.state !== "moving") return null;
    return {
      id: u.id,
      center: u.position,
      radiusKm: u.sensorRangeKm ?? DRONE_DEFAULT_SENSOR_KM,
      sourceKind: "drone",
    };
  }
  return null;
}

/**
 * Union of all friendly sensor coverage discs: fixed radars (DEMO_RADAR_UNITS),
 * ground/deployed radars on Units, airborne aircraft, and airborne drones.
 */
export function computeFriendlySensorCoverage(state: GameState): SensorDisc[] {
  const discs: SensorDisc[] = [];

  // Fixed wide-area radars (from radarUnits.ts). rangeRadius is in METRES.
  for (const r of DEMO_RADAR_UNITS) {
    if (r.status !== "operational") continue;
    discs.push({
      id: r.id,
      center: r.position,
      radiusKm: r.rangeRadius / 1000,
      sourceKind: "ground_radar",
    });
  }

  // All units in `deployedUnits` + in-base units (for base-held radars).
  for (const u of state.deployedUnits) {
    const d = discFromUnit(u);
    if (d) discs.push(d);
  }
  for (const b of state.bases) {
    for (const u of b.units) {
      const d = discFromUnit(u);
      if (d) discs.push(d);
    }
  }

  return discs;
}

/** km distance between `pos` and any disc centre <= disc.radiusKm. */
export function isInsideAnyDisc(
  pos: { lat: number; lng: number },
  discs: SensorDisc[],
): boolean {
  for (const d of discs) {
    const meters = haversineDistance(pos, d.center);
    if (meters / 1000 <= d.radiusKm) return true;
  }
  return false;
}

export interface EnemyVisibility<T> {
  /** Currently lit by a friendly sensor. Render at full opacity. */
  visible: T[];
  /** Previously seen (lastKnownPosition set) but now out-of-coverage. Render faded. */
  lastKnown: T[];
  /** Never seen — hidden from the map. */
  hidden: T[];
}

/** Naval units are hostile OR friendly; for the fog-of-war split, only hostile
 *  vessels are gated. Friendly pickets are always visible. */
export function detectNavalUnits(
  state: GameState,
  discs?: SensorDisc[],
): EnemyVisibility<NavalUnit> {
  const d = discs ?? computeFriendlySensorCoverage(state);
  const result: EnemyVisibility<NavalUnit> = { visible: [], lastKnown: [], hidden: [] };
  for (const n of state.navalUnits) {
    if (n.affiliation === "friend") {
      result.visible.push(n); // friendlies are not fog-gated
      continue;
    }
    if (isInsideAnyDisc(n.position, d)) {
      result.visible.push(n);
    } else if (n.lastKnownPosition) {
      result.lastKnown.push(n);
    } else {
      result.hidden.push(n);
    }
  }
  return result;
}

export function detectEnemyBases(
  state: GameState,
  discs?: SensorDisc[],
): EnemyVisibility<EnemyBase> {
  const d = discs ?? computeFriendlySensorCoverage(state);
  const result: EnemyVisibility<EnemyBase> = { visible: [], lastKnown: [], hidden: [] };
  for (const b of state.enemyBases) {
    if (isInsideAnyDisc(b.coords, d)) result.visible.push(b);
    else result.hidden.push(b);
  }
  return result;
}

export function detectEnemyEntities(
  state: GameState,
  discs?: SensorDisc[],
): EnemyVisibility<(typeof state.enemyEntities)[number]> {
  const d = discs ?? computeFriendlySensorCoverage(state);
  const result: EnemyVisibility<(typeof state.enemyEntities)[number]> = { visible: [], lastKnown: [], hidden: [] };
  for (const e of state.enemyEntities) {
    if (isInsideAnyDisc(e.coords, d)) result.visible.push(e);
    else result.hidden.push(e);
  }
  return result;
}
