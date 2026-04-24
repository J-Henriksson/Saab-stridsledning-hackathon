import { GameState, Base, SparePartStock, PersonnelGroup, ATOOrder, BaseZone, AircraftType, GameEvent } from "@/types/game";
import { ZONE_CAPACITIES } from "@/data/config/capacities";
import {
  createAircraftUnit,
  createDeployedDroneUnit,
  createDroneUnit,
  createAirDefenseUnit,
  createGroundVehicleUnit,
  createRadarUnit,
} from "@/core/units/factory";
import type { Unit, AircraftUnit } from "@/types/units";
import { BASE_COORDS } from "@/pages/map/constants";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import type { TacticalZone } from "@/types/overlay";
import { DEMO_RADAR_UNITS } from "./radarUnits";

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

  // Drones: SKYM-12 ready at MOB; SKYM-13 ready at FOB_N; FOB_S none
  // SKYM-11 (airborne) and RED-UAV-01 (hostile) are seeded into deployedUnits below
  if (baseId === "MOB") {
    units.push(createDroneUnit({
      id: "drone-skym-12",
      name: "SKYM-12",
      type: "ISR_DRONE",
      position: pos,
      currentBase: "MOB",
      status: "ready",
      fuel: 100,
    }));
  } else if (baseId === "FOB_N") {
    units.push(createDroneUnit({
      id: "drone-skym-13",
      name: "SKYM-13",
      type: "ISR_DRONE",
      position: pos,
      currentBase: "FOB_N",
      status: "ready",
      fuel: 100,
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

const SKYM_11 = createDeployedDroneUnit({
  id: "drone-skym-11",
  name: "SKYM-11",
  type: "ISR_DRONE",
  position: { lat: 65.5, lng: 22.5 },
  currentBase: "MOB",
  fuel: 72,
  enduranceHours: 18,
});

const RED_UAV_01 = createDeployedDroneUnit({
  id: "drone-red-uav-01",
  name: "RED-UAV-01",
  type: "ISR_DRONE",
  affiliation: "hostile",
  position: { lat: 56.0, lng: 21.0 },
  currentBase: null,
  fuel: 85,
  enduranceHours: 18,
});

export const initialGameState: GameState = {
  day: 1,
  hour: new Date().getHours(),
  minute: new Date().getMinutes(),
  second: new Date().getSeconds(),
  phase: "FRED",
  bases: [MOB, FOB_N, FOB_S],
  deployedUnits: [...DEMO_RADAR_UNITS, SKYM_11, RED_UAV_01],
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
  roadBases: [
    {
      id: "rob-e21-seed",
      name: "ROB-E21",
      coords: { lat: 59.85, lng: 17.65 },
      status: "Operativ" as const,
      echelon: "Platoon" as const,
      parentBaseId: "F16",
      isDraggable: true as const,
      rangeRadius: 15,
      createdAt: 1,
    },
  ],
  tacticalZones: generateFixedZones(),
  overlayVisibility: {
    militaryAssets: true,
    civilianInfrastructure: true,
    activeZones: true,
    flygvapnet: false,
    militaryBases: true,
    criticalInfra: true,
    skyddsobjekt: true,
    radarUnits: true,
    drones: true,
  },
};
