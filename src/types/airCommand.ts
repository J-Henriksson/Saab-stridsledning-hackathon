import type { BaseType } from "./game";

export type AirCommandMissionType =
  | "QRA"
  | "CAP"
  | "CAS"
  | "RECON"
  | "TRANSPORT"
  | "TRAINING"
  | "INTERCEPT"
  | "COMBAT";

export type WeaponSafetyStatus = "Armed" | "Safe";

export type AircraftOperatingState =
  | "Scrambled"
  | "Hangar"
  | "Apron"
  | "Maintenance";

export type BaseOperationalStatus = "Active" | "Standby" | "Maintenance";

export interface AircraftWeaponLoadout {
  irisT?: number;
  meteor?: number;
  aim120?: number;
  sidewinder?: number;
  rbs15?: number;
  gbu39?: number;
  brimstone?: number;
  pods?: string[];
  gunAmmoPct?: number;
}

export interface EnhancedAircraft {
  id: string;
  tailNumber: string;
  platform: "JAS 39 Gripen" | "GlobalEye" | "TP 84" | "SK 60";
  callsign: string;
  squawkCode: string;
  transponderCode: string;
  heading: number;
  altitude: number;
  speed: number;
  machSpeed: number;
  verticalRate: number;
  missionType: AirCommandMissionType;
  fuelLevel: number;
  fuelStatus: "Normal" | "Joker" | "Bingo" | "Emergency";
  weaponStatus: WeaponSafetyStatus;
  weaponLoadout: AircraftWeaponLoadout;
  homeBaseId: BaseType;
  originBase: string;
  estimatedLandingTime: string;
  wing: string;
  maintenanceHours: number;
  radarActive: boolean;
  radarRangeKm?: number;
  radarAzimuthHalfDeg?: number;
  isTargeted: boolean;
  operatingState: AircraftOperatingState;
  position: { lat: number; lng: number };
}

export interface Aircraft extends EnhancedAircraft {}

export interface StrategicBase {
  id: BaseType;
  name: string;
  icaoCode: string;
  coordinates: { lat: number; lng: number };
  capacity: {
    hangar: number;
    ramp: number;
  };
  defenses: string[];
  weather: {
    windKts: number;
    windDirDeg: number;
    visibilityKm: number;
    ceilingFt: number;
    condition: "VMC" | "MVMC" | "IMC";
    landingState: "Open" | "Marginal" | "Restricted";
  };
  availableAssets: string[];
  status: BaseOperationalStatus;
  wing: string;
  logistics: {
    fuelReservePct: number;
    maintenanceBays: {
      total: number;
      occupied: number;
    };
    personnel: {
      available: number;
      total: number;
    };
    ammunition: Array<{
      type: string;
      quantity: number;
      max: number;
    }>;
  };
}

export interface AirBase extends StrategicBase {}

export interface RadarStation {
  id: string;
  name: string;
  type: "PS-861" | "PS-870";
  coordinates: { lat: number; lng: number };
  coverageKm: number;
  linkedBaseIds: BaseType[];
  status: "Active" | "Standby" | "Maintenance";
}

export interface AirDefenseBattery {
  id: string;
  name: string;
  system: "Patriot" | "RBS 98";
  coordinates: { lat: number; lng: number };
  coverageKm: number;
  missiles: {
    ready: number;
    max: number;
  };
  linkedBaseIds: BaseType[];
  status: "Ready" | "Relocating" | "Maintenance";
}

export interface BalticAirCommandScenario {
  id: string;
  name: string;
  theatre: string;
  generatedAt: string;
  bases: AirBase[];
  aircraft: Aircraft[];
  radarStations: RadarStation[];
  airDefenseBatteries: AirDefenseBattery[];
}
