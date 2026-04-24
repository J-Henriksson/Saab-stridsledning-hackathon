import type { GameState } from "@/types/game";

export interface PlanAnalysis {
  recommendation: string;
  type: "positive" | "warning" | "neutral";
  concerns: string[];
}

export async function analyzePlan(state: GameState): Promise<PlanAnalysis> {
  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 1200));

  const concerns: string[] = [];

  const criticalBases = state.enemyBases.filter((b) => b.threatLevel === "critical");
  const highBases = state.enemyBases.filter((b) => b.threatLevel === "high");
  const enemySAM = state.enemyBases.filter((b) => b.category === "sam_site");
  const enemyAirfields = state.enemyBases.filter((b) => b.category === "airfield");
  const enemyEntities = state.enemyEntities;
  const friendlyUnits = state.deployedUnits.filter((u) => u.affiliation === "friend");
  const radarUnits = friendlyUnits.filter(
    (u) => u.type?.toLowerCase().includes("radar") || u.type?.toLowerCase().includes("ps-")
  );
  const roadBases = state.roadBases;
  const operativeRoadBases = roadBases.filter((r) => r.status === "Operativ");

  // --- Concern checks ---
  if (criticalBases.length > 0) {
    concerns.push(
      `${criticalBases.length} kritisk${criticalBases.length > 1 ? "a" : ""} fiendeposition${criticalBases.length > 1 ? "er" : ""} identifierad${criticalBases.length > 1 ? "e" : ""} — prioritera neutralisering omedelbart.`
    );
  }

  if (enemySAM.length > 0 && radarUnits.length === 0) {
    concerns.push(
      `${enemySAM.length} fientlig${enemySAM.length > 1 ? "a" : ""} luftvärnssystem utan täckning från egna radarsystem — SEAD-insats rekommenderas före anfallsoperationer.`
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
      `${offline} vägbas${offline > 1 ? "er" : ""} ej operativ${offline > 1 ? "a" : ""} — kontrollera beredskap och logistikkedjor.`
    );
  }

  if (enemyAirfields.length > 0 && friendlyUnits.length < 3) {
    concerns.push(
      `${enemyAirfields.length} fientlig${enemyAirfields.length > 1 ? "a" : ""} flygbas${enemyAirfields.length > 1 ? "er" : ""} aktiv${enemyAirfields.length > 1 ? "a" : ""} — otillräckliga egna flygtillgångar för luftöverlägsenhet.`
    );
  }

  if (enemyEntities.filter((e) => e.category === "sam_launcher").length > 2) {
    concerns.push(
      "Högt antal fientliga luftvärnslansettrar — utvärdera lågflygning och störsändning inför genomförandefasen."
    );
  }

  // --- Determine overall type and recommendation ---
  const score =
    (criticalBases.length > 0 ? -3 : 0) +
    (highBases.length > 1 ? -2 : 0) +
    (enemySAM.length > radarUnits.length ? -2 : 1) +
    (roadBases.length >= 2 ? 2 : 0) +
    (radarUnits.length >= 2 ? 2 : 0) +
    (friendlyUnits.length >= 4 ? 2 : 0) +
    (state.enemyBases.length === 0 && state.enemyEntities.length === 0 ? -1 : 0);

  if (concerns.length === 0 && score >= 3) {
    return {
      type: "positive",
      recommendation:
        "Stridsplanen uppvisar god balans mellan offensiv förmåga och defensiv täckning. Vänliga styrkor är väl positionerade och uppfyller de taktiska kraven för det planerade uppdraget. Godkänn och gå vidare till genomförandefasen.",
      concerns: [],
    };
  }

  if (concerns.length >= 3 || score < -1) {
    return {
      type: "warning",
      recommendation:
        `Stridsplanen innehåller ${concerns.length} identifierade brister som bör åtgärdas innan godkännande. ` +
        (criticalBases.length > 0
          ? "Kritiska fiendepositioner utan adekvat motåtgärd utgör en omedelbar operativ risk. "
          : "") +
        "Överväg att revidera planen eller acceptera risken och fortsätta.",
      concerns,
    };
  }

  return {
    type: "neutral",
    recommendation:
      "Stridsplanen är acceptabel men har förbättringspotential. " +
      (roadBases.length === 0
        ? "Lägg till vägbaser för ökad rörlighet. "
        : "") +
      (radarUnits.length === 0
        ? "Säkerställ radartäckning för tidigt varningstid. "
        : "") +
      "Du kan godkänna planen och justera under genomförandefasen.",
    concerns,
  };
}
