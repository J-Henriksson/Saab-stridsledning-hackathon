import { describe, it, expect } from "vitest";
import {
  enforceAirborneInvariant,
  advanceMovement,
  perHourFuelDrain,
} from "./movement";
import {
  createAircraftUnit,
  createGroundVehicleUnit,
  createAirDefenseUnit,
} from "./factory";

describe("enforceAirborneInvariant", () => {
  it("forces stationary in-field aircraft to airborne", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1",
      type: "GripenE",
      position: { lat: 0, lng: 0 },
      currentBase: "MOB",
    });
    const corrected = enforceAirborneInvariant(aircraft, false);
    expect(corrected.movement.state).toBe("airborne");
  });

  it("leaves at-base aircraft stationary", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1",
      type: "GripenE",
      position: { lat: 0, lng: 0 },
      currentBase: "MOB",
    });
    const corrected = enforceAirborneInvariant(aircraft, true);
    expect(corrected.movement.state).toBe("stationary");
  });

  it("does not touch ground vehicles in the field", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: null,
    });
    const corrected = enforceAirborneInvariant(v, false);
    expect(corrected.movement.state).toBe("stationary");
  });
});

describe("perHourFuelDrain", () => {
  it("drains fuel for airborne aircraft at phase rate", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1", type: "GripenE",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    aircraft.movement = { state: "airborne", speed: 400 };
    expect(perHourFuelDrain(aircraft, "KRIG")).toBeGreaterThan(0);
  });

  it("drains zero for stationary ground vehicle", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    expect(perHourFuelDrain(v, "KRIG")).toBe(0);
  });

  it("drains >0 for moving ground vehicle", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    v.movement = { state: "moving", speed: 40 };
    expect(perHourFuelDrain(v, "KRIG")).toBeGreaterThan(0);
  });

  it("drains zero for emplaced air defense", () => {
    const ad = createAirDefenseUnit({
      name: "S1", type: "SAM_LONG",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    expect(perHourFuelDrain(ad, "KRIG")).toBe(0);
  });
});

describe("advanceMovement", () => {
  it("moves a moving unit toward destination", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 58.0, lng: 15.0 }, currentBase: null,
    });
    v.movement = { state: "moving", speed: 30, destination: { lat: 58.5, lng: 15.0 } };
    const moved = advanceMovement(v);
    expect(moved.position.lat).toBeGreaterThan(58.0);
    expect(moved.position.lat).toBeLessThanOrEqual(58.5);
  });

  it("snaps to destination and becomes stationary on arrival", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 58.0, lng: 15.0 }, currentBase: null,
    });
    v.movement = { state: "moving", speed: 500, destination: { lat: 58.0001, lng: 15.0001 } };
    const moved = advanceMovement(v);
    expect(moved.position.lat).toBe(58.0001);
    expect(moved.position.lng).toBe(15.0001);
    expect(moved.movement.state).toBe("stationary");
  });
});
