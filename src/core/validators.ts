import type { GameState, GameAction, AircraftStatus } from "@/types/game";
import { isMissionCapable } from "@/types/game";
import type { Unit } from "@/types/units";
import { canStoreUnit } from "@/core/units/capacity";
import { getAircraft } from "@/core/units/helpers";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

function allUnits(state: GameState): Unit[] {
  return [...state.bases.flatMap((b) => b.units), ...state.deployedUnits];
}

// Actions that are always allowed
const ALWAYS_ALLOWED: GameAction["type"][] = [
  "TICK",
  "ADVANCE_HOUR",
  "TOGGLE_PAUSE",
  "SET_GAME_SPEED",
  "RESET_GAME",
  "SEND_MISSION_DROP",
  "APPLY_UTFALL_OUTCOME",
  "START_MAINTENANCE",
  "MOVE_AIRCRAFT",
  "ASSIGN_AIRCRAFT",
  "DISPATCH_ORDER",
  "APPLY_RECOMMENDATION",
  "DISMISS_RECOMMENDATION",
];

/** Validate whether an action is allowed in the current game state */
export function validateAction(state: GameState, action: GameAction): ValidationResult {
  // Phase-independent actions are always valid (subject to state checks below)
  // Phase-gated actions (CREATE/EDIT/DELETE ATO) checked below

  switch (action.type) {
    case "ASSIGN_AIRCRAFT": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.status === "dispatched" || order.status === "completed") {
        return { valid: false, reason: "Order already dispatched or completed" };
      }
      const base = state.bases.find((b) => b.id === order.launchBase);
      if (!base) return { valid: false, reason: "Launch base not found" };
      for (const acId of action.aircraftIds) {
        const ac = getAircraft(base).find((a) => a.id === acId);
        if (!ac) return { valid: false, reason: `Aircraft ${acId} not found at ${order.launchBase}` };
        if (!isMissionCapable(ac.status)) {
          return { valid: false, reason: `Aircraft ${acId} is not mission capable (${ac.status})` };
        }
      }
      return { valid: true };
    }

    case "DISPATCH_ORDER": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.assignedAircraft.length === 0) {
        return { valid: false, reason: "No aircraft assigned to order" };
      }
      return { valid: true };
    }

    case "START_MAINTENANCE": {
      const base = state.bases.find((b) => b.id === action.baseId);
      if (!base) return { valid: false, reason: "Base not found" };
      const ac = getAircraft(base).find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Aircraft not found" };
      if (ac.status !== "unavailable") {
        return { valid: false, reason: "Aircraft is not in unavailable state" };
      }
      if (base.maintenanceBays.occupied >= base.maintenanceBays.total) {
        return { valid: false, reason: "All maintenance bays are occupied" };
      }
      return { valid: true };
    }

    case "SEND_MISSION_DROP": {
      const base = state.bases.find((b) => b.id === action.baseId);
      if (!base) return { valid: false, reason: "Base not found" };
      const ac = getAircraft(base).find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Aircraft not found" };
      if (!isMissionCapable(ac.status)) {
        return { valid: false, reason: "Aircraft is not mission capable" };
      }
      return { valid: true };
    }

    case "DELETE_ATO_ORDER": {
      const order = state.atoOrders.find((o) => o.id === action.orderId);
      if (!order) return { valid: false, reason: "ATO order not found" };
      if (order.status === "dispatched") {
        return { valid: false, reason: "Cannot delete a dispatched order" };
      }
      return { valid: true };
    }

    case "DEPLOY_UNIT": {
      const unit = allUnits(state).find((u) => u.id === action.unitId);
      if (!unit) return { valid: false, reason: "Unit not found" };
      const atBase = state.bases.some((b) => b.units.some((u) => u.id === unit.id));
      if (!atBase) return { valid: false, reason: "Unit already deployed" };
      return { valid: true };
    }
    case "TRANSFER_UNIT": {
      const unit = allUnits(state).find((u) => u.id === action.unitId);
      if (!unit) return { valid: false, reason: "Unit not found" };
      const dest = state.bases.find((b) => b.id === action.toBaseId);
      if (!dest) return { valid: false, reason: "Destination base not found" };
      const cap = canStoreUnit(dest, unit);
      if (!cap.ok) return { valid: false, reason: cap.reason };
      return { valid: true };
    }
    case "RECALL_UNIT": {
      const unit = allUnits(state).find((u) => u.id === action.unitId);
      if (!unit) return { valid: false, reason: "Unit not found" };
      const atBase = state.bases.some((b) => b.units.some((u) => u.id === unit.id));
      if (atBase) return { valid: false, reason: "Unit already at base" };
      const homeId = action.toBaseId ?? unit.currentBase ?? unit.lastBase;
      if (!homeId) return { valid: false, reason: "No home base to recall to" };
      const dest = state.bases.find((b) => b.id === homeId);
      if (!dest) return { valid: false, reason: "Home base not found" };
      const cap = canStoreUnit(dest, unit);
      if (!cap.ok) return { valid: false, reason: cap.reason };
      return { valid: true };
    }
    case "RELOCATE_UNIT":
    case "CLASSIFY_CONTACT":
    case "SET_AD_STATE":
    case "SET_RADAR_EMITTING":
    case "STORE_UNIT":
      return { valid: true };

    case "CREATE_ATO_ORDER":
    case "EDIT_ATO_ORDER":
    case "MOVE_AIRCRAFT":
    case "APPLY_RECOMMENDATION":
    case "DISMISS_RECOMMENDATION":
    case "APPLY_UTFALL_OUTCOME":
    case "COMPLETE_LANDING_CHECK":
    case "HANGAR_DROP_CONFIRM":
    case "PAUSE_MAINTENANCE":
    case "MARK_FAULT_NMC":
    case "CONSUME_SPARE_PART":
    case "TICK":
    case "ADVANCE_HOUR":
    case "TOGGLE_PAUSE":
    case "SET_GAME_SPEED":
    case "RESET_GAME":
    case "PLAN_ADD_ENEMY_BASE":
    case "PLAN_EDIT_ENEMY_BASE":
    case "PLAN_DELETE_ENEMY_BASE":
    case "PLAN_ADD_ENEMY_ENTITY":
    case "PLAN_EDIT_ENEMY_ENTITY":
    case "PLAN_DELETE_ENEMY_ENTITY":
    case "PLAN_UPDATE_BASE_RESOURCES":
    case "PLAN_ADD_FRIENDLY_MARKER":
    case "PLAN_EDIT_FRIENDLY_MARKER":
    case "PLAN_DELETE_FRIENDLY_MARKER":
    case "PLAN_ADD_FRIENDLY_ENTITY":
    case "PLAN_EDIT_FRIENDLY_ENTITY":
    case "PLAN_DELETE_FRIENDLY_ENTITY":
    case "PLAN_ADD_ROAD_BASE":
    case "PLAN_EDIT_ROAD_BASE":
    case "PLAN_DELETE_ROAD_BASE":
    case "PLAN_UPDATE_COORDS_ROAD_BASE":
    case "PLAN_ADD_FRIENDLY_UNIT":
    case "PLAN_DELETE_FRIENDLY_UNIT":
    case "ADD_TACTICAL_ZONE":
    case "REMOVE_TACTICAL_ZONE":
    case "SET_OVERLAY_VISIBILITY":
    case "ADD_EVENT":
      return { valid: true };

    case "REBASE_AIRCRAFT": {
      const fromBase = state.bases.find((b) => b.id === action.fromBase);
      if (!fromBase) return { valid: false, reason: "Avsändarbas ej hittad" };
      const ac = getAircraft(fromBase).find((a) => a.id === action.aircraftId);
      if (!ac) return { valid: false, reason: "Flygplan ej hittat vid angiven bas" };
      const blocked: AircraftStatus[] = ["on_mission", "in_preparation", "awaiting_launch", "returning", "recovering", "allocated"];
      if (blocked.includes(ac.status)) {
        return { valid: false, reason: `Kan ej ombasera ${ac.tailNumber} — status: ${ac.status}` };
      }
      if (action.fromBase === action.toBase) return { valid: false, reason: "Samma bas" };
      if (!state.bases.find((b) => b.id === action.toBase)) return { valid: false, reason: "Destinationsbas ej hittad" };
      return { valid: true };
    }

    default:
      return { valid: false, reason: "Unknown action type" };
  }
}
