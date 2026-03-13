import React, { createContext, useContext } from "react";
import { useGameEngine, type GameEngine } from "@/hooks/useGameEngine";

const GameContext = createContext<GameEngine | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const engine = useGameEngine();
  return <GameContext.Provider value={engine}>{children}</GameContext.Provider>;
}

/** Shared game state hook — replaces per-page useGameState() calls */
export function useGame(): GameEngine {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
