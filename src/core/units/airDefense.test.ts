import { describe, expect, it } from "vitest";
import { createAirDefenseUnit } from "./factory";
import { getAirDefenseRangeProfile } from "./airDefense";

describe("getAirDefenseRangeProfile", () => {
  it("uses unit capacity and condition to scale the effective ranges", () => {
    const unit = createAirDefenseUnit({
      name: "Patriot Battery",
      type: "SAM_LONG",
      position: { lat: 59, lng: 18 },
      currentBase: null,
      loadedMissiles: 4,
      maxMissiles: 8,
    });

    const profile = getAirDefenseRangeProfile({
      ...unit,
      health: 80,
      fuel: 60,
      operationalStatus: "standby",
    });

    expect(profile.capacityFactor).toBe(0.5);
    expect(profile.readinessPercent).toBeGreaterThan(50);
    expect(profile.effectiveEngagementRange).toBeLessThan(unit.engagementRange);
    expect(profile.effectiveEngagementRange).toBeGreaterThan(0);
    expect(profile.effectiveDetectionRange).toBeLessThan(unit.detectionRange);
  });

  it("collapses engagement range when the launcher is empty", () => {
    const unit = createAirDefenseUnit({
      name: "Empty Battery",
      type: "SAM_MEDIUM",
      position: { lat: 59, lng: 18 },
      currentBase: null,
      loadedMissiles: 0,
      maxMissiles: 8,
    });

    const profile = getAirDefenseRangeProfile(unit);

    expect(profile.capacityFactor).toBe(0);
    expect(profile.effectiveEngagementRange).toBe(0);
    expect(profile.effectiveDetectionRange).toBeGreaterThan(0);
  });

  it("heavily reduces coverage while stowed or relocating", () => {
    const unit = createAirDefenseUnit({
      name: "Moving Battery",
      type: "SAM_SHORT",
      position: { lat: 59, lng: 18 },
      currentBase: null,
    });

    const profile = getAirDefenseRangeProfile({
      ...unit,
      deployedState: "stowed",
      operationalStatus: "relocating",
    });

    expect(profile.readinessPercent).toBeLessThan(50);
    expect(profile.effectiveEngagementRange).toBeLessThan(unit.engagementRange / 2);
    expect(profile.effectiveDetectionRange).toBeLessThan(unit.detectionRange);
  });
});
