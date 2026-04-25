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

/** Autonomous patrol configuration — the unit cycles a deterministic racetrack
 *  orbit around `center`. Realistic CAP / AEW patterns instead of random legs. */
export interface PatrolConfig {
  center: GeoPosition;
  /** Half-length of the orbit's major axis, km. */
  radiusKm: number;
  /** Cruise / loiter speed, knots. */
  speedKts: number;
  /** Major-axis bearing in degrees (0 = N-S orbit, 90 = E-W orbit). Defaults to 0. */
  axisDeg?: number;
  /** Orbit direction. Defaults to true (clockwise). */
  clockwise?: boolean;
  /** Ellipse aspect ratio — minor axis = radiusKm * aspect. Defaults to 0.45
   *  which yields a CAP-style racetrack. */
  aspect?: number;
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
  /** Logistics link: which base provisioned / owns this unit. Null for hostile units. */
  parentBaseId: BaseType | null;
  /** Recent breadcrumb trail (capped); used by the map to draw path history. */
  pathHistory?: GeoPosition[];
  /** When set, the engine steers the unit around a deterministic racetrack
   *  orbit defined by the patrol config (CAP / AEW behaviour). */
  patrol?: PatrolConfig;
  /** Current index along the pre-computed patrol orbit (looped). */
  patrolLegIdx?: number;
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

export type ADOperationalStatus = "ready" | "standby" | "firing" | "relocating";

export interface AirDefenseUnit extends UnitBase {
  category: "air_defense";
  type: AirDefenseType;
  deployedState: "emplaced" | "stowed";
  missileStock: { loaded: number; max: number };
  fuel: number;
  relocateSpeed: number;
  engagementRange: number;
  detectionRange: number;
  operationalStatus: ADOperationalStatus;
  assignedTargetId?: string;
  /** Pre-placed strategic battery — never draggable, never relocatable. */
  isStatic?: boolean;
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
