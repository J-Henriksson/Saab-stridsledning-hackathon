import { describe, it, expect } from "vitest";
import { generatePatrolTrack, tickPlainPatrol } from "./patrol";
import { haversineDistance } from "@/utils/geoDistance";
import { isInsideAnyDisc } from "@/core/intel/visibility";

describe("generatePatrolTrack", () => {
  it("produces a closed orbit within the disc", () => {
    const patrol = { center: { lat: 58.5, lng: 19.7 }, radiusKm: 80, speedKts: 400 };
    const track = generatePatrolTrack(patrol);
    expect(track.length).toBeGreaterThanOrEqual(16);
    // Every point within (radius * 1.05) of centre.
    for (const p of track) {
      const km = haversineDistance(p, patrol.center) / 1000;
      expect(km).toBeLessThanOrEqual(patrol.radiusKm * 1.05);
    }
    // Closed loop: first and last points are close to each other after wrap.
    const wrap = haversineDistance(track[0], track[track.length - 1]) / 1000;
    expect(wrap).toBeLessThan(patrol.radiusKm);
  });

  it("is deterministic — same input produces same track", () => {
    const patrol = { center: { lat: 60, lng: 18 }, radiusKm: 50, speedKts: 200, axisDeg: 45 };
    const t1 = generatePatrolTrack(patrol);
    const t2 = generatePatrolTrack(patrol);
    for (let i = 0; i < t1.length; i++) {
      expect(t1[i].lat).toBeCloseTo(t2[i].lat, 10);
      expect(t1[i].lng).toBeCloseTo(t2[i].lng, 10);
    }
  });
});

describe("tickPlainPatrol", () => {
  it("advances the leg index on arrival", () => {
    const patrol = { center: { lat: 60, lng: 18 }, radiusKm: 50, speedKts: 200 };
    const track = generatePatrolTrack(patrol);
    const item = {
      position: track[3],
      movement: { state: "stationary" as const, speed: 0 },
      patrol,
      patrolLegIdx: 3,
    };
    const next = tickPlainPatrol(item, "airborne");
    expect(next.patrolLegIdx).toBe(4);
    expect(next.movement.destination).toEqual(track[4]);
    expect(next.movement.state).toBe("airborne");
  });

  it("leaves an in-flight item alone", () => {
    const patrol = { center: { lat: 60, lng: 18 }, radiusKm: 50, speedKts: 200 };
    const item = {
      position: { lat: 60.1, lng: 18.2 },
      movement: { state: "moving" as const, speed: 200, destination: { lat: 60.3, lng: 18.4 } },
      patrol,
      patrolLegIdx: 5,
    };
    const next = tickPlainPatrol(item, "moving");
    expect(next).toBe(item);
  });
});

describe("isInsideAnyDisc", () => {
  it("returns true when position overlaps a single disc", () => {
    const discs = [{ id: "d1", center: { lat: 60, lng: 18 }, radiusKm: 100, sourceKind: "aircraft" as const }];
    expect(isInsideAnyDisc({ lat: 60.1, lng: 18.1 }, discs)).toBe(true);
  });

  it("returns false when outside all discs", () => {
    const discs = [{ id: "d1", center: { lat: 60, lng: 18 }, radiusKm: 50, sourceKind: "aircraft" as const }];
    expect(isInsideAnyDisc({ lat: 55, lng: 12 }, discs)).toBe(false);
  });

  it("unions multiple discs", () => {
    const discs = [
      { id: "d1", center: { lat: 60, lng: 18 }, radiusKm: 20, sourceKind: "aircraft" as const },
      { id: "d2", center: { lat: 55, lng: 12 }, radiusKm: 20, sourceKind: "aircraft" as const },
    ];
    expect(isInsideAnyDisc({ lat: 55.05, lng: 12.05 }, discs)).toBe(true);
    expect(isInsideAnyDisc({ lat: 60.05, lng: 18.05 }, discs)).toBe(true);
  });
});
