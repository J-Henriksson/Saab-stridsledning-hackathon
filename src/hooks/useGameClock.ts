import { useEffect, type Dispatch } from "react";
import type { GameState, GameAction } from "@/types/game";

// Cap at ~60fps so fast speeds show smooth second-counting rather than big jumps
const MAX_FPS = 60;
const FRAME_MS = 1_000 / MAX_FPS; // ~16.67ms

export function useGameClock(state: GameState, dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    if (!state.isRunning) return;

    // At slow speeds (1×) tick once per second; at fast speeds cap at 60fps
    const tickMs = Math.max(1_000 / state.gameSpeed, FRAME_MS);
    // Scripted demos can raise this hidden multiplier to advance sim time
    // faster than the user-visible gameSpeed slider would suggest.
    const mult = state.clockMultiplier ?? 1;
    const seconds = Math.max(1, Math.round(state.gameSpeed * mult * tickMs / 1_000));

    const id = setInterval(() => dispatch({ type: "TICK", seconds }), tickMs);
    return () => clearInterval(id);
  }, [state.isRunning, state.gameSpeed, state.clockMultiplier, dispatch]);
}
