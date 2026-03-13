import type { BaseZoneType } from "@/types/game";

/** Zone capacities per base type */
export const ZONE_CAPACITIES: Record<"huvudbas" | "sidobas" | "reservbas", Record<BaseZoneType, number>> = {
  huvudbas: {
    runway: 2,
    prep_slot: 4,
    front_maintenance: 4,
    rear_maintenance: 2,
    parking: 40,
    fuel_zone: 4,
    ammo_zone: 3,
    spare_parts_zone: 1,
    logistics_area: 1,
  },
  sidobas: {
    runway: 1,
    prep_slot: 2,
    front_maintenance: 2,
    rear_maintenance: 1,
    parking: 20,
    fuel_zone: 2,
    ammo_zone: 2,
    spare_parts_zone: 1,
    logistics_area: 1,
  },
  reservbas: {
    runway: 1,
    prep_slot: 1,
    front_maintenance: 1,
    rear_maintenance: 0,
    parking: 10,
    fuel_zone: 1,
    ammo_zone: 1,
    spare_parts_zone: 1,
    logistics_area: 1,
  },
};

/** Personnel required per action type */
export const PERSONNEL_REQUIREMENTS = {
  preparation: { mechanic: 2, technician: 1, armorer: 1, fuel: 1, command: 0 },
  maintenance_quick: { mechanic: 1, technician: 1, armorer: 0, fuel: 0, command: 0 },
  maintenance_complex: { mechanic: 2, technician: 2, armorer: 0, fuel: 0, command: 0 },
  recovery: { mechanic: 1, technician: 0, armorer: 0, fuel: 1, command: 0 },
  dispatch: { mechanic: 0, technician: 0, armorer: 0, fuel: 0, command: 1 },
} as const;

/** Maintenance facility capabilities */
export const FACILITY_CAPABILITIES = {
  service_bay: ["AU_steg_1", "FK_steg_1_3", "hjulbyte"] as const,
  minor_workshop: ["AU_steg_2_3", "FK_steg_1_3", "kompositrep"] as const,
  major_workshop: ["AU_steg_4", "AU_steg_2_3", "FK_steg_1_3", "kompositrep", "hjulbyte"] as const,
} as const;

/** Resource consumption rates per scenario phase (per hour) */
export const FUEL_DRAIN_RATE: Record<string, number> = {
  FRED: 0.5,
  KRIS: 1.5,
  KRIG: 3.0,
};
