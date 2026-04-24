import { describe, expect, it } from "vitest";
import { gameReducer } from "@/core/engine";
import { initialGameState } from "@/data/initialGameState";
import { createAirDefenseUnit, createDroneUnit, createDeployedDroneUnit, createRadarUnit } from "@/core/units/factory";
import type { GameState } from "@/types/game";

function noWarnings(next: GameState, prev: GameState) {
  const added = next.events.slice(0, next.events.length - prev.events.length);
  const bad = added.find((e) => e.type === "warning" && e.message.startsWith("Ogiltigt"));
  if (bad) throw new Error(`reducer rejected action: ${bad.message}`);
}

describe("merged-feature integration smoke", () => {
  it("initial state seeds radar demo units, drones, and road base", () => {
    expect(initialGameState.deployedUnits.some((u) => u.category === "radar")).toBe(true);
    expect(initialGameState.deployedUnits.some((u) => u.category === "drone")).toBe(true);
    expect(initialGameState.roadBases.length).toBeGreaterThan(0);
    expect(initialGameState.overlayVisibility.radarUnits).toBe(true);
    expect(initialGameState.overlayVisibility.drones).toBe(true);
  });

  it("handles PR#3 road-base lifecycle", () => {
    let s = initialGameState;
    const before = s.roadBases.length;
    s = gameReducer(s, {
      type: "PLAN_ADD_ROAD_BASE",
      roadBase: {
        name: "ROB-TEST",
        coords: { lat: 60, lng: 18 },
        status: "Operativ",
        echelon: "Platoon",
        parentBaseId: "F16",
        isDraggable: true,
        rangeRadius: 12,
      },
    });
    expect(s.roadBases.length).toBe(before + 1);
    const added = s.roadBases[s.roadBases.length - 1];
    s = gameReducer(s, {
      type: "PLAN_UPDATE_COORDS_ROAD_BASE",
      id: added.id,
      coords: { lat: 61, lng: 19 },
    });
    expect(s.roadBases.find((r) => r.id === added.id)?.coords.lat).toBe(61);
    s = gameReducer(s, { type: "PLAN_DELETE_ROAD_BASE", id: added.id });
    expect(s.roadBases.length).toBe(before);
  });

  it("handles PR#1 friendly-unit placement and drone launch/recall", () => {
    const prev = initialGameState;
    const drone = createDroneUnit({
      name: "SMOKE-01",
      type: "ISR_DRONE",
      position: { lat: 60, lng: 18 },
      currentBase: "MOB",
    });
    let s = gameReducer(prev, { type: "PLAN_ADD_FRIENDLY_UNIT", unit: drone });
    noWarnings(s, prev);
    const placed = s.deployedUnits.find((u) => u.id === drone.id);
    expect(placed).toBeDefined();

    const airborneDrone = createDeployedDroneUnit({
      name: "SMOKE-AIR",
      type: "ISR_DRONE",
      position: { lat: 60, lng: 18 },
      currentBase: "MOB",
    });
    const s2Prev = { ...s, deployedUnits: [...s.deployedUnits, airborneDrone] };
    const s2 = gameReducer(s2Prev, {
      type: "LAUNCH_DRONE",
      droneId: airborneDrone.id,
      waypoints: [{ lat: 61, lng: 19, altitude: 3000 }],
    });
    noWarnings(s2, s2Prev);

    const s3 = gameReducer(s2, { type: "RECALL_DRONE", droneId: airborneDrone.id });
    noWarnings(s3, s2);
  });

  it("handles PR#4 air-defense deploy (places immediately, no airborne state)", () => {
    const ad = createAirDefenseUnit({
      name: "SAM-SMOKE",
      type: "SAM_MEDIUM",
      position: { lat: 59, lng: 18 },
      currentBase: "MOB",
    });
    const withAdAtBase: GameState = {
      ...initialGameState,
      bases: initialGameState.bases.map((b) =>
        b.id === "MOB" ? { ...b, units: [...b.units, ad] } : b
      ),
    };
    const next = gameReducer(withAdAtBase, {
      type: "DEPLOY_UNIT",
      unitId: ad.id,
      destination: { lat: 60, lng: 19 },
    });
    noWarnings(next, withAdAtBase);
    const deployed = next.deployedUnits.find((u) => u.id === ad.id);
    expect(deployed).toBeDefined();
    expect(deployed!.movement.state).toBe("stationary");
    expect(deployed!.position.lat).toBeCloseTo(60, 5);
  });

  it("toggles overlay visibility for all merged overlays", () => {
    const keys: (keyof typeof initialGameState.overlayVisibility)[] = [
      "radarUnits",
      "drones",
      "activeZones",
      "militaryBases",
    ];
    for (const key of keys) {
      const toggled = gameReducer(initialGameState, {
        type: "SET_OVERLAY_VISIBILITY",
        key,
        value: !initialGameState.overlayVisibility[key],
      });
      expect(toggled.overlayVisibility[key]).toBe(!initialGameState.overlayVisibility[key]);
    }
  });

  it("radar unit factory produces valid radar for friendly-unit placement", () => {
    const radar = createRadarUnit({
      name: "RAD-SMOKE",
      type: "SEARCH_RADAR",
      position: { lat: 60, lng: 18 },
      currentBase: "FOB_N",
    });
    const next = gameReducer(initialGameState, { type: "PLAN_ADD_FRIENDLY_UNIT", unit: radar });
    noWarnings(next, initialGameState);
    expect(next.deployedUnits.find((u) => u.id === radar.id)?.category).toBe("radar");
  });
});
