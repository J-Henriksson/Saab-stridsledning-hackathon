import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useGameEngine, type GameEngine } from "@/hooks/useGameEngine";
import { SetupScreen } from "@/components/setup/SetupScreen";
import { applySetupOverrides } from "@/utils/applySetupOverrides";
import { initialGameState } from "@/data/initialGameState";
import type { SetupOverrides } from "@/types/setup";

const GameContext = createContext<GameEngine | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameEngine();
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartDefault = useCallback(() => {
    setGameStarted(true);
  }, []);

  const handleStartCustom = useCallback(
    (overrides: SetupOverrides) => {
      engine.dispatch({
        type: "LOAD_STATE",
        payload: applySetupOverrides(initialGameState, overrides),
      });
      setGameStarted(true);
    },
    [engine]
  );

  // Wrap resetGame so it also returns to the setup screen
  const wrappedEngine = useMemo<GameEngine>(
    () => ({
      ...engine,
      resetGame: () => {
        engine.resetGame();
        setGameStarted(false);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine]
  );

  if (!gameStarted) {
    return (
      <GameContext.Provider value={wrappedEngine}>
        <SetupScreen
          onStartDefault={handleStartDefault}
          onStartCustom={handleStartCustom}
        />
      </GameContext.Provider>
    );
  }

  return (
    <GameContext.Provider value={wrappedEngine}>{children}</GameContext.Provider>
  );
}

/** Shared game state hook — replaces per-page useGameState() calls */
export function useGame(): GameEngine {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
