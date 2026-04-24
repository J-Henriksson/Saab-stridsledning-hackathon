import type {
  AircraftType,
  AircraftStatus,
  BaseType,
  MaintenanceTask,
  MaintenanceType,
  MissionType,
} from "./game";

export type UnitCategory =
  | "aircraft"
  | "drone"
  | "air_defense"
  | "ground_vehicle"
  | "radar";

export type Affiliation =
  | "friend"
  | "hostile"
  | "neutral"
  | "unknown"
  | "pending";

export type MovementState = "stationary" | "moving" | "airborne";

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface Movement {
  state: MovementState;
  speed: number;
  heading?: number;
  destination?: GeoPosition | BaseType;
  etaHour?: number;
}

export interface UnitBase {
  id: string;
  category: UnitCategory;
  name: string;
  affiliation: Affiliation;
  sidc: string;
  health: number;
  position: GeoPosition;
  movement: Movement;
  currentBase: BaseType | null;
  lastBase: BaseType | null;
  deployedAt?: { day: number; hour: number };
  /** Set during TRANSFER_UNIT; the engine STOREs the unit here on arrival. */
  pendingArrivalBase?: BaseType;
}

export interface AircraftUnit extends UnitBase {
  category: "aircraft";
  type: AircraftType;
  tailNumber: string;
  role?: "fighter" | "awacs" | "ucav" | "transport";
  status: AircraftStatus;
  flightHours: number;
  hoursToService: number;
  currentMission?: MissionType;
  missionEndHour?: number;
  rebaseTarget?: BaseType;
  payload?: string;
  maintenanceTimeRemaining?: number;
  maintenanceType?: MaintenanceType;
  maintenanceTask?: MaintenanceTask;
  requiredSparePart?: string;
  fuel: number;
}

export type DroneType = "ISR_DRONE" | "STRIKE_DRONE";

export interface DroneWaypoint {
  id: string;
  lat: number;
  lng: number;
  loiterMinutes?: number;
}

export interface DroneUnit extends UnitBase {
  category: "drone";
  type: DroneType;
  status: AircraftStatus;
  payload?: string;
  fuel: number;
  enduranceHours: number;
  currentMission?: MissionType;
  missionEndHour?: number;
  waypoints: DroneWaypoint[];
  currentWaypointIdx: number;
  sensorRangeKm: number;
  rangeKm: number;
  rangeRadiusVisible: boolean;
  connectionLineVisible: boolean;
  isDraggable: boolean;
}

export type AirDefenseType = "SAM_SHORT" | "SAM_MEDIUM" | "SAM_LONG";

export interface AirDefenseUnit extends UnitBase {
  category: "air_defense";
  type: AirDefenseType;
  deployedState: "emplaced" | "stowed";
  missileStock: { loaded: number; max: number };
  fuel: number;
  relocateSpeed: number;
}

export type GroundVehicleType = "LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER";

export interface GroundVehicleUnit extends UnitBase {
  category: "ground_vehicle";
  type: GroundVehicleType;
  fuel: number;
  roadSpeed: number;
}

export type GroundRadarType = "SEARCH_RADAR" | "TRACKING_RADAR";

export interface RadarUnit extends UnitBase {
  category: "radar";
  type: GroundRadarType;
  deployedState: "emplaced" | "stowed";
  emitting: boolean;
  relocateSpeed: number;
}

export type Unit =
  | AircraftUnit
  | DroneUnit
  | AirDefenseUnit
  | GroundVehicleUnit
  | RadarUnit;

export function isAircraft(u: Unit): u is AircraftUnit {
  return u.category === "aircraft";
}
export function isDrone(u: Unit): u is DroneUnit {
  return u.category === "drone";
}
export function isAirDefense(u: Unit): u is AirDefenseUnit {
  return u.category === "air_defense";
}
export function isGroundVehicle(u: Unit): u is GroundVehicleUnit {
  return u.category === "ground_vehicle";
}
export function isRadar(u: Unit): u is RadarUnit {
  return u.category === "radar";
}
