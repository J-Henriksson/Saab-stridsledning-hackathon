import type { GameState, Recommendation, GameAction } from "@/types/game";
import { isMissionCapable, isInMaintenance } from "@/types/game";
import { SERVICE_INTERVAL_HOURS } from "@/data/config/durations";
import { canCannibalize } from "@/data/config/scenario";

let recIdCounter = 0;

function makeRec(
  title: string,
  explanation: string,
  type: Recommendation["type"],
  priority: Recommendation["priority"],
  applyAction: GameAction,
  opts: Partial<Recommendation> = {},
): Recommendation {
  return {
    id: `rec-${++recIdCounter}`,
    title,
    explanation,
    affectedAssets: opts.affectedAssets ?? [],
    affectedMissions: opts.affectedMissions ?? [],
    expectedBenefit: opts.expectedBenefit ?? "",
    tradeoff: opts.tradeoff ?? "",
    type,
    priority,
    applyAction,
    dismissed: false,
  };
}

/** Generate recommendations based on current game state */
export function generateRecommendations(state: GameState): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const base of state.bases) {
    // Low fuel warning
    if (base.fuel < 30) {
      recs.push(makeRec(
        `Låg bränslenivå vid ${base.id}`,
        `Bränsle vid ${base.name} är ${base.fuel.toFixed(0)}%. Risk för att inte kunna genomföra planerade uppdrag.`,
        "warning",
        base.fuel < 15 ? "critical" : "high",
        { type: "ADVANCE_PHASE" }, // placeholder
        { expectedBenefit: "Säkerställ bränsletillgång", tradeoff: "Kan kräva omplanering av uppdrag" },
      ));
    }

    // Low spare parts
    for (const part of base.spareParts) {
      if (part.quantity <= 1 && part.maxQuantity > 2) {
        recs.push(makeRec(
          `Kritisk nivå: ${part.name} vid ${base.id}`,
          `Bara ${part.quantity}/${part.maxQuantity} ${part.name} kvar. Beställ påfyllning.`,
          "resupply",
          "high",
          { type: "ADVANCE_PHASE" },
          { affectedAssets: [part.id], expectedBenefit: "Undvik underhållsstopp", tradeoff: `Leveranstid: ${part.resupplyDays} dagar` },
        ));
      }
    }

    // Aircraft near service interval
    for (const ac of base.aircraft) {
      if (isMissionCapable(ac.status) && ac.hoursToService <= 10) {
        recs.push(makeRec(
          `Schemalagt underhåll snart: ${ac.tailNumber}`,
          `${ac.tailNumber} har ${ac.hoursToService}h kvar till ${SERVICE_INTERVAL_HOURS}h-service. Planera underhåll.`,
          "maintenance",
          ac.hoursToService <= 5 ? "critical" : "high",
          { type: "START_MAINTENANCE", baseId: base.id, aircraftId: ac.id },
          { affectedAssets: [ac.id], expectedBenefit: "Undvik oplanerat haveri", tradeoff: "Flygplan otillgängligt under service" },
        ));
      }
    }

    // Maintenance bay utilization
    const maintenanceAircraft = base.aircraft.filter((a) => isInMaintenance(a.status));
    const waitingForBay = maintenanceAircraft.filter((a) => a.status === "unavailable");
    if (waitingForBay.length > 0 && base.maintenanceBays.occupied >= base.maintenanceBays.total) {
      recs.push(makeRec(
        `Underhållsköer vid ${base.id}`,
        `${waitingForBay.length} flygplan väntar på underhållsplats, alla ${base.maintenanceBays.total} platser upptagna.`,
        "rebalance",
        "high",
        { type: "ADVANCE_PHASE" },
        { affectedAssets: waitingForBay.map((a) => a.id), tradeoff: "Kan kräva omfördelning av flygplan mellan baser" },
      ));
    }
  }

  // Unassigned ATO orders
  const pendingOrders = state.atoOrders.filter((o) => o.status === "pending");
  for (const order of pendingOrders) {
    const base = state.bases.find((b) => b.id === order.launchBase);
    const availableAc = base?.aircraft.filter(
      (ac) => isMissionCapable(ac.status) && (!order.aircraftType || ac.type === order.aircraftType)
    ).length ?? 0;

    if (availableAc < order.requiredCount) {
      recs.push(makeRec(
        `Otillräckliga flygplan för ${order.missionType}`,
        `${order.label} kräver ${order.requiredCount} flygplan, bara ${availableAc} tillgängliga vid ${order.launchBase}.`,
        "reassign",
        "high",
        { type: "ADVANCE_PHASE" },
        { affectedMissions: [order.id], tradeoff: "Kan behöva omplanera bas eller typ" },
      ));
    }
  }

  // Cannibalization policy
  if (!canCannibalize(state.day)) {
    recs.push(makeRec(
      "Plundringsförbud aktiv",
      "Policy: Kannibalisering (plundring) är förbjuden denna dag.",
      "warning",
      "medium",
      { type: "ADVANCE_PHASE" },
      { expectedBenefit: "Informativ", tradeoff: "Kan begränsa underhållsmöjligheter" },
    ));
  }

  return recs;
}
