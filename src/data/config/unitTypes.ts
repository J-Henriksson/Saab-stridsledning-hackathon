import type { BaseZoneType } from "@/types/game";
import type { UnitCategory } from "@/types/units";

export interface UnitTypeConfig {
  category: UnitCategory;
  infrastructureGated: boolean;
  homeZone?: BaseZoneType;
  slotCost: number;
  defaultSidc: string;
}

export const UNIT_TYPE_CONFIG: Record<UnitCategory, UnitTypeConfig> = {
  aircraft:       { category: "aircraft",       infrastructureGated: true,  homeZone: "parking", slotCost: 1, defaultSidc: "10031000001103000000" },
  drone:          { category: "drone",          infrastructureGated: true,  homeZone: "parking", slotCost: 1, defaultSidc: "10031100001105000000" },
  air_defense:    { category: "air_defense",    infrastructureGated: false,                      slotCost: 1, defaultSidc: "10061000001330010000" },
  ground_vehicle: { category: "ground_vehicle", infrastructureGated: false,                      slotCost: 1, defaultSidc: "10061000001211000000" },
  radar:          { category: "radar",          infrastructureGated: false,                      slotCost: 1, defaultSidc: "10062000001120000000" },
};
