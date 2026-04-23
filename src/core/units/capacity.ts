import type { Base } from "@/types/game";
import type { Unit } from "@/types/units";
import { UNIT_TYPE_CONFIG } from "@/data/config/unitTypes";

export interface CapacityResult {
  ok: boolean;
  reason?: string;
}

export function canStoreUnit(base: Base, unit: Unit): CapacityResult {
  const cfg = UNIT_TYPE_CONFIG[unit.category];
  if (!cfg.infrastructureGated) return { ok: true };

  const zone = base.zones.find(z => z.type === cfg.homeZone);
  if (!zone) {
    return { ok: false, reason: `No ${cfg.homeZone} zone at ${base.name}` };
  }
  const occupied = base.units.filter(u => {
    const uCfg = UNIT_TYPE_CONFIG[u.category];
    return uCfg.infrastructureGated && uCfg.homeZone === cfg.homeZone;
  }).length;
  if (occupied + cfg.slotCost > zone.capacity) {
    return { ok: false, reason: `${cfg.homeZone} full at ${base.name}` };
  }
  return { ok: true };
}

export function recomputeZoneOccupancy(base: Base): Base {
  const zones = base.zones.map(zone => {
    const occupants = base.units
      .filter(u => {
        const cfg = UNIT_TYPE_CONFIG[u.category];
        return cfg.infrastructureGated && cfg.homeZone === zone.type;
      })
      .map(u => u.id);
    return { ...zone, currentQueue: occupants };
  });
  return { ...base, zones };
}
