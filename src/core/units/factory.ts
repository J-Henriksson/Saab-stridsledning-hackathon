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

interface CommonParams {
  name: string;
  affiliation?: Affiliation;
  position: GeoPosition;
  currentBase: BaseType | null;
}

export function createAircraftUnit(params: CommonParams & {
  type: AircraftUnit["type"];
  tailNumber: string;
  role?: AircraftUnit["role"];
  fuel?: number;
}): AircraftUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
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
  enduranceHours?: number;
}): DroneUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
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
    status: "ready",
    fuel: 100,
    enduranceHours: params.enduranceHours ?? 12,
  };
}

export function createAirDefenseUnit(params: CommonParams & {
  type: AirDefenseUnit["type"];
  loadedMissiles?: number;
  maxMissiles?: number;
  relocateSpeed?: number;
}): AirDefenseUnit {
  const affiliation = params.affiliation ?? "friend";
  const max = params.maxMissiles ?? 8;
  return {
    id: uuid(),
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
  };
}

export function createGroundVehicleUnit(params: CommonParams & {
  type: GroundVehicleUnit["type"];
  roadSpeed?: number;
}): GroundVehicleUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
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
}): RadarUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
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
