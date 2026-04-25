import type { AircraftType } from "@/types/game";

/**
 * Performance specs per aircraft type at full fuel & standard load.
 * `maxRangeKm` = ferry range (no reserves) — combat radius is roughly half.
 * `cruiseSpeedKts` = optimal cruise (used for time-to-distance).
 */
export interface AircraftSpec {
  maxRangeKm: number;
  cruiseSpeedKts: number;
}

export const AIRCRAFT_SPECS: Record<AircraftType, AircraftSpec> = {
  GripenE:    { maxRangeKm: 4000, cruiseSpeedKts: 540 },
  GripenF_EA: { maxRangeKm: 3800, cruiseSpeedKts: 530 },
  GlobalEye:  { maxRangeKm: 9300, cruiseSpeedKts: 470 },
  VLO_UCAV:   { maxRangeKm: 3000, cruiseSpeedKts: 450 },
  LOTUS:      { maxRangeKm: 2500, cruiseSpeedKts: 480 },
};
