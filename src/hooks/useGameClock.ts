import { useEffect, type Dispatch } from "react";
import type { GameState, GameAction } from "@/types/game";

const MS_PER_HOUR = 3_600_000; // 1 real hour = 1 game hour

export function useGameClock(state: GameState, dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    if (!state.isRunning) return;
    const id = setInterval(() => dispatch({ type: "ADVANCE_HOUR" }), MS_PER_HOUR);
    return () => clearInterval(id);
  }, [state.isRunning, dispatch]);
}
