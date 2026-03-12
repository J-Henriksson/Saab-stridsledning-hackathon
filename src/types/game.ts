export type BaseType = "MOB" | "FOB_N" | "FOB_S" | "ROB_N" | "ROB_S" | "ROB_E";
export type AircraftStatus = "mission_capable" | "not_mission_capable" | "on_mission" | "maintenance";
export type MissionType = "DCA" | "QRA" | "RECCE" | "AEW" | "AI_DT" | "AI_ST" | "ESCORT" | "TRANSPORT";
export type ScenarioPhase = "FRED" | "KRIS" | "KRIG";
export type MaintenanceType = "quick_lru" | "complex_lru" | "direct_repair" | "troubleshooting" | "scheduled_service";

export interface Aircraft {
  id: string;
  type: "GripenE" | "GripenF_EA" | "GlobalEye" | "VLO_UCAV" | "LOTUS";
  tailNumber: string;
  status: AircraftStatus;
  currentBase: BaseType;
  flightHours: number;
  hoursToService: number;
  currentMission?: MissionType;
  payload?: string;
  maintenanceTimeRemaining?: number; // hours
  maintenanceType?: MaintenanceType;
}

export interface SparePartStock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  maxQuantity: number;
  resupplyDays: number;
  onOrder: number;
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
  aircraft: Aircraft[];
  spareParts: SparePartStock[];
  personnel: PersonnelGroup[];
  fuel: number; // percentage
  maxFuel: number;
  ammunition: { type: string; quantity: number; max: number }[];
  maintenanceBays: { total: number; occupied: number };
}

export interface GameState {
  day: number;
  hour: number;
  phase: ScenarioPhase;
  bases: Base[];
  successfulMissions: number;
  failedMissions: number;
  events: GameEvent[];
}

export interface GameEvent {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  base?: BaseType;
}
