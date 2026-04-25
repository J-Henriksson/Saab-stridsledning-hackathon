import type { NavalUnit, EnemyBase, EnemyEntity } from "@/types/game";
import type { DroneUnit } from "@/types/units";
import { SWEDEN_EEZ_RING, SWEDEN_FIR_RING } from "@/data/geoBoundaries";

export interface BorderAlert {
  distanceKm: number;
  zone: "EEZ" | "FIR";
  approaching: boolean;
  predictedActions: string[];
  timeEstimateMin?: number;
  recommendedActions: string[];
}

export interface EnemyAnalysis {
  recommendation: string;
  type: "positive" | "warning" | "neutral";
  warnings: string[];
  borderAlert?: BorderAlert;
}

// --- Geometry helpers ---

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function distanceToRing(pos: { lat: number; lng: number }, ring: [number, number][]): number {
  let min = Infinity;
  for (const [lng, lat] of ring) {
    const d = haversineKm(pos, { lat, lng });
    if (d < min) min = d;
  }
  return min;
}

function distanceToEEZ(pos: { lat: number; lng: number }): number {
  return distanceToRing(pos, SWEDEN_EEZ_RING);
}

function distanceToFIR(pos: { lat: number; lng: number }): number {
  return distanceToRing(pos, SWEDEN_FIR_RING);
}

function isApproachingBorder(
  pathHistory: { lat: number; lng: number }[],
  currentPos: { lat: number; lng: number },
  ring: [number, number][],
): boolean {
  if (pathHistory.length < 1) return false;
  const prev = pathHistory[pathHistory.length - 1];
  return distanceToRing(currentPos, ring) < distanceToRing(prev, ring);
}

function estimateTimeToReach(
  pathHistory: { lat: number; lng: number }[],
  currentPos: { lat: number; lng: number },
  distanceKm: number,
): number | undefined {
  if (pathHistory.length < 1) return undefined;
  const prev = pathHistory[pathHistory.length - 1];
  const speedKmPerTick = haversineKm(prev, currentPos);
  if (speedKmPerTick < 0.1) return undefined;
  return Math.round(distanceKm / speedKmPerTick);
}

// --- Border alert builders ---

function buildRecommendedActions(distanceKm: number): string[] {
  if (distanceKm < 15) {
    return [
      "Larm till HKV omedelbart",
      "Aktivera kustbevakning / begär JAS-patrullering",
      "Begär omedelbar identifiering av enheten",
    ];
  }
  if (distanceKm < 40) {
    return [
      "Höj beredskapen i sektorn",
      "Positionera interceptförmåga i beredskapsläge",
      "Aktivera radartäckning mot sektorn",
    ];
  }
  return [
    "Fortsätt aktiv övervakning",
    "Logga rörelsemönstret och notera avvikelser",
    "Förbered eskalationsprocedur vid närmande",
  ];
}

function buildPredictedActions(distanceKm: number, kind?: string, droneType?: string): string[] {
  const actions: string[] = [];
  if (kind === "submarine") {
    actions.push("Trolig ISR-operation i svenska farvatten");
    if (distanceKm < 30) actions.push("Kan etablera dold patrullposition inom EEZ");
  } else if (kind === "amphib") {
    actions.push("Risk för rekognoseringsinsats mot kustlinje");
    if (distanceKm < 30) actions.push("Möjlig förberedelse för landstigningsoperation");
  } else if (droneType === "STRIKE_DRONE") {
    actions.push("Möjlig eldförberedelse mot marksmål inom EEZ");
    if (distanceKm < 30) actions.push("Kan vara förtrupp inför koordinerat luftanfall");
  } else if (droneType === "ISR_DRONE") {
    actions.push("Trolig luftrumsövervakning av svensk infrastruktur och marinbaser");
  } else {
    actions.push("Kan testa reaktionstid hos svenska kustbevakning / flygvapnet");
    if (distanceKm < 30) actions.push("Risk för avsiktlig gränsöverträdelse");
  }
  return actions;
}

function buildBorderAlert(
  position: { lat: number; lng: number },
  pathHistory: { lat: number; lng: number }[],
  kind?: string,
  droneType?: string,
): BorderAlert | undefined {
  const eezDist = distanceToEEZ(position);
  const firDist = distanceToFIR(position);

  const useEEZ = eezDist <= 80;
  const useFIR = !useEEZ && firDist <= 150;
  if (!useEEZ && !useFIR) return undefined;

  const zone: "EEZ" | "FIR" = useEEZ ? "EEZ" : "FIR";
  const ring = useEEZ ? SWEDEN_EEZ_RING : SWEDEN_FIR_RING;
  const distanceKm = useEEZ ? eezDist : firDist;

  const approaching = isApproachingBorder(pathHistory, position, ring);
  const timeEstimateMin = approaching
    ? estimateTimeToReach(pathHistory, position, distanceKm)
    : undefined;

  return {
    distanceKm,
    zone,
    approaching,
    predictedActions: buildPredictedActions(distanceKm, kind, droneType),
    timeEstimateMin,
    recommendedActions: buildRecommendedActions(distanceKm),
  };
}

// --- Public analysis functions ---

export function analyzeNavalUnit(unit: NavalUnit): EnemyAnalysis {
  const warnings: string[] = [];

  if (unit.pathHistory.length >= 5) {
    warnings.push(
      `Hög aktivitet — ${unit.pathHistory.length} registrerade rörelser. Kan indikera aktiv manövrering.`,
    );
  }
  if (unit.movement.state === "moving") {
    warnings.push("Enheten rör sig aktivt mot okänt mål.");
  }
  if (!unit.lastDetectedAt) {
    warnings.push("Senaste detektering saknas — positionen kan vara inaktuell.");
  }
  const distKm = haversineKm(unit.position, unit.patrol.center);
  if (distKm > 30) {
    warnings.push(
      `Enheten befinner sig ${Math.round(distKm)} km utanför normalpatrullzonen — onormalt beteende.`,
    );
  }
  if (unit.kind === "submarine") {
    warnings.push("U-båt kräver kontinuerlig ASW-bevakning.");
  } else if (unit.kind === "amphib") {
    warnings.push("Amfibiefartyg — övervaka för möjlig landstigning.");
  }

  const borderAlert = buildBorderAlert(unit.position, unit.pathHistory, unit.kind);
  if (borderAlert) {
    warnings.unshift(
      `⚠ ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}${borderAlert.approaching ? " — rör sig mot gränsen" : ""}`,
    );
  }

  const isHighThreat = unit.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 || (borderAlert && borderAlert.distanceKm < 40)
      ? "warning"
      : warnings.length >= 1
      ? "neutral"
      : "positive";

  let recommendation: string;
  if (type === "warning") {
    if (unit.kind === "submarine") {
      recommendation =
        "U-båten uppvisar hög hotnivå och kräver omedelbar ASW-prioritering. Sätt ut lämpliga sensor- och vapenplattformar.";
    } else if (unit.kind === "amphib") {
      recommendation =
        "Amfibiefartyget utgör ett direkthot mot kustlinjen. Förstärk strandförsvar och övervaka landstigningsmöjligheter.";
    } else if (borderAlert && borderAlert.distanceKm < 15) {
      recommendation = `Enheten befinner sig ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}. Omedelbar åtgärd krävs — se rekommenderade åtgärder nedan.`;
    } else {
      recommendation =
        "Enheten uppvisar onormalt rörelsemönster med förhöjd hotnivå. Intensifiera bevakning och förbered motåtgärder.";
    }
  } else if (type === "neutral") {
    recommendation =
      "Enheten bör följas löpande. Inga omedelbara åtgärder krävs men situationsmedvetenheten bör upprätthållas.";
  } else {
    recommendation = "Enheten uppvisar normalt beteende inom förväntad patrullzon. Fortsätt rutinövervakning.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3), borderAlert };
}

export function analyzeEnemyBase(base: EnemyBase): EnemyAnalysis {
  const warnings: string[] = [];

  if (base.threatLevel === "high") {
    warnings.push("Hög hotnivå — omedelbar operativ risk.");
  }
  if (base.operationalStatus === "active") {
    if (base.category === "sam_site") {
      warnings.push("Aktivt luftvärnssystem — begränsar luftoperationer i området.");
    } else if (base.category === "airfield") {
      warnings.push("Aktiv flygbas — risk för luftanfall från denna position.");
    } else if (base.category === "command") {
      warnings.push("Aktiv ledningscentral — nyckelsmål för att bryta fiendens effektkedja.");
    }
  }
  if (base.estimates) {
    warnings.push("Uppskattad styrka noterad — kontrollera källans aktualitet.");
  }

  const borderAlert = buildBorderAlert(base.coords, []);
  if (borderAlert) {
    warnings.unshift(`⚠ Bas ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}`);
  }

  const isHighThreat = base.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 || (borderAlert && borderAlert.distanceKm < 40)
      ? "warning"
      : warnings.length >= 1
      ? "neutral"
      : "positive";

  let recommendation: string;
  if (type === "warning") {
    recommendation =
      "Positionen utgör ett omedelbart hot och kräver aktiv uppföljning. Överväg neutraliseringsinsats eller ökad ISR-täckning.";
  } else if (type === "neutral") {
    recommendation = "Positionen bör hållas under observation. Statusförändringar kan snabbt höja hotnivån.";
  } else {
    recommendation = "Positionen uppvisar för närvarande låg aktivitet. Rutinövervakning är tillräcklig.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3), borderAlert };
}

export function analyzeEnemyEntity(entity: EnemyEntity): EnemyAnalysis {
  const warnings: string[] = [];

  if (entity.threatLevel === "high") {
    warnings.push("Hög hotnivå — omedelbar åtgärd rekommenderas.");
  }
  if (entity.category === "sam_launcher") {
    warnings.push("Luftvärnslansett — SEAD-insats kan krävas innan luftoperationer inleds.");
  } else if (entity.category === "fighter") {
    warnings.push("Jaktflyg detekterat — luftrummet är omtvistat i sektorn.");
  }
  if (entity.operationalStatus === "active") {
    warnings.push("Enheten är operativ och aktiv.");
  } else if (entity.operationalStatus === "suspected") {
    warnings.push("Osäkert läge — lägesbilden bör verifieras med ytterligare ISR.");
  }

  const borderAlert = buildBorderAlert(entity.coords, []);
  if (borderAlert) {
    warnings.unshift(`⚠ Enhet ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}`);
  }

  const isHighThreat = entity.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 || (borderAlert && borderAlert.distanceKm < 40)
      ? "warning"
      : warnings.length >= 1
      ? "neutral"
      : "positive";

  let recommendation: string;
  if (type === "warning") {
    if (entity.category === "sam_launcher") {
      recommendation =
        "Luftvärnsenheten utgör ett direkt hot mot luftoperationer. Planera SEAD-insats och undvik exponerade flygvägar.";
    } else if (entity.category === "fighter") {
      recommendation =
        "Fientligt jaktflyg kräver luftöverlägsenhet innan markoperationer inleds. Säkerställ eskortering och luftvärn.";
    } else {
      recommendation = "Enheten uppvisar hög aktivitet med förhöjd hotnivå. Åtgärder bör vidtas snarast.";
    }
  } else if (type === "neutral") {
    recommendation =
      "Enheten bör övervakas löpande. Bered möjlighet att snabbt eskalera vid statusförändring.";
  } else {
    recommendation = "Enheten uppvisar för närvarande låg aktivitet. Ingen omedelbar åtgärd krävs.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3), borderAlert };
}

export function analyzeEnemyDrone(drone: DroneUnit): EnemyAnalysis {
  const warnings: string[] = [];

  if (drone.type === "STRIKE_DRONE") {
    warnings.push("Stridsdrönare — kan bära precisionsvapen mot marksmål.");
  }
  if (drone.fuel < 30) {
    warnings.push("Lågt bränsle — kan tvingas till nödlandning eller offensiv direktinsats.");
  }
  if (drone.movement.state === "airborne") {
    warnings.push("Drönaren är luftburen och aktiv.");
  }
  const waypoints = drone.waypoints ?? [];
  const pathHistory = drone.pathHistory ?? [];
  if (waypoints.length > 0) {
    warnings.push("Aktiv färdplan detekterad — rörelsemönster analyseras.");
  }
  if (pathHistory.length >= 4) {
    warnings.push("Upprepade rörelsemönster — troligen systematisk ISR-täckning av området.");
  }
  const waypointNearBorder = waypoints.some(
    (wp) => distanceToEEZ({ lat: wp.lat, lng: wp.lng }) < 50,
  );
  if (waypointNearBorder) {
    warnings.push("Waypoints pekar mot svensk EEZ — trolig avsikt att övervaka eller penetrera gränsen.");
  }

  const borderAlert = buildBorderAlert(drone.position, pathHistory, undefined, drone.type);
  if (borderAlert) {
    warnings.unshift(
      `⚠ ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}${borderAlert.approaching ? " — rör sig mot gränsen" : ""}`,
    );
  }

  const isStrike = drone.type === "STRIKE_DRONE";
  const isAirborne = drone.movement.state === "airborne";
  const nearBorder = borderAlert && borderAlert.distanceKm < 40;

  const type: EnemyAnalysis["type"] =
    (isStrike && isAirborne) || nearBorder || warnings.length >= 3
      ? "warning"
      : warnings.length >= 1
      ? "neutral"
      : "positive";

  let recommendation: string;
  if (isStrike && isAirborne) {
    recommendation =
      "Stridsdrönarens profil och bana indikerar ett möjligt offensivt uppdrag. Rekommendera omedelbar luftvärnspositionering och begäran om identifiering.";
  } else if (type === "warning" && borderAlert) {
    recommendation = `Drönaren befinner sig ${Math.round(borderAlert.distanceKm)} km från svensk ${borderAlert.zone}. Intensifiera bevakning och förbered interceptåtgärd.`;
  } else if (drone.type === "ISR_DRONE") {
    recommendation =
      "Drönaren uppvisar ett systematiskt spaningsmönster. Säkerställ att egna positioner inte exponeras och aktivera motspaning.";
  } else {
    recommendation = "Drönaren uppvisar för närvarande normalt beteende. Fortsätt rutinövervakning.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3), borderAlert };
}
