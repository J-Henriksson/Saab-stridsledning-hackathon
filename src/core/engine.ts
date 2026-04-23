import type { GameState, GameAction, GameEvent, AircraftStatus, MissionType, RiskLevel, BaseType } from "@/types/game";
import { isMissionCapable } from "@/types/game";
import { initialGameState } from "@/data/initialGameState";
import { MAINTENANCE_CREW_PER_AIRCRAFT, FUEL_DRAIN_RATE } from "@/data/config/capacities";
import { getPhaseForDay } from "@/data/config/scenario";
import { generateATOOrders } from "@/data/initialGameState";
import { generateRecommendations } from "./recommendations";
import { validateAction } from "./validators";
import { uuid } from "./uuid";

function assessRisk(health: number): RiskLevel {
  if (health < 20) return "catastrophic";
  if (health < 40) return "high";
  if (health < 60) return "medium";
  return "low";
}

function addEvent(state: GameState, event: Omit<GameEvent, "id" | "timestamp">): GameState {
  return {
    ...state,
    events: [
      {
        ...event,
        id: uuid(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
      },
      ...state.events,
    ].slice(0, 200),
  };
}

/** Pure reducer: gameReducer(state, action) => newState */
export function gameReducer(state: GameState, action: GameAction): GameState {
  // Reset / load are always valid
  if (action.type === "RESET_GAME") return initialGameState;
  if (action.type === "LOAD_STATE") return action.payload;

  // Validate action
  const validation = validateAction(state, action);
  if (!validation.valid) {
    return addEvent(state, {
      type: "warning",
      message: `Ogiltigt: ${validation.reason}`,
    });
  }

  switch (action.type) {
    case "TICK":
      return handleTick(state, action.seconds);

    case "ADVANCE_HOUR":
      return handleAdvanceHour(state);

    case "TOGGLE_PAUSE":
      return { ...state, isRunning: !state.isRunning };

    case "SET_GAME_SPEED":
      return { ...state, gameSpeed: action.speed };

    case "ASSIGN_AIRCRAFT":
      return handleAssignAircraft(state, action.orderId, action.aircraftIds);

    case "DISPATCH_ORDER":
      return handleDispatchOrder(state, action.orderId);

    case "START_MAINTENANCE":
      return handleStartMaintenance(state, action.baseId, action.aircraftId);

    case "SEND_MISSION_DROP":
      return handleSendMissionDrop(state, action.baseId, action.aircraftId, action.missionType, action.durationHours);

    case "APPLY_UTFALL_OUTCOME":
      return handleApplyUtfall(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.weaponLoss, action.actionLabel, action.requiredSparePart);

    case "COMPLETE_LANDING_CHECK":
      return handleCompleteLandingCheck(state, action.baseId, action.aircraftId, action.sendToMaintenance, action.repairTime, action.maintenanceTypeKey, action.weaponLoss, action.actionLabel);

    case "HANGAR_DROP_CONFIRM":
      return handleHangarDropConfirm(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.restoreHealth);

    case "PAUSE_MAINTENANCE":
      return handlePauseMaintenance(state, action.baseId, action.aircraftId);

    case "MARK_FAULT_NMC":
      return handleMarkFaultNMC(state, action.baseId, action.aircraftId, action.repairTime, action.maintenanceTypeKey, action.actionLabel, action.requiredSparePart);

    case "CONSUME_SPARE_PART":
      return handleConsumeSparePart(state, action.baseId, action.sparePartId, action.quantity ?? 1);

    case "IMPORT_ATO_BATCH": {
      const newOrders = action.orders.map(order => ({
        ...order,
        id: `ato-import-${uuid().slice(0, 8)}`,
        status: "pending" as const,
        assignedAircraft: [],
      }));
      const riskNote = action.riskCount > 0 ? ` ⚠ ${action.riskCount} uppdrag flaggade som RISK.` : "";
      return addEvent(
        { ...state, atoOrders: [...state.atoOrders, ...newOrders] },
        {
          type: "info",
          message: `ATO mottagen från "${action.sourceFile}": ${newOrders.length} nya uppdrag schemalagda.${riskNote}`,
        }
      );
    }

    case "MOVE_AIRCRAFT":
      return state; // TODO: implement zone-based movement

    case "CREATE_ATO_ORDER": {
      const preAssigned = (action as any).assignedAircraft as string[] | undefined;
      return {
        ...state,
        atoOrders: [
          ...state.atoOrders,
          {
            ...action.order,
            id: `ato-custom-${uuid().slice(0, 8)}`,
            status: preAssigned?.length ? "assigned" : "pending",
            assignedAircraft: preAssigned ?? [],
          },
        ],
      };
    }

    case "EDIT_ATO_ORDER":
      return {
        ...state,
        atoOrders: state.atoOrders.map((o) =>
          o.id === action.orderId ? { ...o, ...action.updates } : o
        ),
      };

    case "DELETE_ATO_ORDER":
      return {
        ...state,
        atoOrders: state.atoOrders.filter((o) => o.id !== action.orderId),
      };

    case "APPLY_RECOMMENDATION": {
      const rec = state.recommendations.find((r) => r.id === action.recommendationId);
      if (!rec) return state;
      // Apply the recommendation's action, then dismiss
      const afterApply = gameReducer(state, rec.applyAction);
      return {
        ...afterApply,
        recommendations: afterApply.recommendations.map((r) =>
          r.id === action.recommendationId ? { ...r, dismissed: true } : r
        ),
      };
    }

    case "DISMISS_RECOMMENDATION":
      return {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.recommendationId ? { ...r, dismissed: true } : r
        ),
      };

    case "REBASE_AIRCRAFT":
      return handleRebaseAircraft(state, action.aircraftId, action.fromBase, action.toBase);

    default:
      return state;
  }
}

function handleTick(state: GameState, seconds: number): GameState {
  const totalSec = state.second + seconds;
  const newSec = totalSec % 60;
  const extraMin = Math.floor(totalSec / 60);
  const totalMin = state.minute + extraMin;
  const newMin = totalMin % 60;
  const extraHour = Math.floor(totalMin / 60);

  if (extraHour > 0) {
    // Run full hour simulation then patch in sub-hour time
    const afterHour = handleAdvanceHour({ ...state, minute: newMin, second: newSec });
    return afterHour;
  }

  return { ...state, second: newSec, minute: newMin };
}

function handleAdvanceHour(state: GameState): GameState {
  const newHour = state.hour + 1;
  const dayRollover = newHour >= 24;
  const nextDay = dayRollover ? state.day + 1 : state.day;
  const nextHour = dayRollover ? 6 : newHour;
  const nextPhase = getPhaseForDay(nextDay);

  const newEvents: GameEvent[] = [];

  if (nextPhase !== state.phase) {
    newEvents.push({
      id: uuid(),
      timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
      type: "critical",
      message: `Fas ändrad till ${nextPhase}`,
    });
  }

  // Fuel drain + per-aircraft health wear
  const fuelDrain = FUEL_DRAIN_RATE[nextPhase] ?? 0.5;
  let updatedBases = state.bases.map((base) => {
    const anyOnMission = base.aircraft.some((ac) => ac.status === "on_mission");
    const drain = anyOnMission ? fuelDrain : 0;
    return {
      ...base,
      fuel: Math.max(0, base.fuel - drain),
      aircraft: base.aircraft.map((ac) => {
        let wear = 0;
        if (ac.status === "ready" || ac.status === "allocated") {
          wear = Math.floor(Math.random() * 6) + 5;
        } else if (ac.status === "on_mission") {
          wear = Math.floor(Math.random() * 11) + 20;
        }
        const consumesServiceHours = ["ready", "allocated", "in_preparation", "awaiting_launch", "on_mission", "returning"];
        const newHoursToService = consumesServiceHours.includes(ac.status)
          ? Math.max(0, ac.hoursToService - 1)
          : ac.hoursToService;
        if (wear === 0) return { ...ac, hoursToService: newHoursToService };
        const newHealth = Math.max(0, (ac.health ?? 100) - wear);
        if (newHealth === 0 && (ac.status === "ready" || ac.status === "allocated")) {
          return { ...ac, health: 0, hoursToService: newHoursToService, status: "unavailable" as AircraftStatus };
        }
        return { ...ac, health: newHealth, hoursToService: newHoursToService };
      }),
    };
  });

  // Tick maintenance timers
  updatedBases = updatedBases.map((base) => {
    let completedCount = 0;
    const updatedAircraft = base.aircraft.map((ac) => {
      if (ac.status === "under_maintenance" && ac.maintenanceTimeRemaining) {
        const remaining = ac.maintenanceTimeRemaining - 1;
        if (remaining <= 0) {
          completedCount++;
          newEvents.push({
            id: uuid(),
            timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
            type: "success",
            message: `${ac.tailNumber} underhåll klart — nu operativ`,
            base: base.id,
          });
          return {
            ...ac,
            status: "ready" as AircraftStatus,
            health: 100,
            hoursToService: 80,
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
    const personnel = completedCount > 0
      ? base.personnel.map((p) => ({
          ...p,
          available: Math.min(p.total, p.available + completedCount * (MAINTENANCE_CREW_PER_AIRCRAFT[p.id] ?? 0)),
        }))
      : base.personnel;
    return {
      ...base,
      aircraft: updatedAircraft,
      personnel,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintenanceCount, base.maintenanceBays.total) },
    };
  });

  // Generate new ATO on day rollover
  const newATOOrders = dayRollover ? generateATOOrders(nextDay, nextPhase) : state.atoOrders;

  // Mark completed orders and collect returning aircraft
  const returningAircraft: { aircraftId: string; baseId: string }[] = [];
  const updatedATOOrders = newATOOrders.map((o) => {
    if (o.status === "dispatched" && nextHour >= o.endHour) {
      if (o.missionType !== "REBASE") {
        o.assignedAircraft.forEach((acId) =>
          returningAircraft.push({ aircraftId: acId, baseId: o.launchBase })
        );
      }
      return { ...o, status: "completed" as const };
    }
    return o;
  });

  // Handle REBASE completions
  const rebaseTransfers: { aircraftId: string; fromBaseId: string; toBaseId: string }[] = [];
  updatedBases.forEach((base) => {
    base.aircraft.forEach((ac) => {
      if (
        ac.status === "on_mission" &&
        ac.currentMission === "REBASE" &&
        ac.rebaseTarget &&
        ac.missionEndHour !== undefined &&
        nextHour >= ac.missionEndHour
      ) {
        rebaseTransfers.push({ aircraftId: ac.id, fromBaseId: base.id, toBaseId: ac.rebaseTarget });
      }
    });
  });

  let basesAfterRebases = updatedBases;
  for (const transfer of rebaseTransfers) {
    const srcAircraft = basesAfterRebases
      .find((b) => b.id === transfer.fromBaseId)
      ?.aircraft.find((a) => a.id === transfer.aircraftId);
    if (!srcAircraft) continue;
    const arrivedAircraft = {
      ...srcAircraft,
      currentBase: transfer.toBaseId as BaseType,
      status: "ready" as AircraftStatus,
      currentMission: undefined,
      missionEndHour: undefined,
      rebaseTarget: undefined,
    };
    basesAfterRebases = basesAfterRebases.map((base) => {
      if (base.id === transfer.fromBaseId) {
        return { ...base, aircraft: base.aircraft.filter((a) => a.id !== transfer.aircraftId) };
      }
      if (base.id === transfer.toBaseId) {
        return { ...base, aircraft: [...base.aircraft, arrivedAircraft] };
      }
      return base;
    });
  }

  // Set returning aircraft
  const basesAfterReturn = basesAfterRebases.map((base) => ({
    ...base,
    aircraft: base.aircraft.map((ac) => {
      if (ac.status === "on_mission") {
        const fromATO = returningAircraft.some((r) => r.aircraftId === ac.id && r.baseId === base.id);
        const fromDrop = ac.missionEndHour !== undefined && nextHour >= ac.missionEndHour;
        if (fromATO || fromDrop) {
          if (fromDrop && !fromATO) {
            returningAircraft.push({ aircraftId: ac.id, baseId: base.id });
          }
          return { ...ac, status: "returning" as AircraftStatus, missionEndHour: undefined };
        }
      }
      return ac;
    }),
  }));

  if (returningAircraft.length > 0) {
    newEvents.push({
      id: uuid(),
      timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
      type: "info" as const,
      message: `${returningAircraft.length} flygplan återvänder — mottagningskontroll krävs`,
    });
  }

  // Resource checks every hour
  for (const base of basesAfterReturn) {
    if (base.fuel < 20) {
      newEvents.push({
        id: uuid(),
        timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
        type: "critical",
        message: `KRITISK bränslenivå vid ${base.id}: ${base.fuel.toFixed(0)}%`,
        base: base.id,
      });
    }
    for (const part of base.spareParts) {
      if (part.quantity === 0) {
        newEvents.push({
          id: uuid(),
          timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
          type: "critical",
          message: `SLUT PÅ ${part.name} vid ${base.id}`,
          base: base.id,
        });
      }
    }
  }

  if (dayRollover) {
    newEvents.push({
      id: uuid(),
      timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
      type: "info",
      message: `Dag ${nextDay} börjar — ATO uppdaterad`,
    });
  }

  const newLandingChecks = returningAircraft.map((r) => ({
    aircraftId: r.aircraftId,
    baseId: r.baseId as BaseType,
  }));

  const nextStatePreRec: GameState = {
    ...state,
    day: nextDay,
    hour: nextHour,
    phase: nextPhase,
    bases: basesAfterReturn,
    atoOrders: updatedATOOrders,
    pendingLandingChecks: [...(state.pendingLandingChecks ?? []), ...newLandingChecks],
    events: [...newEvents, ...state.events].slice(0, 200),
  };

  // Refresh recommendations every 3 game-hours
  if (nextHour % 3 === 0) {
    return { ...nextStatePreRec, recommendations: generateRecommendations(nextStatePreRec) };
  }
  return nextStatePreRec;
}

const REBASE_TRANSIT_HOURS = 2;

function handleRebaseAircraft(
  state: GameState,
  aircraftId: string,
  fromBaseId: string,
  toBaseId: string,
): GameState {
  const fromBase = state.bases.find((b) => b.id === fromBaseId);
  const aircraft = fromBase?.aircraft.find((a) => a.id === aircraftId);
  if (!aircraft) return state;

  const missionEndHour = state.hour + REBASE_TRANSIT_HOURS;
  const toBase = state.bases.find((b) => b.id === toBaseId);
  const toBaseName = toBase?.name ?? toBaseId;

  // Set aircraft to on_mission with rebaseTarget stored on the aircraft
  const updatedBases = state.bases.map((base) =>
    base.id === fromBaseId
      ? {
          ...base,
          aircraft: base.aircraft.map((ac) =>
            ac.id === aircraftId
              ? {
                  ...ac,
                  status: "on_mission" as AircraftStatus,
                  currentMission: "REBASE" as MissionType,
                  missionEndHour,
                  rebaseTarget: toBaseId as typeof ac.currentBase,
                }
              : ac
          ),
        }
      : base
  );

  // Create a dispatched REBASE ATO order for tracking
  const rebaseOrder = {
    id: `rebase-${uuid().slice(0, 8)}`,
    day: state.day,
    missionType: "REBASE" as MissionType,
    label: `Ombasering ${aircraft.tailNumber} → ${toBaseName}`,
    startHour: state.hour,
    endHour: missionEndHour,
    requiredCount: 1,
    launchBase: fromBaseId as typeof aircraft.currentBase,
    targetBase: toBaseId as typeof aircraft.currentBase,
    priority: "high" as const,
    status: "dispatched" as const,
    assignedAircraft: [aircraftId],
  };

  return addEvent(
    { ...state, bases: updatedBases, atoOrders: [...state.atoOrders, rebaseOrder] },
    {
      type: "info",
      message: `${aircraft.tailNumber} ombasering påbörjad → ${toBaseName} (ankomst ${String(missionEndHour % 24).padStart(2, "0")}:00Z)`,
      base: fromBaseId as typeof aircraft.currentBase,
      aircraftId: aircraft.tailNumber,
      riskLevel: "low",
      resourceImpact: `Ombasering från ${fromBaseId} till ${toBaseId}`,
      decisionContext: "Ombasering utförd manuellt",
    }
  );
}

function handleAssignAircraft(state: GameState, orderId: string, aircraftIds: string[]): GameState {
  return {
    ...state,
    atoOrders: state.atoOrders.map((o) =>
      o.id === orderId
        ? { ...o, assignedAircraft: aircraftIds, status: "assigned" as const }
        : o
    ),
  };
}

function handleDispatchOrder(state: GameState, orderId: string): GameState {
  const order = state.atoOrders.find((o) => o.id === orderId);
  if (!order || order.assignedAircraft.length === 0) return state;

  const updatedBases = state.bases.map((base) => {
    if (base.id !== order.launchBase) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) => {
        if (!order.assignedAircraft.includes(ac.id) || !isMissionCapable(ac.status)) return ac;
        const extra = order.missionType === "REBASE" && order.targetBase
          ? { missionEndHour: order.endHour, rebaseTarget: order.targetBase }
          : {};
        return { ...ac, status: "on_mission" as AircraftStatus, currentMission: order.missionType, ...extra };
      }),
    };
  });

  const newEvent: GameEvent = {
    id: uuid(),
    timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
    type: "success",
    message: `ATO-order ${order.missionType} (${order.label}): ${order.assignedAircraft.length} fpl skickade från ${order.launchBase}`,
    base: order.launchBase,
  };

  return {
    ...state,
    bases: updatedBases,
    successfulMissions: state.successfulMissions + 1,
    atoOrders: state.atoOrders.map((o) =>
      o.id === orderId ? { ...o, status: "dispatched" as const } : o
    ),
    events: [newEvent, ...state.events].slice(0, 200),
  };
}

function handleStartMaintenance(state: GameState, baseId: string, aircraftId: string): GameState {
  const tail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || ac.status !== "unavailable") return ac;
      return { ...ac, status: "under_maintenance" as AircraftStatus };
    });
    const maintenanceCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    return {
      ...base,
      aircraft,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintenanceCount, base.maintenanceBays.total) },
    };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "info",
    message: `Underhåll påbörjat på ${tail}`,
    base: baseId,
    aircraftId: tail,
    actionType: "MAINTENANCE_START",
    riskLevel: "low",
    resourceImpact: "Underhållsbay reserverad",
  });
}

function handleSendMissionDrop(state: GameState, baseId: string, aircraftId: string, missionType: MissionType, durationHours?: number): GameState {
  const endHour = durationHours ? state.hour + durationHours : undefined;
  const aircraft = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId);
  const tail = aircraft?.tailNumber ?? aircraftId;
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const acList = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || !isMissionCapable(ac.status)) return ac;
      return { ...ac, status: "on_mission" as AircraftStatus, currentMission: missionType, missionEndHour: endHour };
    });
    return { ...base, aircraft: acList };
  });

  return addEvent({ ...state, bases: updatedBases }, {
    type: "success",
    message: `${tail} skickad på ${missionType}-uppdrag`,
    base: baseId,
    aircraftId: tail,
    actionType: "MISSION_DISPATCH",
    riskLevel: assessRisk(aircraft?.health ?? 100),
    healthAtDecision: aircraft?.health,
    resourceImpact: `${missionType}-uppdrag${durationHours ? ` ${durationHours}h` : ""}`,
    decisionContext: "Uppdragsdispatch",
  });
}

function handleCompleteLandingCheck(
  state: GameState,
  baseId: string,
  aircraftId: string,
  sendToMaintenance: boolean,
  repairTime?: number,
  maintenanceTypeKey?: string,
  weaponLoss?: number,
  actionLabel?: string,
): GameState {
  const updatedLandingChecks = (state.pendingLandingChecks ?? []).filter(
    (c) => !(c.aircraftId === aircraftId && c.baseId === baseId)
  );

  if (sendToMaintenance && repairTime && maintenanceTypeKey) {
    const afterMaint = handleApplyUtfall(state, baseId, aircraftId, repairTime, maintenanceTypeKey, weaponLoss ?? 0, actionLabel ?? "Underhåll efter landning");
    return { ...afterMaint, pendingLandingChecks: updatedLandingChecks };
  }

  // Clear returning status → ready, remove currentMission
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) =>
        ac.id === aircraftId
          ? { ...ac, status: "ready" as AircraftStatus, currentMission: undefined }
          : ac
      ),
    };
  });

  const landTail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  return addEvent({ ...state, bases: updatedBases, pendingLandingChecks: updatedLandingChecks }, {
    type: "success",
    message: `${landTail} landad och godkänd — återvänder till uppställningsplats`,
    base: baseId as any,
    aircraftId: landTail,
    actionType: "LANDING_RECEIVED",
    riskLevel: "low",
  });
}

function handleApplyUtfall(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  weaponLoss: number,
  actionLabel: string,
  requiredSparePart?: string,
): GameState {
  let consumedPartName: string | undefined;

  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId) return ac;
      if (repairTime === 0) {
        // NMC — park the aircraft and remember which part will be needed when it enters the bay
        return { ...ac, status: "unavailable" as AircraftStatus, requiredSparePart };
      }
      return {
        ...ac,
        status: "under_maintenance" as AircraftStatus,
        maintenanceType: maintenanceTypeKey as any,
        maintenanceTimeRemaining: repairTime,
        requiredSparePart: undefined, // consumed below
      };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    const personnel = repairTime > 0
      ? base.personnel.map((p) => ({
          ...p,
          available: Math.max(0, p.available - (MAINTENANCE_CREW_PER_AIRCRAFT[p.id] ?? 0)),
        }))
      : base.personnel;

    // Consume the spare part immediately when the aircraft goes straight into maintenance
    let spareParts = base.spareParts;
    if (repairTime > 0 && requiredSparePart) {
      spareParts = base.spareParts.map((p) =>
        p.id === requiredSparePart ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p
      );
      consumedPartName = base.spareParts.find((p) => p.id === requiredSparePart)?.name ?? requiredSparePart;
    }

    return {
      ...base,
      aircraft,
      personnel,
      spareParts,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  const utfallTail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  const partNote = consumedPartName ? ` — reservdel använd: ${consumedPartName}` : "";
  const utfallRisk: RiskLevel = repairTime > 8 ? "catastrophic" : repairTime > 4 ? "high" : repairTime > 2 ? "medium" : "low";
  return addEvent({ ...state, bases: updatedBases }, {
    type: utfallRisk === "catastrophic" ? "critical" : "warning",
    message: `UTFALL: ${utfallTail} — ${actionLabel} — ${repairTime}h underhåll (Vapensystemsförlust ${weaponLoss}%)${partNote}`,
    base: baseId,
    aircraftId: utfallTail,
    actionType: "UTFALL_APPLIED",
    riskLevel: utfallRisk,
    resourceImpact: `${repairTime}h underhåll`,
    decisionContext: utfallRisk === "catastrophic" ? "Katastrofalt fel — varningar ignorerades" : actionLabel,
  });
}

function handleHangarDropConfirm(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  restoreHealth: boolean,
): GameState {
  let consumedPartName: string | undefined;

  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const incoming = base.aircraft.find((a) => a.id === aircraftId);
    const partToConsume = incoming?.requiredSparePart;

    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId) return ac;
      return {
        ...ac,
        status: "under_maintenance" as AircraftStatus,
        maintenanceType: maintenanceTypeKey as any,
        maintenanceTimeRemaining: repairTime,
        requiredSparePart: undefined, // consumed below
      };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    const personnel = base.personnel.map((p) => ({
      ...p,
      available: Math.max(0, p.available - (MAINTENANCE_CREW_PER_AIRCRAFT[p.id] ?? 0)),
    }));

    // Consume the spare part stored on the NMC aircraft when it finally enters the bay
    let spareParts = base.spareParts;
    if (partToConsume) {
      spareParts = base.spareParts.map((p) =>
        p.id === partToConsume ? { ...p, quantity: Math.max(0, p.quantity - 1) } : p
      );
      consumedPartName = base.spareParts.find((p) => p.id === partToConsume)?.name ?? partToConsume;
    }

    return {
      ...base,
      aircraft,
      personnel,
      spareParts,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  const hangarTail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  const label = restoreHealth ? "Förebyggande underhåll" : "Felsökning/Reparation";
  const partNote = consumedPartName ? ` — reservdel använd: ${consumedPartName}` : "";
  return addEvent({ ...state, bases: updatedBases }, {
    type: "info",
    message: `${hangarTail} → ${label} (${repairTime}h) påbörjat${partNote}`,
    base: baseId,
    aircraftId: hangarTail,
    actionType: "HANGAR_CONFIRM",
    riskLevel: "low",
    resourceImpact: `${repairTime}h underhåll`,
    decisionContext: label,
  });
}

function handleMarkFaultNMC(
  state: GameState,
  baseId: string,
  aircraftId: string,
  repairTime: number,
  maintenanceTypeKey: string,
  actionLabel: string,
  requiredSparePart?: string,
): GameState {
  // Mark aircraft as unavailable (NMC) with fault data stored — NOT placed in a bay yet
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    return {
      ...base,
      aircraft: base.aircraft.map((ac) => {
        if (ac.id !== aircraftId) return ac;
        return {
          ...ac,
          status: "unavailable" as AircraftStatus,
          health: 0,
          maintenanceType: maintenanceTypeKey as any,
          maintenanceTimeRemaining: repairTime,
          requiredSparePart,
        };
      }),
    };
  });

  const nmcTail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  return addEvent({ ...state, bases: updatedBases }, {
    type: "warning",
    message: `${nmcTail} NMC — ${actionLabel} (${repairTime}h) — ej i hangar`,
    base: baseId,
    aircraftId: nmcTail,
    actionType: "FAULT_NMC",
    riskLevel: "high",
    resourceImpact: "Plan NMC — inväntar hangarplats",
    decisionContext: actionLabel,
  });
}

function handlePauseMaintenance(state: GameState, baseId: string, aircraftId: string): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    const aircraft = base.aircraft.map((ac) => {
      if (ac.id !== aircraftId || ac.status !== "under_maintenance") return ac;
      // Pause: work stops, aircraft returns to unavailable (fault still present)
      return { ...ac, status: "unavailable" as AircraftStatus, health: 0 };
    });
    const maintCount = aircraft.filter((a) => a.status === "under_maintenance").length;
    // Restore crew when aircraft leaves maintenance bay
    const personnel = base.personnel.map((p) => ({
      ...p,
      available: Math.min(p.total, p.available + (MAINTENANCE_CREW_PER_AIRCRAFT[p.id] ?? 0)),
    }));
    return {
      ...base,
      aircraft,
      personnel,
      maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
    };
  });

  const pauseTail = state.bases.find((b) => b.id === baseId)?.aircraft.find((a) => a.id === aircraftId)?.tailNumber ?? aircraftId;
  return addEvent({ ...state, bases: updatedBases }, {
    type: "warning",
    message: `Underhåll pausat på ${pauseTail} — arbetet återupptas manuellt`,
    base: baseId,
    aircraftId: pauseTail,
    actionType: "MAINTENANCE_PAUSE",
    riskLevel: "medium",
    resourceImpact: "Underhållsbay frigjord",
    decisionContext: "Underhåll avbrutet manuellt",
  });
}

function handleConsumeSparePart(state: GameState, baseId: string, sparePartId: string, quantity: number): GameState {
  const updatedBases = state.bases.map((base) => {
    if (base.id !== baseId) return base;
    return {
      ...base,
      spareParts: base.spareParts.map((p) =>
        p.id === sparePartId
          ? { ...p, quantity: Math.max(0, p.quantity - quantity) }
          : p
      ),
    };
  });
  const part = state.bases.find((b) => b.id === baseId)?.spareParts.find((p) => p.id === sparePartId);
  return addEvent({ ...state, bases: updatedBases }, {
    type: "info",
    message: `Reservdel använd: ${part?.name ?? sparePartId} (−${quantity}) vid ${baseId}`,
    base: baseId,
    actionType: "SPARE_PART_USED",
    riskLevel: "low",
    resourceImpact: `${part?.name ?? sparePartId} ×${quantity}`,
  });
}
