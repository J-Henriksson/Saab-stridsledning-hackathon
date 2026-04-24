import scenarioData from "./scenarios/baltic-air-command.json";
import {
  createAircraftUnit,
  createAirDefenseUnit,
  createRadarUnit,
} from "@/core/units/factory";
import type {
  Base,
  BaseType,
  MissionType,
  PersonnelGroup,
  SparePartStock,
} from "@/types/game";
import type {
  AirBase,
  AirDefenseBattery,
  Aircraft as ScenarioAircraft,
  BalticAirCommandScenario,
  RadarStation,
} from "@/types/airCommand";
import type { AircraftUnit, Unit, WeaponLoadout } from "@/types/units";

export const AIR_COMMAND_SCENARIO = scenarioData as BalticAirCommandScenario;

const BASE_TYPE_MAP: Record<BaseType, Base["type"]> = {
  MOB: "huvudbas",
  FOB_N: "sidobas",
  FOB_S: "sidobas",
  ROB_N: "reservbas",
  ROB_S: "sidobas",
  ROB_E: "reservbas",
  ARNA: "sidobas",
  VISBY: "reservbas",
};

function createSpareParts(scale: number): SparePartStock[] {
  return [
    { id: "radar", name: "Radar LRU", category: "Avionik", quantity: Math.max(1, Math.round(5 * scale)), maxQuantity: Math.max(2, Math.round(7 * scale)), reservedQuantity: 0, resupplyDays: 5, onOrder: 0, leadTime: 5, source: "base_stock", turnaround: 5, isReusable: true },
    { id: "engine", name: "Motor RM12", category: "Drivlina", quantity: Math.max(1, Math.round(3 * scale)), maxQuantity: Math.max(2, Math.round(4 * scale)), reservedQuantity: 0, resupplyDays: 30, onOrder: 0, leadTime: 30, source: "central_stock", turnaround: 30, isReusable: true },
    { id: "hydraulic", name: "Hydraulenhet", category: "System", quantity: Math.max(1, Math.round(6 * scale)), maxQuantity: Math.max(2, Math.round(8 * scale)), reservedQuantity: 0, resupplyDays: 7, onOrder: 0, leadTime: 7, source: "base_stock", turnaround: 7, isReusable: true },
    { id: "wheel", name: "Hjul/Bromsar", category: "Landstall", quantity: Math.max(1, Math.round(6 * scale)), maxQuantity: Math.max(2, Math.round(10 * scale)), reservedQuantity: 0, resupplyDays: 3, onOrder: 0, leadTime: 3, source: "base_stock", turnaround: 3, isReusable: false },
  ];
}

function createPersonnel(available: number, total: number): PersonnelGroup[] {
  return [
    { id: "pilot", role: "Pilot", available: Math.max(2, Math.round(available * 0.12)), total: Math.max(3, Math.round(total * 0.12)), onDuty: true },
    { id: "mech", role: "Flygmekaniker", available: Math.max(6, Math.round(available * 0.38)), total: Math.max(8, Math.round(total * 0.38)), onDuty: true },
    { id: "tech", role: "Tekniker Avionik", available: Math.max(4, Math.round(available * 0.2)), total: Math.max(5, Math.round(total * 0.2)), onDuty: true },
    { id: "arms", role: "Vapensmed", available: Math.max(3, Math.round(available * 0.12)), total: Math.max(4, Math.round(total * 0.12)), onDuty: true },
    { id: "fuel", role: "Drivmedelspersonal", available: Math.max(2, Math.round(available * 0.1)), total: Math.max(3, Math.round(total * 0.1)), onDuty: true },
    { id: "command", role: "Basbefal", available: Math.max(2, Math.round(available * 0.08)), total: Math.max(3, Math.round(total * 0.08)), onDuty: true },
  ];
}

function toAircraftType(platform: ScenarioAircraft["platform"]): AircraftUnit["type"] {
  switch (platform) {
    case "GlobalEye":
      return "GlobalEye";
    case "TP 84":
      return "TP84";
    case "SK 60":
      return "SK60";
    default:
      return "GripenE";
  }
}

function toAircraftRole(platform: ScenarioAircraft["platform"]): AircraftUnit["role"] {
  switch (platform) {
    case "GlobalEye":
      return "awacs";
    case "TP 84":
      return "transport";
    default:
      return "fighter";
  }
}

function toMissionType(missionType: ScenarioAircraft["missionType"]): MissionType | undefined {
  switch (missionType) {
    case "QRA":
    case "CAP":
    case "CAS":
      return missionType;
    case "RECON":
      return "RECCE";
    case "TRANSPORT":
      return "TRANSPORT";
    case "INTERCEPT":
    case "COMBAT":
      return "DCA";
    default:
      return undefined;
  }
}

function toTacMission(missionType: ScenarioAircraft["missionType"]): AircraftUnit["tacMission"] {
  switch (missionType) {
    case "QRA":
    case "CAP":
    case "CAS":
    case "RECON":
      return missionType;
    case "INTERCEPT":
      return "QRA";
    case "COMBAT":
      return "CAP";
    default:
      return "RECON";
  }
}

function toAircraftStatus(aircraft: ScenarioAircraft): AircraftUnit["status"] {
  switch (aircraft.operatingState) {
    case "Scrambled":
      return "on_mission";
    case "Maintenance":
      return "under_maintenance";
    case "Apron":
      return "awaiting_launch";
    default:
      return "ready";
  }
}

function toWeaponLoadout(loadout: ScenarioAircraft["weaponLoadout"]): WeaponLoadout {
  const aam = (loadout.irisT ?? 0) + (loadout.meteor ?? 0) + (loadout.aim120 ?? 0) + (loadout.sidewinder ?? 0);
  const agm = (loadout.rbs15 ?? 0) + (loadout.brimstone ?? 0);
  const bombs = loadout.gbu39 ?? 0;

  return {
    aam,
    agm,
    bombs,
    pods: loadout.pods,
    irisT: loadout.irisT,
    meteor: loadout.meteor,
    aim120: loadout.aim120,
    sidewinder: loadout.sidewinder,
    rbs15: loadout.rbs15,
    gbu39: loadout.gbu39,
    brimstone: loadout.brimstone,
    gunAmmoPct: loadout.gunAmmoPct,
  };
}

function summarizePayload(loadout: ScenarioAircraft["weaponLoadout"]): string | undefined {
  const labels = [
    loadout.irisT ? `IRIS-T x${loadout.irisT}` : null,
    loadout.meteor ? `Meteor x${loadout.meteor}` : null,
    loadout.aim120 ? `AIM-120 x${loadout.aim120}` : null,
    loadout.rbs15 ? `RBS-15 x${loadout.rbs15}` : null,
    loadout.gbu39 ? `GBU-39 x${loadout.gbu39}` : null,
    loadout.brimstone ? `Brimstone x${loadout.brimstone}` : null,
    ...(loadout.pods ?? []),
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : undefined;
}

function toAircraftUnit(aircraft: ScenarioAircraft): AircraftUnit {
  const currentMission = toMissionType(aircraft.missionType);
  const unit = createAircraftUnit({
    id: aircraft.id,
    tailNumber: aircraft.tailNumber,
    name: aircraft.callsign,
    type: toAircraftType(aircraft.platform),
    role: toAircraftRole(aircraft.platform),
    position: aircraft.position,
    currentBase: aircraft.homeBaseId,
    fuel: aircraft.fuelLevel,
  });

  return {
    ...unit,
    status: toAircraftStatus(aircraft),
    position: aircraft.position,
    movement: {
      state: aircraft.operatingState === "Scrambled" ? "airborne" : "stationary",
      speed: aircraft.speed,
      heading: aircraft.heading,
    },
    currentMission,
    payload: summarizePayload(aircraft.weaponLoadout),
    flightHours: Math.max(12, 120 - aircraft.maintenanceHours),
    hoursToService: aircraft.maintenanceHours,
    health: aircraft.operatingState === "Maintenance" ? 76 : aircraft.isTargeted ? 82 : 94,
    fuel: aircraft.fuelLevel,
    altitudeFt: aircraft.altitude,
    transponderCode: aircraft.transponderCode,
    homeBaseId: aircraft.homeBaseId,
    originBase: aircraft.originBase,
    estimatedLandingTime: aircraft.estimatedLandingTime,
    weaponStatus: aircraft.weaponStatus,
    operatingState: aircraft.operatingState,
    callsign: aircraft.callsign,
    squawkCode: aircraft.squawkCode,
    machSpeed: aircraft.machSpeed,
    verticalRate: aircraft.verticalRate,
    tacMission: toTacMission(aircraft.missionType),
    weaponLoadout: toWeaponLoadout(aircraft.weaponLoadout),
    fuelStatus: aircraft.fuelStatus,
    wing: aircraft.wing,
    radarActive: aircraft.radarActive,
    radarRangeKm: aircraft.radarRangeKm,
    radarAzimuthHalfDeg: aircraft.radarAzimuthHalfDeg,
    isTargeted: aircraft.isTargeted,
  };
}

function toBase(base: AirBase): Base {
  const aircraft = AIR_COMMAND_SCENARIO.aircraft
    .filter((item) => item.homeBaseId === base.id)
    .map(toAircraftUnit);

  const personnel = createPersonnel(
    base.logistics.personnel.available,
    base.logistics.personnel.total,
  );

  return {
    id: base.id,
    name: base.name,
    type: BASE_TYPE_MAP[base.id],
    units: aircraft,
    spareParts: createSpareParts(Math.max(0.45, base.logistics.fuelReservePct / 100)),
    personnel,
    fuel: base.logistics.fuelReservePct,
    maxFuel: 100,
    ammunition: base.logistics.ammunition,
    maintenanceBays: base.logistics.maintenanceBays,
    zones: [],
    icaoCode: base.icaoCode,
    hangarCapacity: base.capacity.hangar,
    rampCapacity: base.capacity.ramp,
    defenseUnitIds: base.defenses,
    sensorUnitIds: AIR_COMMAND_SCENARIO.radarStations
      .filter((station) => station.linkedBaseIds.includes(base.id))
      .map((station) => station.id),
    weather: {
      windKts: base.weather.windKts,
      windDirDeg: base.weather.windDirDeg,
      visibilityKm: base.weather.visibilityKm,
      ceilingFt: base.weather.ceilingFt,
      condition: base.weather.condition,
    },
    availableAssets: base.availableAssets,
    operationalStatus: base.status,
  };
}

function toRadarUnit(station: RadarStation): Unit {
  return createRadarUnit({
    id: station.id,
    name: station.name,
    type: "SEARCH_RADAR",
    position: station.coordinates,
    currentBase: station.linkedBaseIds[0] ?? null,
    emitting: station.status === "Active",
  });
}

function toAirDefenseUnit(battery: AirDefenseBattery): Unit {
  const type = battery.coverageKm >= 100 ? "SAM_LONG" : "SAM_MEDIUM";
  const unit = createAirDefenseUnit({
    id: battery.id,
    name: battery.name,
    type,
    position: battery.coordinates,
    currentBase: battery.linkedBaseIds[0] ?? null,
    loadedMissiles: battery.missiles.ready,
    maxMissiles: battery.missiles.max,
  });

  return {
    ...unit,
    deployedState: battery.status === "Relocating" ? "stowed" : "emplaced",
    health: battery.status === "Maintenance" ? 75 : 96,
  };
}

export function buildBalticAirCommandBases(): Base[] {
  return AIR_COMMAND_SCENARIO.bases.map(toBase);
}

export function buildBalticAirCommandSupportUnits(): Unit[] {
  return [
    ...AIR_COMMAND_SCENARIO.radarStations.map(toRadarUnit),
    ...AIR_COMMAND_SCENARIO.airDefenseBatteries.map(toAirDefenseUnit),
  ];
}

export const AIR_COMMAND_BASES = buildBalticAirCommandBases();
export const AIR_COMMAND_SUPPORT_UNITS = buildBalticAirCommandSupportUnits();
