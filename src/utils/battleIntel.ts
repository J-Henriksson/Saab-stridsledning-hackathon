import * as turf from "@turf/turf";
import type { GeoPosition } from "@/types/units";
import type { EnemyBase, EnemyEntity, BaseType } from "@/types/game";
import { haversineDistance } from "@/utils/geoDistance";

export type Reachability = "strike_return" | "strike_only" | "out_of_reach";

export interface ThreatRing {
  id: string;
  name: string;
  category: "sam_site" | "sam_launcher" | "radar";
  /** Detection vs. engagement — drives warning severity. */
  kind: "engagement" | "detection";
  center: GeoPosition;
  radiusKm: number;
}

/** Default coverage for sam_launchers when no explicit ring data is stored. */
const DEFAULT_SAM_LAUNCHER_RADIUS_KM = 60;
/** Default detection coverage for radars when no explicit ring is stored. */
const DEFAULT_RADAR_RADIUS_KM = 200;

/**
 * Pulls all hostile threat rings (SAM engagement + radar detection) from world state.
 */
export function collectThreatRings(
  enemyBases: EnemyBase[],
  enemyEntities: EnemyEntity[]
): ThreatRing[] {
  const rings: ThreatRing[] = [];

  for (const eb of enemyBases) {
    if (eb.operationalStatus === "destroyed") continue;
    if (eb.category === "sam_site" && (eb.threatRangeKm ?? 0) > 0) {
      rings.push({
        id: `eb_${eb.id}`,
        name: eb.name,
        category: "sam_site",
        kind: "engagement",
        center: eb.coords,
        radiusKm: eb.threatRangeKm ?? 0,
      });
    } else if (eb.category === "radar") {
      rings.push({
        id: `eb_${eb.id}`,
        name: eb.name,
        category: "radar",
        kind: "detection",
        center: eb.coords,
        radiusKm: eb.threatRangeKm ?? DEFAULT_RADAR_RADIUS_KM,
      });
    }
  }

  for (const ee of enemyEntities) {
    if (ee.operationalStatus === "destroyed") continue;
    if (ee.category === "sam_launcher") {
      rings.push({
        id: `ee_${ee.id}`,
        name: ee.name,
        category: "sam_launcher",
        kind: "engagement",
        center: ee.coords,
        radiusKm: DEFAULT_SAM_LAUNCHER_RADIUS_KM,
      });
    }
  }

  return rings;
}

export interface TargetClassification {
  reachability: Reachability;
  oneWayKm: number;
  /** Round-trip distance via the chosen return base (only when given). */
  roundTripKm?: number;
  /** True if the unit's current fuel is enough to make the strike one-way. */
  withinOneWay: boolean;
  /** True if the round-trip is feasible (only meaningful with returnBase). */
  withinRoundTrip: boolean;
}

export function classifyTarget(
  unit: GeoPosition,
  target: GeoPosition,
  maxRangeKm: number,
  returnBase?: GeoPosition | null
): TargetClassification {
  const oneWayKm = haversineDistance(unit, target) / 1000;
  const withinOneWay = oneWayKm <= maxRangeKm;

  let roundTripKm: number | undefined;
  let withinRoundTrip = false;
  if (returnBase) {
    const legBack = haversineDistance(target, returnBase) / 1000;
    roundTripKm = oneWayKm + legBack;
    withinRoundTrip = roundTripKm <= maxRangeKm;
  }

  let reachability: Reachability;
  if (returnBase && withinRoundTrip) reachability = "strike_return";
  else if (withinOneWay) reachability = "strike_only";
  else reachability = "out_of_reach";

  return { reachability, oneWayKm, roundTripKm, withinOneWay, withinRoundTrip };
}

export interface PathThreatReport {
  crossings: ThreatRing[];
  engagementCrossings: ThreatRing[];
  detectionCrossings: ThreatRing[];
}

/**
 * Returns rings that the polyline (lng,lat,lng,lat,...) intersects.
 * `coords` is given as [{lng,lat}, ...].
 */
export function pathCrossesThreatRings(
  coords: GeoPosition[],
  rings: ThreatRing[]
): PathThreatReport {
  if (coords.length < 2 || rings.length === 0) {
    return { crossings: [], engagementCrossings: [], detectionCrossings: [] };
  }
  const line = turf.lineString(coords.map((c) => [c.lng, c.lat]));

  const crossings: ThreatRing[] = [];
  for (const ring of rings) {
    if (ring.radiusKm <= 0) continue;
    const ringPoly = turf.circle([ring.center.lng, ring.center.lat], ring.radiusKm, {
      steps: 64,
      units: "kilometers",
    });
    if (turf.booleanIntersects(line, ringPoly)) {
      crossings.push(ring);
    }
  }

  return {
    crossings,
    engagementCrossings: crossings.filter((r) => r.kind === "engagement"),
    detectionCrossings: crossings.filter((r) => r.kind === "detection"),
  };
}

export interface BestReturnBase {
  baseId: BaseType;
  totalKm: number;
  savedKm: number;
}

/**
 * Of all friendly bases, pick the one with the smallest round-trip total
 * (unit → target → base) that fits within `maxRangeKm`. Returns null when
 * no base is feasible. `currentBaseId` is used to compute `savedKm`.
 */
export function findBestReturnBase(
  unit: GeoPosition,
  target: GeoPosition,
  bases: { id: BaseType; coords: GeoPosition }[],
  maxRangeKm: number,
  currentBaseId?: BaseType | null
): BestReturnBase | null {
  if (bases.length === 0) return null;
  const oneWayKm = haversineDistance(unit, target) / 1000;

  let best: { id: BaseType; totalKm: number } | null = null;
  for (const b of bases) {
    const legBackKm = haversineDistance(target, b.coords) / 1000;
    const totalKm = oneWayKm + legBackKm;
    if (totalKm > maxRangeKm) continue;
    if (!best || totalKm < best.totalKm) best = { id: b.id, totalKm };
  }
  if (!best) return null;

  let savedKm = 0;
  if (currentBaseId) {
    const cur = bases.find((b) => b.id === currentBaseId);
    if (cur) {
      const curTotal = oneWayKm + haversineDistance(target, cur.coords) / 1000;
      savedKm = Math.max(0, curTotal - best.totalKm);
    }
  }

  return { baseId: best.id, totalKm: best.totalKm, savedKm };
}
