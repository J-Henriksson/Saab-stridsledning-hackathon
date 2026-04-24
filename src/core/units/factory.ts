import type { BaseType } from "@/types/game";
import type {
  Affiliation,
  AircraftUnit,
  AirDefenseUnit,
  DroneUnit,
  GeoPosition,
  GroundVehicleUnit,
  RadarUnit,
} from "@/types/units";
import { buildSidc } from "./sidc";
import { uuid } from "@/core/uuid";

const DEFAULT_DRONE_PATROL_RADIUS_DEG = 0.12;
const DEFAULT_DRONE_SPEED_KMH = 120;

interface CommonParams {
  name: string;
  affiliation?: Affiliation;
  position: GeoPosition;
  currentBase: BaseType | null;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(4));
}

export function createDefaultDronePatrolWaypoints(
  center: GeoPosition,
  radiusDeg: number = DEFAULT_DRONE_PATROL_RADIUS_DEG,
): DroneUnit["waypoints"] {
  return [
    { id: uuid(), lat: roundCoord(center.lat + radiusDeg), lng: roundCoord(center.lng) },
    { id: uuid(), lat: roundCoord(center.lat + radiusDeg * 0.35), lng: roundCoord(center.lng + radiusDeg * 0.9) },
    { id: uuid(), lat: roundCoord(center.lat - radiusDeg * 0.9), lng: roundCoord(center.lng + radiusDeg * 0.3) },
    { id: uuid(), lat: roundCoord(center.lat - radiusDeg * 0.2), lng: roundCoord(center.lng - radiusDeg) },
  ];
}

export function createAircraftUnit(params: CommonParams & {
  type: AircraftUnit["type"];
  tailNumber: string;
  role?: AircraftUnit["role"];
  fuel?: number;
  id?: string;
}): AircraftUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: params.id ?? uuid(),
    category: "aircraft",
    type: params.type,
    tailNumber: params.tailNumber,
    name: params.name,
    role: params.role,
    affiliation,
    sidc: buildSidc("aircraft", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    status: "ready",
    flightHours: 0,
    hoursToService: 100,
    fuel: params.fuel ?? 100,
  };
}

export function createDroneUnit(params: CommonParams & {
  type: DroneUnit["type"];
  payload?: string;
  enduranceHours?: number;
  fuel?: number;
  status?: DroneUnit["status"];
  sensorRangeKm?: number;
  rangeKm?: number;
  id?: string;
}): DroneUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: params.id ?? uuid(),
    category: "drone",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("drone", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    status: params.status ?? "ready",
    payload: params.payload,
    fuel: params.fuel ?? 100,
    enduranceHours: params.enduranceHours ?? 18,
    waypoints: [],
    currentWaypointIdx: 0,
    sensorRangeKm: params.sensorRangeKm ?? 60,
    rangeKm: params.rangeKm ?? 100,
    rangeRadiusVisible: false,
    connectionLineVisible: false,
    isDraggable: false,
  };
}

export function createDeployedDroneUnit(params: CommonParams & {
  type: DroneUnit["type"];
  payload?: string;
  fuel?: number;
  enduranceHours?: number;
  sensorRangeKm?: number;
  rangeKm?: number;
  id?: string;
}): DroneUnit {
  const waypoints = createDefaultDronePatrolWaypoints(params.position);
  return {
    ...createDroneUnit(params),
    status: "on_mission",
    currentMission: "ISR_DRONE",
    waypoints,
    movement: {
      state: "airborne",
      speed: DEFAULT_DRONE_SPEED_KMH,
      heading: 0,
      destination: waypoints[0] ? { lat: waypoints[0].lat, lng: waypoints[0].lng } : undefined,
    },
  };
}

export function normalizeActiveDeployedDroneUnit(unit: DroneUnit): DroneUnit {
  if (unit.affiliation === "hostile" || unit.status !== "on_mission") {
    return unit;
  }

  const waypoints = unit.waypoints.length > 0 ? unit.waypoints : createDefaultDronePatrolWaypoints(unit.position);
  const currentWaypointIdx = Math.min(unit.currentWaypointIdx, Math.max(waypoints.length - 1, 0));
  const nextWaypoint = waypoints[currentWaypointIdx];
  const destination =
    unit.movement.destination && typeof unit.movement.destination === "object" && "lat" in unit.movement.destination
      ? unit.movement.destination
      : nextWaypoint
        ? { lat: nextWaypoint.lat, lng: nextWaypoint.lng }
        : unit.movement.destination;

  return {
    ...unit,
    currentMission: unit.currentMission ?? "ISR_DRONE",
    currentWaypointIdx,
    waypoints,
    movement: {
      ...unit.movement,
      state: "airborne",
      speed: unit.movement.speed > 0 ? unit.movement.speed : DEFAULT_DRONE_SPEED_KMH,
      destination,
    },
  };
}

export function createAirDefenseUnit(params: CommonParams & {
  type: AirDefenseUnit["type"];
  loadedMissiles?: number;
  maxMissiles?: number;
  relocateSpeed?: number;
  id?: string;
}): AirDefenseUnit {
  const affiliation = params.affiliation ?? "friend";
  const max = params.maxMissiles ?? 8;
  const ranges: Record<AirDefenseUnit["type"], { eng: number; det: number }> = {
    SAM_SHORT:  { eng: 15,  det: 40  },
    SAM_MEDIUM: { eng: 50,  det: 120 },
    SAM_LONG:   { eng: 200, det: 400 },
  };
  const { eng, det } = ranges[params.type];
  return {
    id: params.id ?? uuid(),
    category: "air_defense",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("air_defense", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    deployedState: "emplaced",
    missileStock: { loaded: params.loadedMissiles ?? max, max },
    fuel: 100,
    relocateSpeed: params.relocateSpeed ?? 30,
    engagementRange: eng,
    detectionRange: det,
    operationalStatus: "ready",
  };
}

export function createGroundVehicleUnit(params: CommonParams & {
  type: GroundVehicleUnit["type"];
  roadSpeed?: number;
  id?: string;
}): GroundVehicleUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: params.id ?? uuid(),
    category: "ground_vehicle",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("ground_vehicle", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    fuel: 100,
    roadSpeed: params.roadSpeed ?? 40,
  };
}

export function createRadarUnit(params: CommonParams & {
  type: RadarUnit["type"];
  emitting?: boolean;
  relocateSpeed?: number;
  id?: string;
}): RadarUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: params.id ?? uuid(),
    category: "radar",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("radar", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    deployedState: "emplaced",
    emitting: params.emitting ?? true,
    relocateSpeed: params.relocateSpeed ?? 25,
  };
}
