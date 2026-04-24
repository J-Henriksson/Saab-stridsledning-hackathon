// ── Base enums ────────────────────────────────────────────────────────────
export type BaseType = "MOB" | "FOB_N" | "FOB_S" | "ROB_N" | "ROB_S" | "ROB_E";

// ── Enemy / plan-mode types ───────────────────────────────────────────────
export type EnemyBaseCategory = "airfield" | "sam_site" | "command" | "logistics" | "radar";
export type EnemyEntityCategory = "fighter" | "transport" | "helicopter" | "apc" | "artillery" | "sam_launcher" | "ship";
export type ThreatLevel = "low" | "medium" | "high" | "unknown";
export type OperationalStatus = "active" | "suspected" | "destroyed" | "unknown";

export interface EnemyBase {
  id: string;
  name: string;
  category: EnemyBaseCategory;
  coords: { lat: number; lng: number };
  threatLevel: ThreatLevel;
  operationalStatus: OperationalStatus;
  estimates: string;
  notes: string;
  createdAt: number;
}

export interface EnemyEntity {
  id: string;
  name: string;
  category: EnemyEntityCategory;
  coords: { lat: number; lng: number };
  threatLevel: ThreatLevel;
  operationalStatus: OperationalStatus;
  estimates: string;
  notes: string;
  createdAt: number;
}

export type FriendlyMarkerCategory = "airbase" | "logistics" | "command" | "army" | "navy";
export type FriendlyEntityCategory = "aircraft" | "air_defense" | "radar" | "drone";

export interface FriendlyMarker {
  id: string;
  name: string;
  category: FriendlyMarkerCategory;
  coords: { lat: number; lng: number };
  notes: string;
  estimates: string;
  createdAt: number;
}

export interface FriendlyEntity {
  id: string;
  name: string;
  category: FriendlyEntityCategory;
  coords: { lat: number; lng: number };
  notes: string;
  createdAt: number;
}
export type RoadBaseStatus  = "Beredskap" | "Operativ" | "Underhåll";
export type RoadBaseEchelon = "Group" | "Platoon" | "Battalion";

export interface RoadBase {
  id: string;
  name: string;
  coords: { lat: number; lng: number };
  status: RoadBaseStatus;
  echelon: RoadBaseEchelon;
  parentBaseId: string;
  isDraggable: true;
  rangeRadius: number;
  createdAt: number;
}

export type AircraftType = "GripenE" | "GripenF_EA" | "GlobalEye" | "VLO_UCAV" | "LOTUS";
export type MissionType = "DCA" | "QRA" | "RECCE" | "AEW" | "AI_DT" | "AI_ST" | "ESCORT" | "TRANSPORT" | "REBASE" | "ISR_DRONE";
export type ScenarioPhase = "FRED" | "KRIS" | "KRIG";
export type MaintenanceType = "quick_lru" | "complex_lru" | "direct_repair" | "troubleshooting" | "scheduled_service";

// ── Extended aircraft status (9 states) ───────────────────────────────────
export type AircraftStatus =
  | "ready"
  | "allocated"
  | "in_preparation"
  | "awaiting_launch"
  | "on_mission"
  | "returning"
  | "recovering"
  | "under_maintenance"
  | "unavailable";

/** Backward-compat mapping from old 4-state to new 9-state */
export function mapLegacyStatus(legacy: string): AircraftStatus {
  switch (legacy) {
    case "mission_capable": return "ready";
    case "not_mission_capable": return "unavailable";
    case "on_mission": return "on_mission";
    case "maintenance": return "under_maintenance";
    default: return "ready";
  }
}

/** Map new 9-state to display category for existing UI components */
export function displayStatusCategory(status: AircraftStatus): "mc" | "on_mission" | "nmc" | "maintenance" {
  switch (status) {
    case "ready":
    case "allocated":
      return "mc";
    case "in_preparation":
    case "awaiting_launch":
      return "mc"; // still counts as available for display
    case "on_mission":
    case "returning":
      return "on_mission";
    case "recovering":
    case "under_maintenance":
      return "maintenance";
    case "unavailable":
      return "nmc";
  }
}

/** Check if an aircraft is mission-capable (can be assigned/dispatched) */
export function isMissionCapable(status: AircraftStatus): boolean {
  return status === "ready";
}

/** Check if an aircraft is in a maintenance/broken state */
export function isInMaintenance(status: AircraftStatus): boolean {
  return status === "under_maintenance" || status === "unavailable";
}

// ── Base zones ────────────────────────────────────────────────────────────
export type BaseZoneType =
  | "runway"
  | "prep_slot"
  | "front_maintenance"
  | "rear_maintenance"
  | "parking"
  | "fuel_zone"
  | "ammo_zone"
  | "spare_parts_zone"
  | "logistics_area";

export interface BaseZone {
  id: string;
  type: BaseZoneType;
  capacity: number;
  currentQueue: string[]; // aircraft IDs
  assignedWork: string[];
  resourceStock: Record<string, number>;
}

// ── Maintenance task ──────────────────────────────────────────────────────
export type FacilityType = "service_bay" | "minor_workshop" | "major_workshop";
export type CapabilityLevel =
  | "AU_steg_1"
  | "AU_steg_2_3"
  | "AU_steg_4"
  | "FK_steg_1_3"
  | "kompositrep"
  | "hjulbyte";

export interface MaintenanceTask {
  id: string;
  aircraftId: string;
  faultType: MaintenanceType;
  facilityNeeded: FacilityType;
  capabilityNeeded: CapabilityLevel;
  nominalTime: number; // hours
  stochasticDelay: number; // extra hours from dice
  requiredResources: { resourceId: string; quantity: number }[];
  startedAt?: { day: number; hour: number };
  remainingTime: number;
}

// ── Recommendation engine ─────────────────────────────────────────────────
export type RecommendationType =
  | "reassign"
  | "maintenance"
  | "resupply"
  | "rebalance"
  | "schedule"
  | "warning";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  affectedAssets: string[];
  affectedMissions: string[];
  expectedBenefit: string;
  tradeoff: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  applyAction: GameAction;
  dismissed: boolean;
}

// ── Scenario day ──────────────────────────────────────────────────────────
export interface ScenarioDay {
  dayNumber: number;
  phase: ScenarioPhase;
  threats: ("CM" | "TBM")[];
  policyRestrictions: string[];
}

// ── Game actions (discriminated union) ────────────────────────────────────
export type GameAction =
  | { type: "TICK"; seconds: number }
  | { type: "ADVANCE_HOUR" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_GAME_SPEED"; speed: number }
  | { type: "ASSIGN_AIRCRAFT"; orderId: string; aircraftIds: string[] }
  | { type: "MOVE_AIRCRAFT"; aircraftId: string; fromZone: string; toZone: string; baseId: BaseType }
  | { type: "CREATE_ATO_ORDER"; order: Omit<ATOOrder, "id" | "status" | "assignedAircraft"> }
  | { type: "EDIT_ATO_ORDER"; orderId: string; updates: Partial<ATOOrder> }
  | { type: "DELETE_ATO_ORDER"; orderId: string }
  | { type: "START_MAINTENANCE"; baseId: BaseType; aircraftId: string; task?: Partial<MaintenanceTask> }
  | { type: "DISPATCH_ORDER"; orderId: string }
  | { type: "APPLY_RECOMMENDATION"; recommendationId: string }
  | { type: "DISMISS_RECOMMENDATION"; recommendationId: string }
  | { type: "SEND_MISSION_DROP"; baseId: BaseType; aircraftId: string; missionType: MissionType; durationHours?: number }
  | { type: "APPLY_UTFALL_OUTCOME"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; weaponLoss: number; actionLabel: string; requiredSparePart?: string }
  | { type: "COMPLETE_LANDING_CHECK"; baseId: BaseType; aircraftId: string; sendToMaintenance: boolean; repairTime?: number; maintenanceTypeKey?: string; weaponLoss?: number; actionLabel?: string }
  | { type: "HANGAR_DROP_CONFIRM"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; restoreHealth: boolean }
  | { type: "PAUSE_MAINTENANCE"; baseId: BaseType; aircraftId: string }
  | { type: "MARK_FAULT_NMC"; baseId: BaseType; aircraftId: string; repairTime: number; maintenanceTypeKey: string; actionLabel: string; requiredSparePart?: string }
  | { type: "CONSUME_SPARE_PART"; baseId: BaseType; sparePartId: string; quantity?: number }
  | { type: "RESET_GAME" }
  | { type: "LOAD_STATE"; payload: GameState }
  | { type: "IMPORT_ATO_BATCH"; orders: Omit<ATOOrder, "id" | "status" | "assignedAircraft">[]; sourceFile: string; riskCount: number }
  | { type: "REBASE_AIRCRAFT"; aircraftId: string; fromBase: BaseType; toBase: BaseType }
  | { type: "PLAN_ADD_ENEMY_BASE"; base: Omit<EnemyBase, "id" | "createdAt"> }
  | { type: "PLAN_EDIT_ENEMY_BASE"; id: string; updates: Partial<Omit<EnemyBase, "id" | "createdAt">> }
  | { type: "PLAN_DELETE_ENEMY_BASE"; id: string }
  | { type: "PLAN_ADD_ENEMY_ENTITY"; entity: Omit<EnemyEntity, "id" | "createdAt"> }
  | { type: "PLAN_EDIT_ENEMY_ENTITY"; id: string; updates: Partial<Omit<EnemyEntity, "id" | "createdAt">> }
  | { type: "PLAN_DELETE_ENEMY_ENTITY"; id: string }
  | { type: "PLAN_UPDATE_BASE_RESOURCES"; baseId: BaseType; fuel?: number; ammo?: { type: string; quantity: number }[]; maintenanceBayTotal?: number }
  | { type: "PLAN_ADD_FRIENDLY_MARKER"; marker: Omit<FriendlyMarker, "id" | "createdAt"> }
  | { type: "PLAN_EDIT_FRIENDLY_MARKER"; id: string; updates: Partial<Omit<FriendlyMarker, "id" | "createdAt">> }
  | { type: "PLAN_DELETE_FRIENDLY_MARKER"; id: string }
  | { type: "PLAN_ADD_FRIENDLY_ENTITY"; entity: Omit<FriendlyEntity, "id" | "createdAt"> }
  | { type: "PLAN_EDIT_FRIENDLY_ENTITY"; id: string; updates: Partial<Omit<FriendlyEntity, "id" | "createdAt">> }
  | { type: "PLAN_DELETE_FRIENDLY_ENTITY"; id: string }
  | { type: "PLAN_ADD_ROAD_BASE"; roadBase: Omit<RoadBase, "id" | "createdAt"> }
  | { type: "PLAN_EDIT_ROAD_BASE"; id: string; updates: Partial<Omit<RoadBase, "id" | "createdAt">> }
  | { type: "PLAN_DELETE_ROAD_BASE"; id: string }
  | { type: "PLAN_UPDATE_COORDS_ROAD_BASE"; id: string; coords: { lat: number; lng: number } }
  | { type: "PLAN_ADD_FRIENDLY_UNIT"; unit: import("./units").Unit }
  | { type: "PLAN_DELETE_FRIENDLY_UNIT"; unitId: string }
  | { type: "DEPLOY_UNIT"; unitId: string; destination: import("./units").GeoPosition; speed?: number }
  | { type: "TRANSFER_UNIT"; unitId: string; toBaseId: BaseType }
  | { type: "RECALL_UNIT"; unitId: string; toBaseId?: BaseType }
  | { type: "RELOCATE_UNIT"; unitId: string; destination: import("./units").GeoPosition }
  | { type: "CLASSIFY_CONTACT"; unitId: string; affiliation: import("./units").Affiliation }
  | { type: "STORE_UNIT"; unitId: string; baseId: BaseType }
  | { type: "SET_AD_STATE"; unitId: string; deployedState: "emplaced" | "stowed" }
  | { type: "SET_RADAR_EMITTING"; unitId: string; emitting: boolean }
  | { type: "ADD_TACTICAL_ZONE"; zone: Omit<import("./overlay").TacticalZone, "id" | "createdAtHour" | "createdAtDay"> }
  | { type: "REMOVE_TACTICAL_ZONE"; zoneId: string }
  | { type: "SET_OVERLAY_VISIBILITY"; key: keyof import("./overlay").OverlayLayerVisibility; value: boolean }
  | { type: "ADD_EVENT"; event: Omit<GameEvent, "id" | "timestamp"> }
  | { type: "LAUNCH_DRONE"; droneId: string; waypoints: import("./units").DroneWaypoint[] }
  | { type: "RECALL_DRONE"; droneId: string }
  | { type: "UPDATE_DRONE_WAYPOINTS"; droneId: string; waypoints: import("./units").DroneWaypoint[] }
  | { type: "SET_DRONE_OVERLAY"; droneId: string; rangeRadiusVisible?: boolean; connectionLineVisible?: boolean };

// ── Core interfaces ───────────────────────────────────────────────────────
// `Aircraft` is now an alias for the unit-model variant. Kept as an alias
// during migration so existing imports don't need simultaneous changes.
export type Aircraft = import("./units").AircraftUnit;

export interface SparePartStock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  maxQuantity: number;
  reservedQuantity: number;
  resupplyDays: number;
  onOrder: number;
  leadTime: number;
  source: "base_stock" | "central_stock" | "mro";
  turnaround: number; // days for full cycle
  isReusable: boolean;
}

export interface PersonnelGroup {
  id: string;
  role: string;
  available: number;
  total: number;
  onDuty: boolean;
}

export interface Base {
  id: BaseType;
  name: string;
  type: "huvudbas" | "sidobas" | "reservbas";
  units: import("./units").Unit[];
  spareParts: SparePartStock[];
  personnel: PersonnelGroup[];
  fuel: number;
  maxFuel: number;
  ammunition: { type: string; quantity: number; max: number }[];
  maintenanceBays: { total: number; occupied: number };
  zones: BaseZone[];
}

export interface GameState {
  day: number;
  hour: number;
  minute: number;
  second: number;
  phase: ScenarioPhase;
  bases: Base[];
  deployedUnits: import("./units").Unit[];
  successfulMissions: number;
  failedMissions: number;
  events: GameEvent[];
  atoOrders: ATOOrder[];
  isRunning: boolean;
  gameSpeed: number;
  recommendations: Recommendation[];
  maintenanceTasks: MaintenanceTask[];
  pendingLandingChecks: { aircraftId: string; baseId: BaseType }[];
  enemyBases: EnemyBase[];
  enemyEntities: EnemyEntity[];
  friendlyMarkers: FriendlyMarker[];
  friendlyEntities: FriendlyEntity[];
  roadBases: RoadBase[];
  tacticalZones: import("./overlay").TacticalZone[];
  overlayVisibility: import("./overlay").OverlayLayerVisibility;
}

export type AARActionType =
  | "MISSION_DISPATCH"
  | "MAINTENANCE_START"
  | "MAINTENANCE_PAUSE"
  | "LANDING_RECEIVED"
  | "UTFALL_APPLIED"
  | "SPARE_PART_USED"
  | "FAULT_NMC"
  | "HANGAR_CONFIRM"
  | "UNIT_DEPLOYED"
  | "UNIT_RECALLED"
  | "UNIT_TRANSFERRED"
  | "UNIT_DESTROYED"
  | "CONTACT_CLASSIFIED"
  | "UNIT_RELOCATED"
  | "UNIT_FUEL_LOW";

export type RiskLevel = "low" | "medium" | "high" | "catastrophic";

export interface GameEvent {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  base?: BaseType;
  /** @deprecated use unitId. Kept in sync automatically for aircraft events. */
  aircraftId?: string;
  unitId?: string;
  unitCategory?: import("./units").UnitCategory;
  actionType?: AARActionType;
  riskLevel?: RiskLevel;
  healthAtDecision?: number;
  resourceImpact?: string;
  decisionContext?: string;
}

export interface ATOOrder {
  id: string;
  day: number;
  missionType: MissionType;
  label: string;
  startHour: number;
  endHour: number;
  requiredCount: number;
  aircraftType?: AircraftType;
  payload?: string;
  launchBase: BaseType;
  priority: "high" | "medium" | "low";
  status: "pending" | "assigned" | "dispatched" | "completed";
  assignedAircraft: string[];
  sortiesPerDay?: number;
  targetBase?: BaseType; // destination base for REBASE orders
  /** Target area name for mission routing, e.g. "Gotland East" */
  destinationName?: string;
  /** Target coordinates for map tracking */
  coords?: { lat: number; lng: number };
  /** Radio callsign for the mission package, e.g. "VIPER 1" */
  missionCallsign?: string;
  /** Estimated fuel percentage on arrival at destination */
  fuelOnArrival?: number;
}

export type { Unit, UnitCategory, Affiliation, AircraftUnit, DroneUnit, DroneWaypoint, AirDefenseUnit, GroundVehicleUnit, RadarUnit, GeoPosition, Movement, MovementState } from "./units";
