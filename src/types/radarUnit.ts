import { UnitBase, GroundRadarType } from './units';

export type RadarStatus = 'standby' | 'operational' | 'maintenance';

export interface ExtendedRadarUnit extends UnitBase {
  category: 'radar';
  type: GroundRadarType;
  status: RadarStatus;           // Mapping from deployedState/emitting if needed, but using mission specific status
  rangeRadius: number;           // meters — detection range
  sweepSpeed: number;            // degrees per second (default: 6 = full rotation in 60s)
  faction: 'friendly';
  detectedContactIds: string[];  // IDs of threats/objects currently within range
  basePosition: { lat: number; lng: number }; // For reset position
}

export const RADAR_DEFAULTS = {
  rangeRadius: 450000,   // 450 km — PS-860 real-world spec
  sweepSpeed: 6,         // degrees/second
};
