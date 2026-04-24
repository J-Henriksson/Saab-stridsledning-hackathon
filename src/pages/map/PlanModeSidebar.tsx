import { useState } from "react";
import { Shield, Crosshair, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import type { GameState, GameAction } from "@/types/game";
import { FriendlySection } from "./plan/FriendlySection";
import { EnemySection } from "./plan/EnemySection";

type PlacingKind = "friendly_base" | "friendly_entity" | "friendly_unit" | "enemy_base" | "enemy_entity" | "road_base";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onFinalizePlan: () => void;
}

export type { PlacingPayload, PlacingKind };

export function PlanModeSidebar({ state, dispatch, onStartPlacement, onFinalizePlan }: Props) {
  const [friendlyOpen, setFriendlyOpen] = useState(true);
  const [enemyOpen, setEnemyOpen] = useState(true);

  const hasAnyPlanData =
    state.enemyBases.length > 0 ||
    state.enemyEntities.length > 0 ||
    state.friendlyMarkers.length > 0 ||
    state.deployedUnits.some((u) => u.affiliation === "friend");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
          Planläge
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Redigera resurser och lägg till positioner
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Friendly section */}
        <div className="border-b border-border">
          <button
            onClick={() => setFriendlyOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider flex-1 text-left">
              Vänliga
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {state.bases.length + state.friendlyMarkers.length} baser · {state.deployedUnits.filter((u) => u.affiliation === "friend").length + state.friendlyEntities.length} enheter · {state.roadBases.length} vägbaser
            </span>
            {friendlyOpen
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>
          {friendlyOpen && (
            <FriendlySection
              bases={state.bases}
              friendlyMarkers={state.friendlyMarkers}
              friendlyEntities={state.friendlyEntities}
              roadBases={state.roadBases}
              placedUnits={state.deployedUnits}
              dispatch={dispatch}
              onStartPlacement={onStartPlacement}
            />
          )}
        </div>

        {/* Enemy section */}
        <div>
          <button
            onClick={() => setEnemyOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <Crosshair className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex-1 text-left">
              Fiende
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {state.enemyBases.length} baser · {state.enemyEntities.length} enheter
            </span>
            {enemyOpen
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </button>
          {enemyOpen && (
            <EnemySection
              enemyBases={state.enemyBases}
              enemyEntities={state.enemyEntities}
              dispatch={dispatch}
              onStartPlacement={onStartPlacement}
            />
          )}
        </div>
      </div>

      {/* Finalize plan button */}
      <div className="shrink-0 p-4 border-t border-border">
        <button
          onClick={onFinalizePlan}
          disabled={!hasAnyPlanData}
          className="w-full h-10 rounded-lg font-mono font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          style={{
            background: hasAnyPlanData ? "rgba(215,171,58,0.15)" : "rgba(100,116,139,0.08)",
            border: `1px solid ${hasAnyPlanData ? "#D7AB3A" : "rgba(100,116,139,0.25)"}`,
            color: hasAnyPlanData ? "#D7AB3A" : "#475569",
            cursor: hasAnyPlanData ? "pointer" : "not-allowed",
          }}
        >
          <Sparkles size={13} />
          Godkänn plan
        </button>
        {!hasAnyPlanData && (
          <p className="text-center text-[9px] font-mono mt-1.5" style={{ color: "#475569" }}>
            Lägg till minst en enhet eller bas
          </p>
        )}
      </div>
    </div>
  );
}
