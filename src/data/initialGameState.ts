import { GameState, Base, SparePartStock, PersonnelGroup, ATOOrder, BaseZone, AircraftType, GameEvent, NavalUnit, IntelReport, EnemyBase } from "@/types/game";
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
import { STOCKPILE_TEMPLATES, STRATEGIC_INTENT_BY_CATEGORY, pickByHash } from "@/core/intel/activityTemplates";

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
      parentBaseId: base as any,
      flightHours: Math.round(Math.random() * 80 + 10),
      hoursToService: Math.round(Math.random() * 60 + 20),
      health: Math.round(Math.random() * 20 + 80),
    };
  });

function seedUnitsForBase(baseId: "MOB" | "FOB_N" | "FOB_S", aircraftList: AircraftUnit[]): Unit[] {
  const pos = BASE_COORDS[baseId];
  const units: Unit[] = [...aircraftList]; // aircraft are first-class units now

  // Drones: seeded per base. SKYM-11 (MOB, airborne) and SKYM-14 (FOB_S, airborne)
  // are in deployedUnits below and count toward their base totals.
  const droneCount = baseId === "MOB" ? 15 : 10;
  const dronePrefix = baseId === "MOB" ? "SKYM" : baseId === "FOB_N" ? "SKYM-N" : "SKYM-S";
  const droneIdPrefix = baseId === "MOB" ? "mob" : baseId === "FOB_N" ? "fob-n" : "fob-s";
  Array.from({ length: droneCount }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    units.push(createDroneUnit({
      id: `drone-${droneIdPrefix}-${num}`,
      name: `${dronePrefix}-${num}`,
      type: "ISR_DRONE",
      position: pos,
      currentBase: baseId,
      status: "ready",
      fuel: 100,
    }));
  });

  // Air defense — these are pre-placed, static batteries (Lv) that cannot be
  // relocated. They provide the baseline SAM coverage around each base.
  const adConfig: { type: "SAM_LONG" | "SAM_MEDIUM" }[] = {
    MOB: [{ type: "SAM_LONG" as const }, { type: "SAM_LONG" as const }],
    FOB_N: [{ type: "SAM_MEDIUM" as const }],
    FOB_S: [{ type: "SAM_MEDIUM" as const }],
  }[baseId];
  adConfig.forEach((cfg, i) => {
    const ad = createAirDefenseUnit({
      name: `${baseId}-AD-${i + 1}`,
      type: cfg.type,
      position: pos,
      currentBase: baseId,
    });
    units.push({ ...ad, isStatic: true, parentBaseId: baseId });
  });

  // Ground vehicles
  const gvCount = { MOB: 6, FOB_N: 4, FOB_S: 2 }[baseId];
  const gvTypes: ("LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER")[] =
    ["LOGISTICS_TRUCK", "ARMORED_TRANSPORT", "FUEL_BOWSER"];
  for (let i = 0; i < gvCount; i++) {
    const gv = createGroundVehicleUnit({
      name: `${baseId}-GV-${i + 1}`,
      type: gvTypes[i % gvTypes.length],
      position: pos,
      currentBase: baseId,
    });
    units.push({ ...gv, parentBaseId: baseId });
  }

  // Ground radar
  const rad = createRadarUnit({
    name: `${baseId}-RAD-1`,
    type: "SEARCH_RADAR",
    position: pos,
    currentBase: baseId,
  });
  units.push({ ...rad, parentBaseId: baseId });

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

// ── Airborne friendly patrollers (CAP + AEW + ISR) ────────────────────────
// These spawn already in the air so the theater feels active on load. Each
// has a patrol disc; the engine autonomously re-routes them when they arrive.

// CAP over central Baltic — north-south racetrack (longer straight legs along N-S).
const CAP_GRIPEN_1: AircraftUnit = {
  ...createAircraftUnit({
    id: "cap-gripen-ostersjon-1",
    tailNumber: "GE-CAP-01",
    name: "GE-CAP-01",
    type: "GripenE",
    role: "fighter",
    position: { lat: 58.2, lng: 19.4 },
    currentBase: "MOB",
  }),
  parentBaseId: "MOB",
  status: "on_mission",
  currentMission: "DCA",
  movement: { state: "airborne", speed: 420 },
  patrol: {
    center: { lat: 58.5, lng: 19.7 },
    radiusKm: 110,
    speedKts: 420,
    axisDeg: 0,        // major axis aligned N-S
    clockwise: true,
    aspect: 0.4,
  },
  pathHistory: [],
};

// CAP off Gotland — east-west racetrack parallel to the Swedish coastline.
const CAP_GRIPEN_2: AircraftUnit = {
  ...createAircraftUnit({
    id: "cap-gripen-gotland-1",
    tailNumber: "GE-CAP-02",
    name: "GE-CAP-02",
    type: "GripenE",
    role: "fighter",
    position: { lat: 57.6, lng: 18.9 },
    currentBase: "FOB_S",
  }),
  parentBaseId: "FOB_S",
  status: "on_mission",
  currentMission: "DCA",
  movement: { state: "airborne", speed: 400 },
  patrol: {
    center: { lat: 57.5, lng: 19.0 },
    radiusKm: 90,
    speedKts: 400,
    axisDeg: 90,       // major axis aligned E-W
    clockwise: false,
    aspect: 0.45,
  },
  pathHistory: [],
};

// AEW orbiting high over Stockholm–Uppland at long range — wide E-W oval.
const GLOBAL_EYE_AEW: AircraftUnit = {
  ...createAircraftUnit({
    id: "aew-globaleye-01",
    tailNumber: "GE-AEW-01",
    name: "GE-AEW-01",
    type: "GlobalEye",
    role: "awacs",
    position: { lat: 60.1, lng: 18.8 },
    currentBase: "MOB",
  }),
  parentBaseId: "MOB",
  status: "on_mission",
  currentMission: "AEW",
  movement: { state: "airborne", speed: 300 },
  patrol: {
    center: { lat: 60.1, lng: 18.5 },
    radiusKm: 160,
    speedKts: 300,
    axisDeg: 90,       // E-W orbit along the coast
    clockwise: true,
    aspect: 0.35,      // longer straight legs
  },
  pathHistory: [],
};

// ── Waypoint-following drones (back-and-forth between base areas) ─────────────

// SKYM-15: ISR drone shuttling between MOB area and FOB_N corridor
const WP_15 = [
  { id: "skym15-wp0", lat: 60.2, lng: 16.8 },   // southern leg (MOB corridor)
  { id: "skym15-wp1", lat: 64.2, lng: 21.0 },   // northern leg (FOB_N corridor)
];
const SKYM_15 = {
  ...createDroneUnit({
    id: "drone-skym-15",
    name: "SKYM-15",
    type: "ISR_DRONE" as const,
    position: { lat: 62.1, lng: 18.9 },
    currentBase: "MOB",
    status: "on_mission",
    fuel: 78,
    enduranceHours: 18,
  }),
  parentBaseId: "MOB" as const,
  waypoints: WP_15,
  currentWaypointIdx: 1,
  currentMission: "ISR_DRONE" as const,
  movement: { state: "airborne" as const, speed: 120, destination: WP_15[1] },
  pathHistory: [] as { lat: number; lng: number }[],
};

// SKYM-16: ISR drone patrolling the central corridor MOB ↔ ROB_E
const WP_16 = [
  { id: "skym16-wp0", lat: 58.7, lng: 15.9 },   // near MOB
  { id: "skym16-wp1", lat: 61.0, lng: 17.6 },   // near ROB_E
];
const SKYM_16 = {
  ...createDroneUnit({
    id: "drone-skym-16",
    name: "SKYM-16",
    type: "ISR_DRONE" as const,
    position: { lat: 59.8, lng: 16.7 },
    currentBase: "ROB_E",
    status: "on_mission",
    fuel: 55,
    enduranceHours: 18,
  }),
  parentBaseId: "ROB_E" as const,
  waypoints: WP_16,
  currentWaypointIdx: 0,
  currentMission: "ISR_DRONE" as const,
  movement: { state: "airborne" as const, speed: 120, destination: WP_16[0] },
  pathHistory: [] as { lat: number; lng: number }[],
};

// SGBM-01: Strike drone patrolling Baltic approach routes
const WP_SGBM = [
  { id: "sgbm01-wp0", lat: 56.6, lng: 16.8 },   // southern Baltic
  { id: "sgbm01-wp1", lat: 57.6, lng: 20.2 },   // eastern Baltic / Gotland east
];
const SGBM_01 = {
  ...createDroneUnit({
    id: "drone-sgbm-01",
    name: "SGBM-01",
    type: "STRIKE_DRONE" as const,
    position: { lat: 57.1, lng: 18.5 },
    currentBase: "FOB_S",
    status: "on_mission",
    fuel: 82,
    enduranceHours: 14,
  }),
  parentBaseId: "FOB_S" as const,
  waypoints: WP_SGBM,
  currentWaypointIdx: 1,
  currentMission: "ISR_DRONE" as const,
  movement: { state: "airborne" as const, speed: 130, destination: WP_SGBM[1] },
  pathHistory: [] as { lat: number; lng: number }[],
};

// ISR drone loitering east of Gotland — small N-S orbit at slow speed.
const ISR_DRONE_GOTLAND = {
  ...createDroneUnit({
    id: "drone-skym-14",
    name: "SKYM-14",
    type: "ISR_DRONE",
    position: { lat: 57.2, lng: 18.95 },
    currentBase: "FOB_S",
    status: "on_mission",
    fuel: 88,
    enduranceHours: 18,
  }),
  parentBaseId: "FOB_S" as const,
  // Keep waypoints empty so the drone engine leaves it to our patrol tick.
  waypoints: [],
  currentMission: undefined,
  movement: { state: "airborne" as const, speed: 120 },
  patrol: {
    center: { lat: 57.3, lng: 19.1 },
    radiusKm: 65,
    speedKts: 120,
    axisDeg: 10,
    clockwise: true,
    aspect: 0.5,
  },
  pathHistory: [],
};

// ── Naval units (hostile vessels + one friendly picket) ───────────────────
const INITIAL_NAVAL_UNITS: NavalUnit[] = [
  {
    id: "red-ship-01",
    name: "RFS Grozny",
    kind: "corvette",
    affiliation: "hostile",
    position: { lat: 55.4, lng: 19.3 },
    patrol: { center: { lat: 55.2, lng: 19.5 }, radiusKm: 70, speedKts: 18, axisDeg: 60, clockwise: true, aspect: 0.5 },
    movement: { state: "moving", speed: 18 },
    pathHistory: [],
    threatLevel: "high",
  },
  {
    id: "red-ship-02",
    name: "RFS Kilo-636",
    kind: "submarine",
    affiliation: "hostile",
    position: { lat: 55.8, lng: 18.2 },
    patrol: { center: { lat: 55.7, lng: 18.1 }, radiusKm: 50, speedKts: 8, axisDeg: 30, clockwise: false, aspect: 0.6 },
    movement: { state: "moving", speed: 8 },
    pathHistory: [],
    threatLevel: "high",
  },
  {
    id: "red-ship-03",
    name: "RFS Ropucha",
    kind: "amphib",
    affiliation: "hostile",
    position: { lat: 56.5, lng: 19.8 },
    patrol: { center: { lat: 56.4, lng: 19.9 }, radiusKm: 55, speedKts: 14, axisDeg: 90, clockwise: true, aspect: 0.45 },
    movement: { state: "moving", speed: 14 },
    pathHistory: [],
    threatLevel: "medium",
  },
  {
    id: "blue-picket-01",
    name: "HMS Visby",
    kind: "patrol_boat",
    affiliation: "friend",
    position: { lat: 57.6, lng: 18.5 },
    patrol: { center: { lat: 57.7, lng: 18.6 }, radiusKm: 85, speedKts: 25, axisDeg: 15, clockwise: true, aspect: 0.5 },
    movement: { state: "moving", speed: 25 },
    pathHistory: [],
    threatLevel: "low",
  },
];

// ── Enemy bases (seeded — a maritime facility + one airfield) ─────────────
const INITIAL_ENEMY_BASES: EnemyBase[] = [
  {
    id: "eb-baltiysk",
    name: "Baltiyskaya flottbas",
    category: "naval_base",
    coords: { lat: 54.65, lng: 19.9 },
    threatLevel: "high",
    operationalStatus: "active",
    estimates: "Bataljonsnivå marin + amfibie — 1 korvett, 1 u-båt, 1 amfibie",
    notes: "Hemmahamn för observerade RFS-fartyg i södra Östersjön",
    createdAt: 1,
  },
  {
    id: "eb-kaliningrad-af",
    name: "Chkalovsk flygbas",
    category: "airfield",
    coords: { lat: 54.77, lng: 20.37 },
    threatLevel: "high",
    operationalStatus: "active",
    estimates: "Jaktregemente (Su-27/Su-30) + AEW-platform",
    notes: "Rapporterad CAP-aktivitet dygnet runt",
    createdAt: 1,
  },
];

function seedIntelReports(bases: EnemyBase[]): Record<string, IntelReport> {
  const out: Record<string, IntelReport> = {};
  for (const b of bases) {
    const stockpile = STOCKPILE_TEMPLATES[b.category] ?? [];
    const intent = pickByHash(b.id, STRATEGIC_INTENT_BY_CATEGORY[b.category] ?? ["Okänd avsikt"]);
    out[b.id] = {
      stockpile: stockpile.slice(),
      strategicIntent: intent,
      activityLog: [
        { timestamp: "Dag 1 06:00", message: "Baslinjeobservation upprättad" },
      ],
    };
  }
  return out;
}

export const initialGameState: GameState = {
  day: 1,
  hour: new Date().getHours(),
  minute: new Date().getMinutes(),
  second: new Date().getSeconds(),
  phase: "FRED",
  bases: [MOB, FOB_N, FOB_S],
  deployedUnits: [
    ...DEMO_RADAR_UNITS,
    SKYM_11,
    SKYM_15,
    SKYM_16,
    SGBM_01,
    RED_UAV_01,
    CAP_GRIPEN_1,
    CAP_GRIPEN_2,
    GLOBAL_EYE_AEW,
    ISR_DRONE_GOTLAND,
  ],
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
  enemyBases: INITIAL_ENEMY_BASES,
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
    railroad: false,
  },
  navalUnits: INITIAL_NAVAL_UNITS,
  intelReports: seedIntelReports(INITIAL_ENEMY_BASES),
};
