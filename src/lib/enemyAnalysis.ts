import type { NavalUnit, EnemyBase, EnemyEntity } from "@/types/game";

export interface EnemyAnalysis {
  recommendation: string;
  type: "positive" | "warning" | "neutral";
  warnings: string[];
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function analyzeNavalUnit(unit: NavalUnit): EnemyAnalysis {
  const warnings: string[] = [];

  if (unit.pathHistory.length >= 5) {
    warnings.push(`Hög aktivitet — ${unit.pathHistory.length} registrerade rörelser. Kan indikera aktiv manövrering.`);
  }

  if (unit.movement.state === "moving") {
    warnings.push("Enheten rör sig aktivt mot okänt mål.");
  }

  if (!unit.lastDetectedAt) {
    warnings.push("Senaste detektering saknas — positionen kan vara inaktuell.");
  }

  const distKm = haversineKm(unit.position, unit.patrol.center);
  if (distKm > 30) {
    warnings.push(`Enheten befinner sig ${Math.round(distKm)} km utanför normalpatrullzonen — onormalt beteende.`);
  }

  if (unit.kind === "submarine") {
    warnings.push("U-båt kräver kontinuerlig ASW-bevakning.");
  } else if (unit.kind === "amphib") {
    warnings.push("Amfibiefartyg — övervaka för möjlig landstigning.");
  }

  const isHighThreat = unit.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 ? "warning" : warnings.length >= 1 ? "neutral" : "positive";

  let recommendation: string;
  if (type === "warning") {
    recommendation =
      unit.kind === "submarine"
        ? "U-båten uppvisar hög hotnivå och kräver omedelbar ASW-prioritering. Sätt ut lämpliga sensor- och vapenplattformar."
        : unit.kind === "amphib"
        ? "Amfibiefartyget utgör ett direkthot mot kustlinjen. Förstärk strandförsvar och övervaka landstigningsmöjligheter."
        : "Enheten uppvisar onormalt rörelsemönster med förhöjd hotnivå. Intensifiera bevakning och förbered motåtgärder.";
  } else if (type === "neutral") {
    recommendation =
      "Enheten bör följas löpande. Inga omedelbara åtgärder krävs men situationsmedvetenheten bör upprätthållas.";
  } else {
    recommendation =
      "Enheten uppvisar normalt beteende inom förväntad patrullzon. Fortsätt rutinövervakning.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3) };
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

  const isHighThreat = base.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 ? "warning" : warnings.length >= 1 ? "neutral" : "positive";

  let recommendation: string;
  if (type === "warning") {
    recommendation =
      "Positionen utgör ett omedelbart hot och kräver aktiv uppföljning. Överväg neutraliseringsinsats eller ökad ISR-täckning.";
  } else if (type === "neutral") {
    recommendation =
      "Positionen bör hållas under observation. Statusförändringar kan snabbt höja hotnivån.";
  } else {
    recommendation =
      "Positionen uppvisar för närvarande låg aktivitet. Rutinövervakning är tillräcklig.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3) };
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

  const isHighThreat = entity.threatLevel === "high";
  const type: EnemyAnalysis["type"] =
    isHighThreat || warnings.length >= 3 ? "warning" : warnings.length >= 1 ? "neutral" : "positive";

  let recommendation: string;
  if (type === "warning") {
    recommendation =
      entity.category === "sam_launcher"
        ? "Luftvärnsenheten utgör ett direkt hot mot luftoperationer. Planera SEAD-insats och undvik exponerade flygvägar."
        : entity.category === "fighter"
        ? "Fientligt jaktflyg kräver luftöverlägsenhet innan markoperationer inleds. Säkerställ eskortering och luftvärn."
        : "Enheten uppvisar hög aktivitet med förhöjd hotnivå. Åtgärder bör vidtas snarast.";
  } else if (type === "neutral") {
    recommendation =
      "Enheten bör övervakas löpande. Bered möjlighet att snabbt eskalera vid statusförändring.";
  } else {
    recommendation =
      "Enheten uppvisar för närvarande låg aktivitet. Ingen omedelbar åtgärd krävs.";
  }

  return { recommendation, type, warnings: warnings.slice(0, 3) };
}
