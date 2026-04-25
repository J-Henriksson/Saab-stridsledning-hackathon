import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { GameState, GameAction, NavalUnit, GameEvent } from "@/types/game";
import { absoluteGameSec } from "@/core/engine";
import { step_scenario } from "./controller";
import { SHIP_SPAWNS, TRANSIT_CLOCK_MULT, SCENARIO_CAMERA } from "./geo";

export interface ScenarioApi {
  /** Returns true if the click was consumed by the scenario controller. */
  handleEventClick: (event: GameEvent) => boolean;
  /** Operator pressed "Skicka 2× JAS" — advances to stage 4. */
  acceptInterceptOrder: () => void;
}

interface UseScenarioOptions {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  flyTo: (pos: { lat: number; lng: number; zoom?: number }) => void;
}

export function useScenario({ state, dispatch, flyTo }: UseScenarioOptions): ScenarioApi {
  // ── Hidden keystroke arming (Shift+Alt+S) ────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // KeyS is layout-independent and survives Mac's Option dead-key mapping
      // (where Shift+Option+S would otherwise produce "Í"). Works on Win/Linux too.
      const isS = e.code === "KeyS" || e.key === "S" || e.key === "s" || e.key === "Í" || e.key === "í";
      const armCombo = e.shiftKey && e.altKey && isS;
      // Backup: F9 also arms (no chord conflicts).
      const f9 = e.key === "F9" || e.code === "F9";
      if (armCombo || f9) {
        e.preventDefault();
        // eslint-disable-next-line no-console
        console.log("[scenario] arm key pressed", { code: e.code, key: e.key, shift: e.shiftKey, alt: e.altKey });
        if (!state.scenario || state.scenario.beat === "done") {
          dispatch({ type: "SCENARIO_ARM" });
          // eslint-disable-next-line no-console
          console.log("[scenario] SCENARIO_ARM dispatched");
        } else {
          // eslint-disable-next-line no-console
          console.log("[scenario] already armed; current beat:", state.scenario.beat);
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dispatch, state.scenario]);

  // ── Per-tick scenario stepping ───────────────────────────────────────────
  const lastTickSecRef = useRef<number | null>(null);
  useEffect(() => {
    const sc = state.scenario;
    if (!sc) {
      lastTickSecRef.current = null;
      return;
    }
    if (sc.beat === "done") {
      lastTickSecRef.current = absoluteGameSec(state);
      return;
    }
    const now = absoluteGameSec(state);
    const last = lastTickSecRef.current ?? now;
    const delta = Math.max(0, now - last);
    lastTickSecRef.current = now;
    if (delta === 0) return;
    const actions = step_scenario(state, delta);
    for (const a of actions) dispatch(a);
  }, [state, dispatch]);

  // ── Capture the bogey-event id once stage2 fires ─────────────────────────
  useEffect(() => {
    const sc = state.scenario;
    if (!sc || sc.beat !== "stage2" || sc.bogeyEventId) return;
    const ev = state.events.find(
      (e) =>
        e.actionType === "CONTACT_CLASSIFIED" &&
        e.message.includes("luftmål") &&
        e.id !== sc.triggerEventId,
    );
    if (ev) dispatch({ type: "SCENARIO_SET_BOGEY_EVENT_ID", eventId: ev.id });
  }, [state.events, state.scenario, dispatch]);

  // ── Event click handler exposed up to EventsSidebar ──────────────────────
  const handleEventClick = (event: GameEvent): boolean => {
    const sc = state.scenario;
    if (!sc) return false;

    // Stage 1: trigger event clicked. Boats are already spawned (engine did
    // it on SCENARIO_ARM); we only fly the camera and advance the beat.
    if (event.id === sc.triggerEventId && sc.beat === "armed") {
      flyTo({ lat: SCENARIO_CAMERA.lat, lng: SCENARIO_CAMERA.lng, zoom: SCENARIO_CAMERA.zoom });
      dispatch({ type: "SCENARIO_SET_BEAT", beat: "stage1" });
      return true;
    }

    // Stage 3: bogey-detected event clicked
    if (event.id === sc.bogeyEventId && sc.beat === "stage2") {
      flyTo({ lat: 56.7, lng: 18.6, zoom: 6.0 });
      dispatch({ type: "SCENARIO_SET_BEAT", beat: "stage3" });
      return true;
    }

    return false;
  };

  const acceptInterceptOrder = () => {
    const sc = state.scenario;
    if (!sc || sc.beat !== "stage3") return;

    // Clear patrol/destination on the two interceptors. Without this the
    // engine's per-minute tickPatrol + advanceMovement keep re-snapping them
    // toward their original Blekinge racetrack each minute, which produces
    // a visible jiggle as the scenario's per-tick position writes fight the
    // engine's patrol logic.
    for (const fid of sc.friendlyInterceptIds) {
      dispatch({
        type: "SCENARIO_PATCH_FRIENDLY_FIGHTER",
        id: fid,
        updates: {
          patrol: undefined,
          patrolLegIdx: undefined,
          movement: { state: "airborne", speed: 540 },
        },
      });
    }

    dispatch({ type: "SCENARIO_SET_BEAT", beat: "stage4" });
    dispatch({ type: "SET_CLOCK_MULTIPLIER", value: TRANSIT_CLOCK_MULT });
    dispatch({
      type: "ADD_EVENT",
      event: {
        type: "info",
        message: "Order mottagen — JAS-pair F17 startar avvisning. ETA ~4 min.",
        actionType: "MISSION_DISPATCH",
      },
    });
  };

  return { handleEventClick, acceptInterceptOrder };
}
