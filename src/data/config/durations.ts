import type { AircraftType, MaintenanceType } from "@/types/game";

/** Preparation time per aircraft type (minutes) */
export const PREP_TIME: Record<AircraftType, number> = {
  GripenE: 45,
  GripenF_EA: 50,
  GlobalEye: 60,
  VLO_UCAV: 30,
  LOTUS: 40,
};

/** Recovery time after mission (minutes) */
export const RECOVERY_TIME: Record<AircraftType, number> = {
  GripenE: 30,
  GripenF_EA: 30,
  GlobalEye: 45,
  VLO_UCAV: 20,
  LOTUS: 25,
};

/** Fuel loading time per aircraft (minutes) */
export const FUEL_LOADING_TIME: Record<AircraftType, number> = {
  GripenE: 15,
  GripenF_EA: 15,
  GlobalEye: 25,
  VLO_UCAV: 10,
  LOTUS: 12,
};

/** Ammo loading time per aircraft (minutes) */
export const AMMO_LOADING_TIME: Record<AircraftType, number> = {
  GripenE: 20,
  GripenF_EA: 25,
  GlobalEye: 0,
  VLO_UCAV: 15,
  LOTUS: 10,
};

/** Nominal maintenance repair times (hours) */
export const MAINTENANCE_TIMES: Record<MaintenanceType, number> = {
  quick_lru: 2,
  complex_lru: 6,
  direct_repair: 16,
  troubleshooting: 4,
  scheduled_service: 120, // 5 days as hours (type A default)
};

/** UE (exchange unit) cycle times */
export const UE_CYCLE = {
  /** Base stock ↔ Central stock / RESMAT (days) */
  baseToResmat: 5,
  /** MRO loop turnaround (days) */
  mroLoop: 30,
  /** Cannibalization time (hours) */
  cannibalization: 1,
} as const;

/** Scheduled service intervals */
export const SERVICE_INTERVAL_HOURS = 100; // hours between scheduled services

/** Command: prep must be ordered this many hours before takeoff */
export const PREP_LEAD_TIME_HOURS = 1;
