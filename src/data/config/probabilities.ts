import type { MaintenanceType, FacilityType, CapabilityLevel } from "@/types/game";

/**
 * Utfall dice tables from the SAAB simulation deck.
 * Two contexts: A) Loading/fueling/startup BIT, B) Reception/post-mission
 */

export interface UtfallOutcome {
  roll: number;
  faultType: MaintenanceType;
  repairTime: number; // hours
  facility: FacilityType;
  capability: CapabilityLevel;
  description: string;
}

/** Table A: Loading/fueling/startup BIT outcomes */
export const UTFALL_TABLE_A: UtfallOutcome[] = [
  { roll: 1, faultType: "quick_lru",       repairTime: 2,  facility: "service_bay",     capability: "AU_steg_1",   description: "Snabb LRU-byte (avionik)" },
  { roll: 2, faultType: "quick_lru",       repairTime: 2,  facility: "service_bay",     capability: "AU_steg_1",   description: "Snabb LRU-byte (hydraulik)" },
  { roll: 3, faultType: "complex_lru",     repairTime: 6,  facility: "minor_workshop",  capability: "AU_steg_2_3", description: "Komplex LRU-byte, felsökning" },
  { roll: 4, faultType: "direct_repair",   repairTime: 16, facility: "major_workshop",  capability: "AU_steg_4",   description: "Direkt reparation, omfattande" },
  { roll: 5, faultType: "troubleshooting", repairTime: 4,  facility: "service_bay",     capability: "FK_steg_1_3", description: "Felsökning och åtgärd" },
  { roll: 6, faultType: "troubleshooting", repairTime: 4,  facility: "minor_workshop",  capability: "kompositrep", description: "Felsökning, kompositskada" },
];

/** Table B: Reception/post-mission outcomes */
export const UTFALL_TABLE_B: UtfallOutcome[] = [
  { roll: 1, faultType: "quick_lru",       repairTime: 2,  facility: "service_bay",     capability: "hjulbyte",    description: "Hjulbyte efter landning" },
  { roll: 2, faultType: "quick_lru",       repairTime: 2,  facility: "service_bay",     capability: "AU_steg_1",   description: "LRU-byte, sensorfel" },
  { roll: 3, faultType: "direct_repair",   repairTime: 6,  facility: "minor_workshop",  capability: "FK_steg_1_3", description: "Direkt reparation, structural" },
  { roll: 4, faultType: "troubleshooting", repairTime: 16, facility: "major_workshop",  capability: "AU_steg_4",   description: "Omfattande felsökning" },
  { roll: 5, faultType: "complex_lru",     repairTime: 4,  facility: "minor_workshop",  capability: "AU_steg_2_3", description: "Komplex LRU-byte" },
  { roll: 6, faultType: "troubleshooting", repairTime: 4,  facility: "service_bay",     capability: "FK_steg_1_3", description: "Felsökning, EW-system" },
];

/** Weapon loss percentage by roll (1-6) */
export const WEAPON_LOSS_BY_ROLL = [10, 30, 50, 70, 90, 100] as const;

/** Extra maintenance time percentage by roll (1-6) */
export const EXTRA_MAINTENANCE_TIME_BY_ROLL = [0, 0, 0, 10, 20, 50] as const;

/** Scheduled service types (days) */
export const SERVICE_TYPES = {
  A: 5,   // days
  B: 8,   // days
  C: 20,  // days
} as const;

/** Random failure probability per hour for MC aircraft (base rate) */
export const BASE_FAILURE_RATE = 1 / 20; // 5% per turn (1d20 = 1)

/** Failure type weights when a random failure occurs */
export const FAILURE_TYPE_WEIGHTS: { type: MaintenanceType; weight: number; time: number }[] = [
  { type: "quick_lru", weight: 2, time: 2 },
  { type: "complex_lru", weight: 1, time: 6 },
  { type: "direct_repair", weight: 1, time: 16 },
  { type: "troubleshooting", weight: 2, time: 4 },
];
