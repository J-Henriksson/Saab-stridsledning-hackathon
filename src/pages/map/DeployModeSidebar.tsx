import { useState } from "react";
import { Shield, Crosshair, X, Zap } from "lucide-react";
import type { GameState, GameAction } from "@/types/game";
import { FriendlySection } from "./plan/FriendlySection";
import { EnemySection } from "./plan/EnemySection";
import type { PlacingPayload } from "./PlanModeSidebar";

type SidebarTab = "friendly" | "enemy";

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onClose: () => void;
  onFlyTo: (lat: number, lng: number) => void;
}

export function DeployModeSidebar({ state, dispatch, onStartPlacement, onClose, onFlyTo }: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("friendly");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-orange-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest flex-1">
            Direktdeploy
          </span>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Stäng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
          Placeringar går direkt till live-läget — ingen planfas.
        </p>

        {/* Friendly / Enemy tab toggle */}
        <div className="flex rounded overflow-hidden border border-border">
          <button
            onClick={() => setActiveTab("friendly")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
              activeTab === "friendly"
                ? "bg-blue-600/20 text-blue-400 border-r border-blue-500/30"
                : "text-muted-foreground hover:text-foreground border-r border-border"
            }`}
          >
            <Shield className="h-3 w-3" />
            Vänliga
            <span className="text-[9px] font-normal opacity-70">
              ({state.bases.length + state.friendlyMarkers.length}b · {state.deployedUnits.filter((u) => u.affiliation === "friend").length + state.friendlyEntities.length}e)
            </span>
          </button>
          <button
            onClick={() => setActiveTab("enemy")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
              activeTab === "enemy"
                ? "bg-red-600/20 text-red-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crosshair className="h-3 w-3" />
            Fiende
            <span className="text-[9px] font-normal opacity-70">
              ({state.enemyBases.length}b · {state.enemyEntities.length}e)
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "friendly" ? (
          <FriendlySection
            bases={state.bases}
            friendlyMarkers={state.friendlyMarkers}
            friendlyEntities={state.friendlyEntities}
            roadBases={state.roadBases}
            placedUnits={state.deployedUnits}
            dispatch={dispatch}
            onStartPlacement={onStartPlacement}
            onFlyTo={onFlyTo}
          />
        ) : (
          <EnemySection
            enemyBases={state.enemyBases}
            enemyEntities={state.enemyEntities}
            dispatch={dispatch}
            onStartPlacement={onStartPlacement}
            onFlyTo={onFlyTo}
          />
        )}
      </div>
    </div>
  );
}
