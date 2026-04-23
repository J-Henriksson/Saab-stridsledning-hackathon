import { useEffect, type Dispatch } from "react";
import type { GameState, GameAction } from "@/types/game";

// ms per game-hour for each speed multiplier
const MS_PER_HOUR_BASE = 5000;

export function useGameClock(state: GameState, dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    if (!state.isRunning) return;
    const ms = MS_PER_HOUR_BASE / state.gameSpeed;
    const id = setInterval(() => dispatch({ type: "ADVANCE_HOUR" }), ms);
    return () => clearInterval(id);
  }, [state.isRunning, state.gameSpeed, dispatch]);
}
