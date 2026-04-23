import { describe, it, expect } from "vitest";
import type { Base } from "@/types/game";
import type { Unit } from "@/types/units";
import { canStoreUnit, recomputeZoneOccupancy } from "./capacity";

function makeBase(overrides: Partial<Base> = {}): Base {
  return {
    id: "MOB",
    name: "Test MOB",
    type: "huvudbas",
    units: [],
    spareParts: [],
    personnel: [],
    fuel: 100,
    maxFuel: 100,
    ammunition: [],
    maintenanceBays: { total: 2, occupied: 0 },
    zones: [
      { id: "z1", type: "parking", capacity: 2, currentQueue: [], assignedWork: [], resourceStock: {} },
    ],
    ...overrides,
  } as Base;
}

function makeAircraft(id: string): Unit {
  return {
    id,
    category: "aircraft",
    type: "GripenE",
    tailNumber: id,
    name: id,
    affiliation: "friend",
    sidc: "10031000001103000000",
    health: 100,
    position: { lat: 0, lng: 0 },
    movement: { state: "stationary", speed: 0 },
    currentBase: "MOB",
    lastBase: "MOB",
    status: "ready",
    flightHours: 0,
    hoursToService: 100,
    fuel: 100,
  } as Unit;
}

function makeGroundVehicle(id: string): Unit {
  return {
    id,
    category: "ground_vehicle",
    type: "LOGISTICS_TRUCK",
    name: id,
    affiliation: "friend",
    sidc: "10061000001211000000",
    health: 100,
    position: { lat: 0, lng: 0 },
    movement: { state: "stationary", speed: 0 },
    currentBase: "MOB",
    lastBase: "MOB",
    fuel: 100,
    roadSpeed: 40,
  } as Unit;
}

describe("canStoreUnit", () => {
  it("allows infrastructure-gated unit when zone has room", () => {
    const base = makeBase();
    expect(canStoreUnit(base, makeAircraft("a1")).ok).toBe(true);
  });

  it("blocks infrastructure-gated unit when zone is full", () => {
    const base = makeBase({ units: [makeAircraft("a1"), makeAircraft("a2")] });
    const result = canStoreUnit(base, makeAircraft("a3"));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/full/i);
  });

  it("always allows non-gated unit (ground vehicle)", () => {
    const base = makeBase({ units: [makeAircraft("a1"), makeAircraft("a2")] });
    expect(canStoreUnit(base, makeGroundVehicle("t1")).ok).toBe(true);
  });

  it("reports missing zone for a gated unit when the base has no matching zone", () => {
    const base = makeBase({ zones: [] });
    const result = canStoreUnit(base, makeAircraft("a1"));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/parking/i);
  });
});

describe("recomputeZoneOccupancy", () => {
  it("sets zone.currentQueue to ids of gated units in that zone", () => {
    const base = makeBase({
      units: [makeAircraft("a1"), makeAircraft("a2"), makeGroundVehicle("t1")],
    });
    const recomputed = recomputeZoneOccupancy(base);
    const parking = recomputed.zones.find(z => z.type === "parking")!;
    expect(parking.currentQueue).toHaveLength(2);
    expect(parking.currentQueue).toContain("a1");
    expect(parking.currentQueue).toContain("a2");
  });
});
