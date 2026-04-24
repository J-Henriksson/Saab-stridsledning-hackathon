import { describe, expect, it } from "vitest";
import {
  AIR_COMMAND_BASES,
  AIR_COMMAND_SCENARIO,
  AIR_COMMAND_SUPPORT_UNITS,
} from "./airCommandScenario";

describe("air command scenario", () => {
  it("matches the requested Baltic scenario shape", () => {
    expect(AIR_COMMAND_SCENARIO.bases).toHaveLength(4);
    expect(AIR_COMMAND_SCENARIO.aircraft).toHaveLength(12);
    expect(AIR_COMMAND_SCENARIO.radarStations).toHaveLength(2);
    expect(AIR_COMMAND_SCENARIO.airDefenseBatteries).toHaveLength(2);
  });

  it("keeps every aircraft tied to a home base", () => {
    expect(AIR_COMMAND_SCENARIO.aircraft.every((aircraft) => Boolean(aircraft.homeBaseId))).toBe(true);
  });

  it("builds map-ready bases and support units", () => {
    expect(AIR_COMMAND_BASES).toHaveLength(4);
    expect(AIR_COMMAND_SUPPORT_UNITS).toHaveLength(4);
    expect(AIR_COMMAND_BASES.every((base) => base.icaoCode && base.hangarCapacity && base.rampCapacity)).toBe(true);
  });
});
