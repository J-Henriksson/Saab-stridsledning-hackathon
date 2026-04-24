import type { GameState, BaseType } from "@/types/game";
import type { DroneUnit, DroneWaypoint } from "@/types/units";
import { isDrone } from "@/types/units";
import { uuid } from "@/core/uuid";
import { BASE_COORDS } from "@/pages/map/constants";

const DRONE_SPEED_KMH = 120;
const FUEL_LOW_THRESHOLD = 20;
const LAND_DISTANCE_DEG = 0.05; // ~5 km

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a2 = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

function distanceDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function moveDroneToward(
  pos: { lat: number; lng: number },
  target: { lat: number; lng: number },
  speedKmh: number,
  hours: number,
): { lat: number; lng: number } {
  const distKm = haversineKm(pos, target);
  if (distKm < 0.1) return target;
  const moveKm = speedKmh * hours;
  const fraction = Math.min(moveKm / distKm, 1);
  return {
    lat: pos.lat + (target.lat - pos.lat) * fraction,
    lng: pos.lng + (target.lng - pos.lng) * fraction,
  };
}

function updateDroneInState(state: GameState, droneId: string, updater: (d: DroneUnit) => DroneUnit): GameState {
  const inDeploy = state.deployedUnits.some((u) => u.id === droneId);
  if (inDeploy) {
    return {
      ...state,
      deployedUnits: state.deployedUnits.map((u) =>
        u.id === droneId && isDrone(u) ? updater(u) : u,
      ),
    };
  }
  return {
    ...state,
    bases: state.bases.map((b) => ({
      ...b,
      units: b.units.map((u) => (u.id === droneId && isDrone(u) ? updater(u) : u)),
    })),
  };
}

function findDrone(state: GameState, droneId: string): DroneUnit | null {
  for (const b of state.bases) {
    const u = b.units.find((u) => u.id === droneId);
    if (u && isDrone(u)) return u;
  }
  const u = state.deployedUnits.find((u) => u.id === droneId);
  return u && isDrone(u) ? u : null;
}

function findDroneBase(state: GameState, droneId: string): BaseType | null {
  for (const b of state.bases) {
    if (b.units.some((u) => u.id === droneId)) return b.id;
  }
  return null;
}

export function launchDrone(state: GameState, droneId: string, waypoints: DroneWaypoint[]): GameState {
  let drone: DroneUnit | null = null;
  let baseId: BaseType | null = null;
  for (const b of state.bases) {
    const u = b.units.find((u) => u.id === droneId);
    if (u && isDrone(u)) { drone = u; baseId = b.id; break; }
  }
  if (!drone || !baseId) return state;
  if (drone.status !== "ready") return state;

  const firstWp = waypoints[0];
  const startPos = firstWp ? { lat: firstWp.lat, lng: firstWp.lng } : drone.position;

  const launched: DroneUnit = {
    ...drone,
    status: "on_mission",
    currentMission: "ISR_DRONE",
    waypoints,
    currentWaypointIdx: 0,
    movement: {
      state: "airborne",
      speed: DRONE_SPEED_KMH,
      heading: 0,
      destination: firstWp ? { lat: firstWp.lat, lng: firstWp.lng } : undefined,
    },
    currentBase: baseId,
    lastBase: baseId,
    position: startPos,
  };

  const stateWithout = {
    ...state,
    bases: state.bases.map((b) =>
      b.id === baseId ? { ...b, units: b.units.filter((u) => u.id !== droneId) } : b,
    ),
  };

  return {
    ...stateWithout,
    deployedUnits: [...stateWithout.deployedUnits, launched],
    events: [
      {
        id: uuid(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`,
        type: "info" as const,
        message: `${drone.name} startad för ISR-uppdrag`,
        unitId: droneId,
        unitCategory: "drone",
      },
      ...state.events,
    ].slice(0, 200),
  };
}

export function recallDrone(state: GameState, droneId: string): GameState {
  const drone = state.deployedUnits.find((u) => u.id === droneId);
  if (!drone || !isDrone(drone)) return state;
  if (drone.status === "returning" || drone.status === "ready") return state;

  const homeBase = drone.currentBase ?? drone.lastBase;
  if (!homeBase) return state;
  const homeCoords = BASE_COORDS[homeBase];
  if (!homeCoords) return state;

  return {
    ...state,
    deployedUnits: state.deployedUnits.map((u) =>
      u.id === droneId && isDrone(u)
        ? { ...u, status: "returning", movement: { state: "airborne", speed: DRONE_SPEED_KMH, heading: 0, destination: homeCoords } }
        : u,
    ),
    events: [
      {
        id: uuid(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`,
        type: "info" as const,
        message: `${drone.name} återvänder till bas`,
        unitId: droneId,
        unitCategory: "drone",
      },
      ...state.events,
    ].slice(0, 200),
  };
}

export function advanceDroneTick(state: GameState, droneId: string, minutesDelta: number): GameState {
  const drone = state.deployedUnits.find((u) => u.id === droneId);
  if (!drone || !isDrone(drone)) return state;

  const hours = minutesDelta / 60;
  let updated: DroneUnit = { ...drone };

  // Fuel drain: 100% / 18h endurance = ~5.56%/h
  const fuelDrain = (100 / (updated.enduranceHours || 18)) * hours;
  updated = { ...updated, fuel: Math.max(0, updated.fuel - fuelDrain) };

  // Auto-recall on low fuel
  if (updated.fuel <= FUEL_LOW_THRESHOLD && updated.status === "on_mission") {
    const s2 = {
      ...state,
      deployedUnits: state.deployedUnits.map((u) => (u.id === droneId && isDrone(u) ? updated : u)),
    };
    return recallDrone(s2, droneId);
  }

  // RTB movement
  if (updated.status === "returning") {
    const homeBase = updated.currentBase ?? updated.lastBase;
    const dest = homeBase ? BASE_COORDS[homeBase] : null;
    if (dest && updated.position) {
      updated = { ...updated, position: moveDroneToward(updated.position, dest, DRONE_SPEED_KMH, hours) };
      if (distanceDeg(updated.position, dest) < LAND_DISTANCE_DEG) {
        return landDrone({ ...state, deployedUnits: state.deployedUnits.map((u) => (u.id === droneId && isDrone(u) ? updated : u)) }, droneId);
      }
    }
    return { ...state, deployedUnits: state.deployedUnits.map((u) => (u.id === droneId && isDrone(u) ? updated : u)) };
  }

  // Waypoint following
  if (updated.status === "on_mission" && updated.waypoints.length > 0) {
    const wp = updated.waypoints[updated.currentWaypointIdx];
    if (wp && updated.position) {
      updated = {
        ...updated,
        movement: {
          ...updated.movement,
          state: "airborne",
          speed: DRONE_SPEED_KMH,
          destination: { lat: wp.lat, lng: wp.lng },
        },
        position: moveDroneToward(updated.position, { lat: wp.lat, lng: wp.lng }, DRONE_SPEED_KMH, hours),
      };
      if (distanceDeg(updated.position, { lat: wp.lat, lng: wp.lng }) < 0.01) {
        const nextIdx = (updated.currentWaypointIdx + 1) % updated.waypoints.length;
        const nextWp = updated.waypoints[nextIdx];
        updated = {
          ...updated,
          currentWaypointIdx: nextIdx,
          movement: {
            ...updated.movement,
            destination: nextWp ? { lat: nextWp.lat, lng: nextWp.lng } : undefined,
          },
        };
      }
    }
  }

  return { ...state, deployedUnits: state.deployedUnits.map((u) => (u.id === droneId && isDrone(u) ? updated : u)) };
}

export function landDrone(state: GameState, droneId: string): GameState {
  const drone = state.deployedUnits.find((u) => u.id === droneId);
  if (!drone || !isDrone(drone)) return state;

  const homeBase = drone.currentBase ?? drone.lastBase;
  if (!homeBase) return state;
  const homeCoords = BASE_COORDS[homeBase] ?? drone.position;

  const landed: DroneUnit = {
    ...drone,
    status: "under_maintenance",
    missionEndHour: state.hour + 2,
    movement: { state: "stationary", speed: 0 },
    position: homeCoords,
    currentBase: homeBase,
    waypoints: [],
    currentWaypointIdx: 0,
    currentMission: undefined,
  };

  return {
    ...state,
    deployedUnits: state.deployedUnits.filter((u) => u.id !== droneId),
    bases: state.bases.map((b) =>
      b.id === homeBase ? { ...b, units: [...b.units, landed] } : b,
    ),
    events: [
      {
        id: uuid(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:${String(state.minute).padStart(2, "0")}`,
        type: "success" as const,
        message: `${drone.name} landad, underhåll påbörjas`,
        unitId: droneId,
        unitCategory: "drone",
      },
      ...state.events,
    ].slice(0, 200),
  };
}

export function setDroneOverlay(state: GameState, droneId: string, rangeRadiusVisible?: boolean, connectionLineVisible?: boolean): GameState {
  return updateDroneInState(state, droneId, (d) => ({
    ...d,
    rangeRadiusVisible: rangeRadiusVisible ?? d.rangeRadiusVisible,
    connectionLineVisible: connectionLineVisible ?? d.connectionLineVisible,
  }));
}

export function updateDroneWaypoints(state: GameState, droneId: string, waypoints: DroneWaypoint[]): GameState {
  const firstWp = waypoints[0];
  return updateDroneInState(state, droneId, (d) => ({
    ...d,
    waypoints,
    currentWaypointIdx: 0,
    movement: {
      ...d.movement,
      destination: firstWp ? { lat: firstWp.lat, lng: firstWp.lng } : undefined,
    },
  }));
}

// Called from handleAdvanceMinute to tick all deployed friendly drones
export function advanceAllDrones(state: GameState, minutesDelta: number): GameState {
  let s = state;
  for (const unit of state.deployedUnits) {
    if (isDrone(unit) && unit.affiliation !== "hostile") {
      s = advanceDroneTick(s, unit.id, minutesDelta);
    }
  }
  return s;
}

// Called per-hour to resolve under_maintenance drone recovery (2-turn = 2h cooldown)
export function advanceDroneMaintenanceTick(state: GameState): GameState {
  return {
    ...state,
    bases: state.bases.map((b) => ({
      ...b,
      units: b.units.map((u) => {
        if (!isDrone(u)) return u;
        if (u.status === "under_maintenance" && u.missionEndHour !== undefined && state.hour >= u.missionEndHour) {
          return { ...u, status: "ready" as const, fuel: 100, missionEndHour: undefined };
        }
        return u;
      }),
    })),
  };
}

// Unused but keeps the findDroneBase helper available for future use
export { findDrone, findDroneBase };
