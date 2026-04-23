import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { FixedMilitaryAsset, ProtectedAsset } from "@/types/overlay";

export interface CoverageRingInput {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
}

export interface OverlapZone {
  geometry: Feature<Polygon | MultiPolygon>;
  depth: number;
  centroid: [number, number];
}

export interface CoverageResult {
  overlapZones: OverlapZone[];
  uncoveredAssets: ProtectedAsset[];
  coverageScore: number;
  coveredCount: number;
  totalCritical: number;
}

const PRIORITY_WEIGHT: Record<ProtectedAsset["priority"], number> = {
  critical: 4,
  high: 2,
  medium: 1,
  low: 0.5,
};

function makeCircle(lat: number, lng: number, radiusKm: number): Feature<Polygon> {
  return turf.circle([lng, lat], radiusKm, { steps: 64, units: "kilometers" });
}

function pointInAnyRing(asset: ProtectedAsset, rings: CoverageRingInput[]): boolean {
  const pt = turf.point([asset.position.lng, asset.position.lat]);
  return rings.some((r) => {
    const circle = makeCircle(r.lat, r.lng, r.radiusKm);
    return turf.booleanPointInPolygon(pt, circle);
  });
}

export function buildRings(assets: FixedMilitaryAsset[]): CoverageRingInput[] {
  const COLOR_MAP: Record<string, string> = {
    army_regiment:    "#D7AB3A",
    marine_regiment:  "#22d3ee",
    naval_base:       "#2563eb",
    airport_civilian: "#94a3b8",
    ammo_depot:       "#D9192E",
  };
  return assets
    .filter((a) => a.areaOfResponsibilityKm)
    .map((a) => ({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      radiusKm: a.areaOfResponsibilityKm!,
      color: COLOR_MAP[a.type] ?? "#94a3b8",
    }));
}

export function calculateOverlaps(rings: CoverageRingInput[]): OverlapZone[] {
  if (rings.length < 2) return [];

  const circles = rings.map((r) => makeCircle(r.lat, r.lng, r.radiusKm));
  const result: OverlapZone[] = [];

  // Check all pairs; track which base circles we've already combined for depth counting
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      let intersection: Feature<Polygon | MultiPolygon> | null = null;
      try {
        intersection = turf.intersect(
          turf.featureCollection([circles[i], circles[j]])
        );
      } catch {
        continue;
      }
      if (!intersection) continue;

      // Count total depth: how many rings cover any point in this intersection
      const centroidPt = turf.centroid(intersection);
      const depth = circles.filter((c) =>
        turf.booleanPointInPolygon(centroidPt, c)
      ).length;

      result.push({
        geometry: intersection,
        depth,
        centroid: centroidPt.geometry.coordinates as [number, number],
      });
    }
  }

  // Deduplicate by merging regions with the same depth bucket
  // (keeps rendering simple — one polygon per unique pair is fine for our scale)
  return result;
}

export function findUncoveredAssets(
  protectedAssets: ProtectedAsset[],
  rings: CoverageRingInput[]
): ProtectedAsset[] {
  return protectedAssets.filter((a) => !pointInAnyRing(a, rings));
}

export function calculateCoverageScore(
  protectedAssets: ProtectedAsset[],
  rings: CoverageRingInput[]
): { score: number; coveredCount: number; totalCritical: number } {
  const critical = protectedAssets.filter((a) => a.priority === "critical" || a.priority === "high");
  if (critical.length === 0) return { score: 100, coveredCount: 0, totalCritical: 0 };

  let totalWeight = 0;
  let coveredWeight = 0;
  let coveredCount = 0;

  for (const asset of critical) {
    const w = PRIORITY_WEIGHT[asset.priority];
    totalWeight += w;
    if (pointInAnyRing(asset, rings)) {
      coveredWeight += w;
      coveredCount++;
    }
  }

  const score = totalWeight > 0 ? Math.round((coveredWeight / totalWeight) * 100) : 0;
  return { score, coveredCount, totalCritical: critical.length };
}

export function runCoverageAnalysis(
  assets: FixedMilitaryAsset[],
  protectedAssets: ProtectedAsset[]
): CoverageResult {
  const rings = buildRings(assets);
  const overlapZones = calculateOverlaps(rings);
  const uncoveredAssets = findUncoveredAssets(protectedAssets, rings);
  const { score, coveredCount, totalCritical } = calculateCoverageScore(protectedAssets, rings);
  return { overlapZones, uncoveredAssets, coverageScore: score, coveredCount, totalCritical };
}
