import type { GameState, GameEvent, AircraftStatus } from "@/types/game";
import { isMissionCapable } from "@/types/game";
import { getPhaseForDay } from "@/data/config/scenario";
import { generateATOOrders } from "@/data/initialGameState";
import { FUEL_DRAIN_RATE } from "@/data/config/capacities";
import { rollRandomFailure, rollFailureType } from "./stochastics";
import { generateRecommendations } from "./recommendations";

/** Handle a specific phase, returning the updated state */
export function handlePhase(state: GameState): GameState {
  switch (state.turnPhase) {
    case "InitializeState":
      return handleInitializeState(state);
    case "InterpretATO":
      return handleInterpretATO(state);
    case "ReviewResources":
      return handleReviewResources(state);
    case "ChooseGroupingStrategy":
    case "SetManningSchedule":
    case "EstimateNeeds":
    case "BuildTimetable":
      return state; // pass-through for auto-advance phases
    case "AllocateAircraft":
      return state; // player-driven
    case "OrderPreparation":
      return state; // player-driven
    case "PrepareStatusCards":
      return handlePrepareStatusCards(state);
    case "ExecutePreparation":
      return handleExecutePreparation(state);
    case "ReportOutcome":
      return handleReportOutcome(state);
    case "UpdateMaintenancePlan":
      return handleUpdateMaintenancePlan(state);
    case "IncrementTime":
      return handleIncrementTime(state);
    default:
      return state;
  }
}

function addEvent(state: GameState, event: Omit<GameEvent, "id" | "timestamp">): GameState {
  return {
    ...state,
    events: [
      {
        ...event,
        id: crypto.randomUUID(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
      },
      ...state.events,
    ].slice(0, 50),
  };
}

function handleInitializeState(state: GameState): GameState {
  return addEvent(state, {
    type: "info",
    message: `Varv ${state.turnNumber} startar — Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
  });
}

function handleInterpretATO(state: GameState): GameState {
  const unmetOrders = state.atoOrders.filter((o) => {
    if (o.status !== "pending") return false;
    const base = state.bases.find((b) => b.id === o.launchBase);
    const available = base?.aircraft.filter(
      (ac) => isMissionCapable(ac.status) && (!o.aircraftType || ac.type === o.aircraftType)
    ).length ?? 0;
    return available < o.requiredCount;
  });

  let s = state;
  for (const order of unmetOrders) {
    s = addEvent(s, {
      type: "warning",
      message: `ATO-krav ej uppfyllt: ${order.missionType} (${order.label}) — otillräckliga flygplan vid ${order.launchBase}`,
      base: order.launchBase,
    });
  }
  return s;
}

function handleReviewResources(state: GameState): GameState {
  let s = state;
  for (const base of s.bases) {
    if (base.fuel < 20) {
      s = addEvent(s, {
        type: "critical",
        message: `KRITISK bränslenivå vid ${base.id}: ${base.fuel.toFixed(0)}%`,
        base: base.id,
      });
    }
    for (const part of base.spareParts) {
      if (part.quantity === 0) {
        s = addEvent(s, {
          type: "critical",
          message: `SLUT PÅ ${part.name} vid ${base.id}`,
          base: base.id,
        });
      }
    }
    for (const ammo of base.ammunition) {
      if (ammo.quantity / ammo.max < 0.2) {
        s = addEvent(s, {
          type: "warning",
          message: `Låg ammunition ${ammo.type} vid ${base.id}: ${ammo.quantity}/${ammo.max}`,
          base: base.id,
        });
      }
    }
  }
  return s;
}

function handlePrepareStatusCards(state: GameState): GameState {
  const recommendations = generateRecommendations(state);
  return { ...state, recommendations };
}

function handleExecutePreparation(state: GameState): GameState {
  const newEvents: GameEvent[] = [];

  const updatedBases = state.bases.map((base) => {
    const updatedAircraft = base.aircraft.map((ac) => {
      // Random failure on ready aircraft
      if (ac.status === "ready" && rollRandomFailure()) {
        const { type: failType, time: failTime } = rollFailureType();
        newEvents.push({
          id: crypto.randomUUID(),
          timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
          type: "warning",
          message: `${ac.tailNumber} rapporterar fel — kräver ${failType} (${failTime}h)`,
          base: base.id,
        });
        return {
          ...ac,
          status: "unavailable" as AircraftStatus,
          maintenanceType: failType,
          maintenanceTimeRemaining: failTime,
        };
      }
      return ac;
    });
    return { ...base, aircraft: updatedAircraft };
  });

  return {
    ...state,
    bases: updatedBases,
    events: [...newEvents, ...state.events].slice(0, 50),
  };
}

function handleReportOutcome(state: GameState): GameState {
  const totalMC = state.bases.reduce(
    (s, b) => s + b.aircraft.filter((a) => isMissionCapable(a.status)).length,
    0
  );
  const totalAc = state.bases.reduce((s, b) => s + b.aircraft.length, 0);

  return addEvent(state, {
    type: "info",
    message: `Rapport: MC-rate ${Math.round((totalMC / totalAc) * 100)}% (${totalMC}/${totalAc}) — ${state.successfulMissions} lyckade uppdrag`,
  });
}

function handleUpdateMaintenancePlan(state: GameState): GameState {
  const newEvents: GameEvent[] = [];

  const updatedBases = state.bases.map((base) => {
    const updatedAircraft = base.aircraft.map((ac) => {
      if (ac.status === "under_maintenance" && ac.maintenanceTimeRemaining) {
        const remaining = ac.maintenanceTimeRemaining - 1;
        if (remaining <= 0) {
          newEvents.push({
            id: crypto.randomUUID(),
            timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
            type: "success",
            message: `${ac.tailNumber} underhåll klart — nu operativ`,
            base: base.id,
          });
          return {
            ...ac,
            status: "ready" as AircraftStatus,
            maintenanceTimeRemaining: undefined,
            maintenanceType: undefined,
            maintenanceTask: undefined,
          };
        }
        return { ...ac, maintenanceTimeRemaining: remaining };
      }
      return ac;
    });

    const maintenanceCount = updatedAircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft: updatedAircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintenanceCount, base.maintenanceBays.total) },
    };
  });

  return {
    ...state,
    bases: updatedBases,
    events: [...newEvents, ...state.events].slice(0, 50),
  };
}

function handleIncrementTime(state: GameState): GameState {
  const newHour = state.hour + 1;
  const dayRollover = newHour >= 24;
  const nextDay = dayRollover ? state.day + 1 : state.day;
  const nextHour = dayRollover ? 6 : newHour;
  const nextPhase = getPhaseForDay(nextDay);

  const newEvents: GameEvent[] = [];

  if (nextPhase !== state.phase) {
    newEvents.push({
      id: crypto.randomUUID(),
      timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
      type: "critical",
      message: `Fas ändrad till ${nextPhase}`,
    });
  }

  // Fuel drain
  const fuelDrain = FUEL_DRAIN_RATE[nextPhase] ?? 0.5;
  const updatedBases = state.bases.map((base) => ({
    ...base,
    fuel: Math.max(0, base.fuel - fuelDrain),
  }));

  // Generate new ATO on day rollover
  const newATOOrders = dayRollover
    ? generateATOOrders(nextDay, nextPhase)
    : state.atoOrders;

  // Mark completed orders
  const updatedATOOrders = newATOOrders.map((o) =>
    o.status === "dispatched" && nextHour >= o.endHour
      ? { ...o, status: "completed" as const }
      : o
  );

  return {
    ...state,
    day: nextDay,
    hour: nextHour,
    phase: nextPhase,
    bases: updatedBases,
    atoOrders: updatedATOOrders,
    events: [...newEvents, ...state.events].slice(0, 50),
  };
}
