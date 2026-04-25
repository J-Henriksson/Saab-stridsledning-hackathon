import type { GameState } from "@/types/game";
import { AMMO_DEPOTS } from "@/data/fixedAssets";

export interface PlanAnalysis {
  recommendation: string;
  type: "positive" | "warning" | "neutral";
  concerns: string[];
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a2 = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

const AMMO_ROAD_BASE_THRESHOLD_KM = 100;

export async function analyzePlan(state: GameState): Promise<PlanAnalysis> {
  await new Promise((r) => setTimeout(r, 1200));

  const concerns: string[] = [];

  const highBases      = state.enemyBases.filter((b) => b.threatLevel === "high");
  const mediumBases    = state.enemyBases.filter((b) => b.threatLevel === "medium");
  const enemySAM       = state.enemyBases.filter((b) => b.category === "sam_site");
  const enemyAirfields = state.enemyBases.filter((b) => b.category === "airfield");
  const enemyEntities  = state.enemyEntities;
  const friendlyUnits  = state.deployedUnits.filter((u) => u.affiliation === "friend");
  const radarUnits     = friendlyUnits.filter(
    (u) => u.type?.toLowerCase().includes("radar") || u.category === "radar"
  );
  const roadBases          = state.roadBases;
  const operativeRoadBases = roadBases.filter((r) => r.status === "Operativ");

  // ── Ammo depot coverage check ────────────────────────────────────────────
  const uncoveredDepots: string[] = [];
  const coveredDepots:   string[] = [];

  for (const depot of AMMO_DEPOTS) {
    const depotPos = { lat: depot.lat, lng: depot.lng };
    const hasRoadBase = operativeRoadBases.some(
      (rb) => haversineKm(depotPos, rb.coords) <= AMMO_ROAD_BASE_THRESHOLD_KM
    );
    if (hasRoadBase) {
      coveredDepots.push(depot.name);
    } else {
      uncoveredDepots.push(depot.name);
    }
  }

  if (uncoveredDepots.length > 0) {
    for (const depotName of uncoveredDepots) {
      concerns.push(
        `${depotName} saknar markstöd — ingen operativ vägbas inom ${AMMO_ROAD_BASE_THRESHOLD_KM} km. ` +
        `Etablera en vägbas i närheten för att säkra logistik och skydda depån vid angrepp.`
      );
    }
  }

  // ── Standard concern checks ──────────────────────────────────────────────
  if (highBases.length >= 2) {
    concerns.push(
      `${highBases.length} fiendepositioner med hög hotnivå — prioritera SEAD och suppressionsinsatser innan anfallsoperationer påbörjas.`
    );
  }
  if (enemySAM.length > 0 && radarUnits.length === 0) {
    concerns.push(
      `${enemySAM.length} fientligt luftvärnssystem utan täckning från egna radarsystem — SEAD-insats rekommenderas starkt.`
    );
  }
  if (enemySAM.length > 0 && radarUnits.length > 0 && radarUnits.length < enemySAM.length) {
    concerns.push(
      `Otillräcklig radartäckning — ${radarUnits.length} egna radarsystem mot ${enemySAM.length} fientliga luftvärnspositioner.`
    );
  }
  if (roadBases.length === 0 && state.enemyBases.length >= 2) {
    concerns.push(
      "Inga vägbaser planerade — reducerad rörlighet och ökad sårbarhet vid angrepp mot fasta baser."
    );
  }
  if (operativeRoadBases.length < roadBases.length) {
    const offline = roadBases.length - operativeRoadBases.length;
    concerns.push(
      `${offline} vägbas${offline > 1 ? "er" : ""} ej operativ${offline > 1 ? "a" : ""} — kontrollera beredskap.`
    );
  }
  if (enemyAirfields.length > 0 && friendlyUnits.length < 3) {
    concerns.push(
      `${enemyAirfields.length} fientlig flygbas${enemyAirfields.length > 1 ? "er" : ""} — otillräckliga egna flygtillgångar.`
    );
  }
  if (enemyEntities.filter((e) => e.category === "sam_launcher").length > 2) {
    concerns.push(
      "Högt antal fientliga luftvärnslansettrar — utvärdera lågflygning och störsändning."
    );
  }

  // ── Score & overall verdict ──────────────────────────────────────────────
  const allDepotsCovered = uncoveredDepots.length === 0 && AMMO_DEPOTS.length > 0;
  const score =
    (highBases.length >= 2 ? -3 : highBases.length === 1 ? -1 : 0) +
    (mediumBases.length > 2 ? -1 : 0) +
    (enemySAM.length > radarUnits.length ? -2 : radarUnits.length > 0 ? 1 : 0) +
    (roadBases.length >= 2 ? 2 : roadBases.length === 1 ? 1 : 0) +
    (radarUnits.length >= 2 ? 2 : radarUnits.length === 1 ? 1 : 0) +
    (friendlyUnits.length >= 4 ? 2 : friendlyUnits.length >= 2 ? 1 : 0) +
    (allDepotsCovered ? 2 : -2) +
    (state.enemyBases.length === 0 && state.enemyEntities.length === 0 ? -1 : 0);

  if (concerns.length === 0 && score >= 3) {
    const depotMsg = allDepotsCovered
      ? ` Alla ammunitionsdepåer täcks av operativa vägbaser — logistik och markskydd godkänt.`
      : "";
    return {
      type: "positive",
      recommendation:
        "Stridsplanen uppvisar god balans mellan offensiv förmåga och defensiv täckning. " +
        "Vänliga styrkor är väl positionerade och uppfyller samtliga taktiska krav." +
        depotMsg +
        " Godkänn och gå vidare till genomförandefasen.",
      concerns: [],
    };
  }

  if (concerns.length >= 2 || score < -1) {
    const depotHint = uncoveredDepots.length > 0
      ? ` Etablera vägbaser inom ${AMMO_ROAD_BASE_THRESHOLD_KM} km från ${uncoveredDepots.join(" och ")} omgående.`
      : "";
    return {
      type: "warning",
      recommendation:
        `Stridsplanen innehåller ${concerns.length} identifierade brister.` +
        depotHint +
        " Revidera planen eller acceptera risken och fortsätt.",
      concerns,
    };
  }

  // Neutral: plan mostly solid — only one or a few minor gaps
  const onlyDepotGap =
    concerns.length === 1 &&
    uncoveredDepots.length === 1 &&
    coveredDepots.length > 0;

  if (onlyDepotGap) {
    return {
      type: "neutral",
      recommendation:
        `Planen täcker stora delar av uppdraget — god luftvärns- och radartäckning kring ${coveredDepots.join(" och ")}. ` +
        `En brist kvarstår: ${uncoveredDepots[0]} ammodepo saknar markstöd. ` +
        `Etablera en vägbas inom ${AMMO_ROAD_BASE_THRESHOLD_KM} km från depån för att säkra logistik och skydd, ` +
        `sedan kan planen godkännas.`,
      concerns,
    };
  }

  const neutralHints: string[] = [];
  if (uncoveredDepots.length > 0)
    neutralHints.push(`Lägg till vägbas nära ${uncoveredDepots.join(", ")} för ammoskydd.`);
  if (roadBases.length === 0) neutralHints.push("Lägg till vägbaser för rörlighet.");
  if (radarUnits.length === 0) neutralHints.push("Säkerställ radartäckning.");

  return {
    type: "neutral",
    recommendation:
      "Stridsplanen är acceptabel men har förbättringspotential. " +
      neutralHints.join(" ") +
      " Du kan godkänna och justera under genomförandefasen.",
    concerns,
  };
}
