import { GameState, Base, SparePartStock, PersonnelGroup, ATOOrder, BaseZone, AircraftType, GameEvent } from "@/types/game";
import { ZONE_CAPACITIES } from "@/data/config/capacities";
import {
  createAircraftUnit,
  createDroneUnit,
  createAirDefenseUnit,
  createGroundVehicleUnit,
  createRadarUnit,
} from "@/core/units/factory";
import type { Unit, AircraftUnit } from "@/types/units";
import { BASE_COORDS } from "@/pages/map/constants";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import type { TacticalZone } from "@/types/overlay";

const createSpareParts = (): SparePartStock[] => [
  { id: "radar", name: "Radar LRU", category: "Avionik", quantity: 4, maxQuantity: 6, reservedQuantity: 0, resupplyDays: 5, onOrder: 0, leadTime: 5, source: "base_stock", turnaround: 5, isReusable: true },
  { id: "engine", name: "Motor RM12", category: "Drivlina", quantity: 2, maxQuantity: 3, reservedQuantity: 0, resupplyDays: 30, onOrder: 0, leadTime: 30, source: "central_stock", turnaround: 30, isReusable: true },
  { id: "ejection", name: "Katapultstol", category: "Säkerhet", quantity: 3, maxQuantity: 4, reservedQuantity: 0, resupplyDays: 10, onOrder: 0, leadTime: 10, source: "central_stock", turnaround: 10, isReusable: false },
  { id: "hydraulic", name: "Hydraulenhet", category: "System", quantity: 5, maxQuantity: 8, reservedQuantity: 0, resupplyDays: 7, onOrder: 0, leadTime: 7, source: "base_stock", turnaround: 7, isReusable: true },
  { id: "wheel", name: "Hjul/Bromsar", category: "Landställ", quantity: 6, maxQuantity: 10, reservedQuantity: 0, resupplyDays: 3, onOrder: 0, leadTime: 3, source: "base_stock", turnaround: 3, isReusable: false },
  { id: "computer", name: "Datorenhet", category: "Avionik", quantity: 4, maxQuantity: 6, reservedQuantity: 0, resupplyDays: 5, onOrder: 0, leadTime: 5, source: "base_stock", turnaround: 5, isReusable: true },
  { id: "ue_radar", name: "UE Radar", category: "UE", quantity: 2, maxQuantity: 4, reservedQuantity: 0, resupplyDays: 5, onOrder: 0, leadTime: 5, source: "central_stock", turnaround: 30, isReusable: true },
  { id: "ue_motor", name: "UE Motor", category: "UE", quantity: 1, maxQuantity: 2, reservedQuantity: 0, resupplyDays: 5, onOrder: 0, leadTime: 5, source: "mro", turnaround: 30, isReusable: true },
];

// MOB (scale=1) = 150 total. ~13 crew per aircraft in service → realistic for 8-bay operation.
// FOB_N (scale=0.7) ≈ 105, FOB_S (scale=0.5) ≈ 75
const createPersonnel = (scale: number): PersonnelGroup[] => [
  { id: "pilot",   role: "Pilot",                 available: Math.round(20 * scale), total: Math.round(24 * scale), onDuty: true },
  { id: "mech",    role: "Flygmekaniker",        available: Math.round(65 * scale), total: Math.round(80 * scale), onDuty: true },
  { id: "tech",    role: "Tekniker Avionik",      available: Math.round(24 * scale), total: Math.round(30 * scale), onDuty: true },
  { id: "arms",    role: "Vapensmed",             available: Math.round(16 * scale), total: Math.round(20 * scale), onDuty: true },
  { id: "fuel",    role: "Drivmedelspersonal",    available: Math.round(10 * scale), total: Math.round(12 * scale), onDuty: true },
  { id: "command", role: "Basbefäl",              available: Math.round( 7 * scale), total: Math.round( 8 * scale), onDuty: true },
];

const createAircraft = (base: string, type: AircraftType, prefix: string, count: number): AircraftUnit[] =>
  Array.from({ length: count }, (_, i) => {
    const tailNumber = `${prefix}${String(i + 1).padStart(2, "0")}`;
    const unit = createAircraftUnit({
      id: `${base}_${tailNumber}`,
      tailNumber,
      name: tailNumber,
      type,
      role: type === "GlobalEye" ? "awacs" : type === "VLO_UCAV" ? "ucav" : "fighter",
      position: BASE_COORDS[base] ?? { lat: 58, lng: 15 },
      currentBase: base as any,
    });

    // Make some aircraft airborne for the demo
    if (i === 0 && (base === "MOB" || base === "FOB_N")) {
      const dest = base === "MOB" ? { lat: 59.33, lng: 18.07 } : { lat: 64.5, lng: 23.5 };
      return {
        ...unit,
        status: "on_mission",
        currentMission: "DCA",
        movement: {
          state: "airborne",
          speed: 420,
          destination: dest,
        },
        flightHours: Math.round(Math.random() * 80 + 10),
        hoursToService: Math.round(Math.random() * 60 + 20),
        health: Math.round(Math.random() * 20 + 80),
      };
    }
    // Match old random initial values
    return {
      ...unit,
      flightHours: Math.round(Math.random() * 80 + 10),
      hoursToService: Math.round(Math.random() * 60 + 20),
      health: Math.round(Math.random() * 20 + 80),
    };
  });

function seedUnitsForBase(baseId: "MOB" | "FOB_N" | "FOB_S", aircraftList: AircraftUnit[]): Unit[] {
  const pos = BASE_COORDS[baseId];
  const units: Unit[] = [...aircraftList]; // aircraft are first-class units now

  // Drones (MOB, FOB_N only)
  const droneCount = baseId === "FOB_S" ? 0 : 4;
  for (let i = 0; i < droneCount; i++) {
    units.push(createDroneUnit({
      name: `${baseId}-DRN-${i + 1}`,
      type: "ISR_DRONE",
      position: pos,
      currentBase: baseId,
    }));
  }

  // Air defense
  const adConfig: { type: "SAM_LONG" | "SAM_MEDIUM" }[] = {
    MOB: [{ type: "SAM_LONG" as const }, { type: "SAM_LONG" as const }],
    FOB_N: [{ type: "SAM_MEDIUM" as const }],
    FOB_S: [{ type: "SAM_MEDIUM" as const }],
  }[baseId];
  adConfig.forEach((cfg, i) => {
    units.push(createAirDefenseUnit({
      name: `${baseId}-AD-${i + 1}`,
      type: cfg.type,
      position: pos,
      currentBase: baseId,
    }));
  });

  // Ground vehicles
  const gvCount = { MOB: 6, FOB_N: 4, FOB_S: 2 }[baseId];
  const gvTypes: ("LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER")[] =
    ["LOGISTICS_TRUCK", "ARMORED_TRANSPORT", "FUEL_BOWSER"];
  for (let i = 0; i < gvCount; i++) {
    units.push(createGroundVehicleUnit({
      name: `${baseId}-GV-${i + 1}`,
      type: gvTypes[i % gvTypes.length],
      position: pos,
      currentBase: baseId,
    }));
  }

  // Ground radar
  units.push(createRadarUnit({
    name: `${baseId}-RAD-1`,
    type: "SEARCH_RADAR",
    position: pos,
    currentBase: baseId,
  }));

  return units;
}

const createZones = (baseType: "huvudbas" | "sidobas" | "reservbas", baseId: string): BaseZone[] => {
  const caps = ZONE_CAPACITIES[baseType];
  return Object.entries(caps).map(([zoneType, capacity]) => ({
    id: `${baseId}_${zoneType}`,
    type: zoneType as any,
    capacity,
    currentQueue: [],
    assignedWork: [],
    resourceStock: {},
  }));
};

const MOB_AIRCRAFT: AircraftUnit[] = [
  ...createAircraft("MOB", "GripenE", "GE", 12),
  ...createAircraft("MOB", "GlobalEye", "GE-AEW", 1),
];

const MOB: Base = {
  id: "MOB",
  name: "Huvudbas MOB",
  type: "huvudbas",
  units: seedUnitsForBase("MOB", MOB_AIRCRAFT),
  spareParts: createSpareParts(),
  personnel: createPersonnel(1),
  fuel: 95,
  maxFuel: 100,
  ammunition: [
    { type: "IRIS-T", quantity: 24, max: 32 },
    { type: "Meteor", quantity: 12, max: 16 },
    { type: "GBU-39", quantity: 16, max: 24 },
    { type: "RBS-15F", quantity: 6, max: 8 },
  ],
  maintenanceBays: { total: 8, occupied: 0 },
  zones: createZones("huvudbas", "MOB"),
};

const FOB_N_AIRCRAFT: AircraftUnit[] = [
  ...createAircraft("FOB_N", "GripenE", "GE", 12),
  ...createAircraft("FOB_N", "LOTUS", "LO", 2),
];

const FOB_N: Base = {
  id: "FOB_N",
  name: "Sidobas FOB Nord",
  type: "sidobas",
  units: seedUnitsForBase("FOB_N", FOB_N_AIRCRAFT),
  spareParts: createSpareParts().map((p) => ({
    ...p,
    quantity: Math.ceil(p.quantity * 0.6),
    maxQuantity: Math.ceil(p.maxQuantity * 0.6),
  })),
  personnel: createPersonnel(0.7),
  fuel: 80,
  maxFuel: 100,
  ammunition: [
    { type: "IRIS-T", quantity: 16, max: 20 },
    { type: "Meteor", quantity: 8, max: 10 },
    { type: "GBU-39", quantity: 8, max: 12 },
  ],
  maintenanceBays: { total: 2, occupied: 0 },
  zones: createZones("sidobas", "FOB_N"),
};

const FOB_S_AIRCRAFT: AircraftUnit[] = createAircraft("FOB_S", "GripenF_EA", "GF", 6);

const FOB_S: Base = {
  id: "FOB_S",
  name: "Sidobas FOB Syd",
  type: "sidobas",
  units: seedUnitsForBase("FOB_S", FOB_S_AIRCRAFT),
  spareParts: createSpareParts().map((p) => ({
    ...p,
    quantity: Math.ceil(p.quantity * 0.5),
    maxQuantity: Math.ceil(p.maxQuantity * 0.5),
  })),
  personnel: createPersonnel(0.5),
  fuel: 70,
  maxFuel: 100,
  ammunition: [
    { type: "IRIS-T", quantity: 8, max: 12 },
    { type: "Meteor", quantity: 6, max: 8 },
  ],
  maintenanceBays: { total: 1, occupied: 0 },
  zones: createZones("sidobas", "FOB_S"),
};

// ── Baltic scenario — ARNA (F 16 Uppsala) & VISBY ────────────────────────────

function createBalticAircraft(
  baseId: "ARNA" | "VISBY",
  type: AircraftType,
  prefix: string,
  count: number,
  tacOverrides: Array<Partial<AircraftUnit>> = []
): AircraftUnit[] {
  const pos = BASE_COORDS[baseId] ?? { lat: 59, lng: 18 };
  const wing = baseId === "ARNA" ? "F 16" : "Gotland";
  return Array.from({ length: count }, (_, i) => {
    const tailNumber = `${prefix}${String(i + 1).padStart(2, "0")}`;
    const unit = createAircraftUnit({
      id: `${baseId}_${tailNumber}`,
      tailNumber,
      name: tailNumber,
      type,
      role: type === "GlobalEye" ? "awacs" : type === "TP84" ? "transport" : "fighter",
      position: pos,
      currentBase: baseId,
    });
    return {
      ...unit,
      flightHours: Math.round(Math.random() * 60 + 15),
      hoursToService: Math.round(Math.random() * 50 + 20),
      health: Math.round(Math.random() * 15 + 85),
      wing,
      ...(tacOverrides[i] ?? {}),
    } as AircraftUnit;
  });
}

function seedBalticBase(baseId: "ARNA" | "VISBY", aircraftList: AircraftUnit[]): Unit[] {
  const pos = BASE_COORDS[baseId] ?? { lat: 59, lng: 18 };
  const units: Unit[] = [...aircraftList];
  units.push(createAirDefenseUnit({
    name: `${baseId}-AD-1`,
    type: baseId === "ARNA" ? "SAM_LONG" : "SAM_MEDIUM",
    position: pos,
    currentBase: baseId,
  }));
  units.push(createRadarUnit({
    name: `${baseId}-RAD-1`,
    type: "SEARCH_RADAR",
    position: pos,
    currentBase: baseId,
  }));
  (["LOGISTICS_TRUCK", "FUEL_BOWSER", "ARMORED_TRANSPORT"] as const).forEach((t, i) => {
    units.push(createGroundVehicleUnit({ name: `${baseId}-GV-${i + 1}`, type: t, position: pos, currentBase: baseId }));
  });
  return units;
}

const nowHour = new Date().getHours();

const ARNA_AIRCRAFT: AircraftUnit[] = [
  ...createBalticAircraft("ARNA", "GripenE", "GE", 4, [
    {
      callsign: "VIKING 1", squawkCode: "2401", wing: "F 16",
      status: "on_mission", tacMission: "CAP", currentMission: "CAP",
      missionEndHour: (nowHour + 2) % 24,
      position: { lat: 59.5, lng: 19.0 },
      movement: { state: "airborne", speed: 480, heading: 90, destination: { lat: 59.5, lng: 21.0 } },
      radarActive: true, radarRangeKm: 120, radarAzimuthHalfDeg: 60,
      weaponLoadout: { aam: 4, pods: ["EW-pod"] },
      fuelStatus: "Normal", fuel: 72, machSpeed: 0.82, verticalRate: 0,
    },
    {
      callsign: "VIKING 2", squawkCode: "2402", wing: "F 16",
      status: "ready", tacMission: "QRA",
      radarActive: false, weaponLoadout: { aam: 4 }, fuelStatus: "Normal", fuel: 98,
    },
    {
      callsign: "VIKING 3", squawkCode: "2403", wing: "F 16",
      status: "ready", tacMission: "QRA",
      radarActive: false, weaponLoadout: { aam: 2, agm: 2 }, fuelStatus: "Normal", fuel: 95,
    },
    {
      callsign: "VIKING 4", squawkCode: "2404", wing: "F 16",
      status: "under_maintenance", radarActive: false, fuel: 40,
    },
  ]),
  ...createBalticAircraft("ARNA", "GlobalEye", "AEW", 1, [
    {
      callsign: "ARGUS 1", squawkCode: "7777", wing: "F 16",
      status: "on_mission", tacMission: "RECON", currentMission: "AEW",
      missionEndHour: (nowHour + 4) % 24,
      position: { lat: 58.0, lng: 20.0 },
      movement: { state: "airborne", speed: 350, heading: 60, destination: { lat: 59.0, lng: 21.0 } },
      radarActive: true, radarRangeKm: 350, radarAzimuthHalfDeg: 120,
      weaponLoadout: { pods: ["PS-890 Erieye"] },
      fuelStatus: "Normal", fuel: 65, machSpeed: 0.54, verticalRate: 0,
    },
  ]),
];

const ARNA: Base = {
  id: "ARNA",
  name: "F 16 Uppsala/Ärna",
  type: "sidobas",
  units: seedBalticBase("ARNA", ARNA_AIRCRAFT),
  spareParts: createSpareParts().map((p) => ({ ...p, quantity: Math.ceil(p.quantity * 0.65), maxQuantity: Math.ceil(p.maxQuantity * 0.65) })),
  personnel: createPersonnel(0.6),
  fuel: 85, maxFuel: 100,
  ammunition: [
    { type: "IRIS-T", quantity: 12, max: 20 },
    { type: "Meteor", quantity: 8, max: 12 },
    { type: "KEPD 350", quantity: 4, max: 8 },
  ],
  maintenanceBays: { total: 3, occupied: 1 },
  zones: createZones("sidobas", "ARNA"),
  icaoCode: "ESCM", hangarCapacity: 6, rampCapacity: 10,
  defenseUnitIds: ["ARNA-AD-1"],
  weather: { windKts: 8, windDirDeg: 240, visibilityKm: 15, ceilingFt: 0, condition: "VMC" },
};

const VISBY_AIRCRAFT: AircraftUnit[] = [
  ...createBalticAircraft("VISBY", "GripenE", "GE", 3, [
    {
      callsign: "ODIN 1", squawkCode: "2501", wing: "Gotland",
      status: "on_mission", tacMission: "RECON", currentMission: "RECCE",
      missionEndHour: (nowHour + 1) % 24,
      position: { lat: 57.5, lng: 21.0 },
      movement: { state: "airborne", speed: 420, heading: 45, destination: { lat: 58.5, lng: 22.0 } },
      radarActive: true, radarRangeKm: 110, radarAzimuthHalfDeg: 55,
      weaponLoadout: { aam: 2, pods: ["RECCE-pod"] },
      fuelStatus: "Joker", fuel: 28, machSpeed: 0.78, verticalRate: -500,
    },
    {
      callsign: "ODIN 2", squawkCode: "2502", wing: "Gotland",
      status: "ready", tacMission: "QRA",
      radarActive: false, weaponLoadout: { aam: 4 }, fuelStatus: "Normal", fuel: 99, isTargeted: false,
    },
    {
      callsign: "ODIN 3", squawkCode: "2503", wing: "Gotland",
      status: "ready", tacMission: "CAP",
      radarActive: false, weaponLoadout: { aam: 4, agm: 2 }, fuelStatus: "Normal", fuel: 92,
    },
  ]),
  ...createBalticAircraft("VISBY", "TP84", "TP", 1, [
    {
      callsign: "TRANSPORT 1", squawkCode: "2510", wing: "Gotland",
      status: "ready", role: "transport",
      radarActive: false, weaponLoadout: {}, fuelStatus: "Normal", fuel: 88,
    },
  ]),
];

const VISBY_BASE: Base = {
  id: "VISBY",
  name: "Visby flygbas",
  type: "reservbas",
  units: seedBalticBase("VISBY", VISBY_AIRCRAFT),
  spareParts: createSpareParts().map((p) => ({ ...p, quantity: Math.ceil(p.quantity * 0.4), maxQuantity: Math.ceil(p.maxQuantity * 0.4) })),
  personnel: createPersonnel(0.35),
  fuel: 60, maxFuel: 100,
  ammunition: [
    { type: "IRIS-T", quantity: 8, max: 12 },
    { type: "Meteor", quantity: 4, max: 8 },
  ],
  maintenanceBays: { total: 2, occupied: 0 },
  zones: createZones("reservbas", "VISBY"),
  icaoCode: "ESSV", hangarCapacity: 4, rampCapacity: 8,
  defenseUnitIds: ["VISBY-AD-1"],
  weather: { windKts: 14, windDirDeg: 190, visibilityKm: 8, ceilingFt: 2500, condition: "MVMC" },
};

export const initialATOOrders: ATOOrder[] = [
  {
    id: "ato-qra-1",
    day: 1,
    missionType: "QRA",
    label: "Beredskapsinsats H24",
    startHour: 0,
    endHour: 24,
    requiredCount: 2,
    aircraftType: "GripenE",
    payload: "IRIS-T",
    launchBase: "MOB",
    priority: "high",
    status: "pending",
    assignedAircraft: [],
    sortiesPerDay: 1,
  },
  {
    id: "ato-recce-1",
    day: 1,
    missionType: "RECCE",
    label: "Spaningsuppdrag",
    startHour: 8,
    endHour: 12,
    requiredCount: 2,
    aircraftType: "GripenE",
    payload: "SPANING-POD",
    launchBase: "FOB_N",
    priority: "medium",
    status: "pending",
    assignedAircraft: [],
  },
];

export const generateATOOrders = (day: number, phase: string): ATOOrder[] => {
  const orders: ATOOrder[] = [
    {
      id: `ato-qra-${day}`,
      day,
      missionType: "QRA",
      label: "Beredskapsinsats H24",
      startHour: 0,
      endHour: 24,
      requiredCount: 2,
      aircraftType: "GripenE",
      payload: "IRIS-T",
      launchBase: "MOB",
      priority: "high",
      status: "pending",
      assignedAircraft: [],
    },
  ];

  if (phase === "FRED") {
    orders.push({
      id: `ato-recce-${day}`,
      day,
      missionType: "RECCE",
      label: "Daglig spaning",
      startHour: 8,
      endHour: 12,
      requiredCount: 2,
      aircraftType: "GripenE",
      payload: "SPANING-POD",
      launchBase: "FOB_N",
      priority: "medium",
      status: "pending",
      assignedAircraft: [],
    });
  } else if (phase === "KRIS") {
    orders.push(
      {
        id: `ato-dca-${day}`,
        day,
        missionType: "DCA",
        label: "Defensivt luftförsvar",
        startHour: 6,
        endHour: 14,
        requiredCount: 4,
        aircraftType: "GripenE",
        payload: "IRIS-T + Meteor",
        launchBase: "MOB",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-aew-${day}`,
        day,
        missionType: "AEW",
        label: "Luftövervakning",
        startHour: 6,
        endHour: 18,
        requiredCount: 1,
        aircraftType: "GlobalEye",
        payload: "GlobalEye-sensor",
        launchBase: "MOB",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-recce-${day}`,
        day,
        missionType: "RECCE",
        label: "Spaningsuppdrag",
        startHour: 10,
        endHour: 14,
        requiredCount: 2,
        aircraftType: "GripenE",
        launchBase: "FOB_N",
        priority: "medium",
        status: "pending",
        assignedAircraft: [],
      }
    );
  } else {
    // KRIG
    orders.push(
      {
        id: `ato-dca1-${day}`,
        day,
        missionType: "DCA",
        label: "Luftförsvar omgång 1",
        startHour: 6,
        endHour: 12,
        requiredCount: 6,
        aircraftType: "GripenE",
        payload: "IRIS-T + Meteor",
        launchBase: "MOB",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-dca2-${day}`,
        day,
        missionType: "DCA",
        label: "Luftförsvar omgång 2",
        startHour: 12,
        endHour: 18,
        requiredCount: 6,
        aircraftType: "GripenE",
        payload: "IRIS-T + Meteor",
        launchBase: "FOB_N",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-ai-${day}`,
        day,
        missionType: "AI_DT",
        label: "Attackuppdrag dagljus",
        startHour: 8,
        endHour: 11,
        requiredCount: 4,
        aircraftType: "GripenE",
        payload: "GBU-39 + RBS-15F",
        launchBase: "FOB_S",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-recce-${day}`,
        day,
        missionType: "RECCE",
        label: "Spaningsuppdrag",
        startHour: 7,
        endHour: 15,
        requiredCount: 2,
        aircraftType: "GripenE",
        launchBase: "FOB_N",
        priority: "medium",
        status: "pending",
        assignedAircraft: [],
      },
      {
        id: `ato-escort-${day}`,
        day,
        missionType: "ESCORT",
        label: "Eskortuppdrag",
        startHour: 8,
        endHour: 11,
        requiredCount: 2,
        aircraftType: "GripenF_EA",
        payload: "IRIS-T",
        launchBase: "FOB_S",
        priority: "high",
        status: "pending",
        assignedAircraft: [],
      }
    );
  }

  return orders;
};

function generateFixedZones(): TacticalZone[] {
  return [...FIXED_MILITARY_ASSETS, ...AMMO_DEPOTS]
    .filter((a) => a.protectionRadiusKm)
    .map((asset) => ({
      id: `fixed-zone-${asset.id}`,
      name: `Skyddszon ${asset.shortName}`,
      category: "fixed" as const,
      shape: "circle" as const,
      center: { lat: asset.lat, lng: asset.lng },
      radiusKm: asset.protectionRadiusKm!,
      fixedType: asset.type === "naval_base" ? ("high_security" as const) : ("no_fly" as const),
      createdAtHour: 6,
      createdAtDay: 1,
      description: `Permanent skyddszon runt ${asset.name}`,
      createdBy: "SYSTEM",
    }));
}

export const initialGameState: GameState = {
  day: 1,
  hour: new Date().getHours(),
  minute: new Date().getMinutes(),
  second: new Date().getSeconds(),
  phase: "FRED",
  bases: [MOB, FOB_N, FOB_S, ARNA, VISBY_BASE],
  deployedUnits: [],
  successfulMissions: 0,
  failedMissions: 0,
  atoOrders: initialATOOrders,
  isRunning: true,
  gameSpeed: 1,
  events: [
    { id: "init", timestamp: "Dag 1 06:00", type: "info", message: "Systemet initierat. ATO mottagen. Fredstillstånd." },
  ] as GameEvent[],
  recommendations: [],
  maintenanceTasks: [],
  pendingLandingChecks: [],
  enemyBases: [],
  enemyEntities: [],
  friendlyMarkers: [],
  friendlyEntities: [],
  tacticalZones: generateFixedZones(),
  overlayVisibility: {
    militaryAssets: true,
    civilianInfrastructure: true,
    activeZones: true,
    flygvapnet: false,
    militaryBases: true,
    criticalInfra: true,
    skyddsobjekt: true,
  },
};
