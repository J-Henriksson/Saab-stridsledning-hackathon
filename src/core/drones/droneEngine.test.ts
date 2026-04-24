import { describe, expect, it } from "vitest";
import { advanceDroneTick, updateDroneWaypoints } from "./droneEngine";
import { createDeployedDroneUnit, createDroneUnit } from "@/core/units/factory";
import { gameReducer } from "@/core/engine";
import { initialGameState } from "@/data/initialGameState";
import type { DroneWaypoint } from "@/types/units";

describe("deployed drone initialization", () => {
  it("creates active deployed drones with a default patrol route and destination", () => {
    const drone = createDeployedDroneUnit({
      id: "drone-test-1",
      name: "SKYM-T1",
      type: "ISR_DRONE",
      position: { lat: 63.1, lng: 17.2 },
      currentBase: "FOB_N",
    });

    expect(drone.status).toBe("on_mission");
    expect(drone.currentMission).toBe("ISR_DRONE");
    expect(drone.waypoints).toHaveLength(4);
    expect(drone.movement.state).toBe("airborne");
    expect(drone.movement.destination).toEqual({
      lat: drone.waypoints[0].lat,
      lng: drone.waypoints[0].lng,
    });
  });
});

describe("deployed drone patrol behavior", () => {
  it("loops back to the first waypoint after reaching the end of the patrol", () => {
    const drone = createDeployedDroneUnit({
      id: "drone-test-2",
      name: "SKYM-T2",
      type: "ISR_DRONE",
      position: { lat: 64.0, lng: 20.0 },
      currentBase: "MOB",
      fuel: 90,
    });
    const lastWaypointIdx = drone.waypoints.length - 1;
    const lastWaypoint = drone.waypoints[lastWaypointIdx];
    const state = {
      ...structuredClone(initialGameState),
      deployedUnits: [
        {
          ...drone,
          position: { lat: lastWaypoint.lat, lng: lastWaypoint.lng },
          currentWaypointIdx: lastWaypointIdx,
          movement: {
            ...drone.movement,
            destination: { lat: lastWaypoint.lat, lng: lastWaypoint.lng },
          },
        },
      ],
    };

    const nextState = advanceDroneTick(state, drone.id, 1);
    const updated = nextState.deployedUnits[0];

    expect(updated.currentWaypointIdx).toBe(0);
    expect(updated.movement.destination).toEqual({
      lat: drone.waypoints[0].lat,
      lng: drone.waypoints[0].lng,
    });
    expect(updated.fuel).toBeLessThan(drone.fuel);
  });

  it("replaces the patrol route cleanly when waypoints are edited", () => {
    const drone = createDeployedDroneUnit({
      id: "drone-test-3",
      name: "SKYM-T3",
      type: "ISR_DRONE",
      position: { lat: 62.0, lng: 18.0 },
      currentBase: "FOB_S",
    });
    const newWaypoints: DroneWaypoint[] = [
      { id: "wp-1", lat: 62.2, lng: 18.1 },
      { id: "wp-2", lat: 62.15, lng: 18.35 },
      { id: "wp-3", lat: 61.95, lng: 18.2 },
    ];
    const state = {
      ...structuredClone(initialGameState),
      deployedUnits: [drone],
    };

    const nextState = updateDroneWaypoints(state, drone.id, newWaypoints);
    const updated = nextState.deployedUnits[0];

    expect(updated.waypoints).toEqual(newWaypoints);
    expect(updated.currentWaypointIdx).toBe(0);
    expect(updated.movement.destination).toEqual({ lat: 62.2, lng: 18.1 });
  });
});

describe("legacy active drone normalization", () => {
  it("adds a default patrol route when loading a route-less active friendly drone", () => {
    const legacyDrone = createDroneUnit({
      id: "drone-legacy-1",
      name: "SKYM-LEG",
      type: "ISR_DRONE",
      position: { lat: 63.5, lng: 19.5 },
      currentBase: "MOB",
      status: "on_mission",
      fuel: 60,
    });
    const loadedState = gameReducer(
      structuredClone(initialGameState),
      {
        type: "LOAD_STATE",
        payload: {
          ...structuredClone(initialGameState),
          deployedUnits: [legacyDrone],
          friendlyEntities: [],
        },
      },
    );

    const normalized = loadedState.deployedUnits[0];
    expect(normalized.waypoints.length).toBeGreaterThanOrEqual(3);
    expect(normalized.currentMission).toBe("ISR_DRONE");
    expect(normalized.movement.state).toBe("airborne");
    expect(normalized.movement.destination).toEqual({
      lat: normalized.waypoints[0].lat,
      lng: normalized.waypoints[0].lng,
    });
  });
});
