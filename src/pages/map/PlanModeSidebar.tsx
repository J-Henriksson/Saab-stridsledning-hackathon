import { useState } from "react";
import { Shield, Crosshair, FileText, Pencil, Sparkles } from "lucide-react";
import type { GameState, GameAction } from "@/types/game";
import { FriendlySection } from "./plan/FriendlySection";
import { EnemySection } from "./plan/EnemySection";
import type { PlanTab, DelaySpec } from "@/hooks/usePlanTabs";
import { generatePlanSummary } from "@/hooks/usePlanTabs";

type PlacingKind = "friendly_base" | "friendly_entity" | "friendly_unit" | "enemy_base" | "enemy_entity" | "road_base";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  tab: PlanTab;
  state: GameState;
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onFinalizePlan: () => void;
  onRename: (name: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, delay: DelaySpec | null) => void;
}

export type { PlacingPayload, PlacingKind };

type SidebarTab = "friendly" | "enemy";

export function PlanModeSidebar({ tab, state, dispatch, onStartPlacement, onFinalizePlan, onRename, onFlyTo, delays, onSetDelay }: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("friendly");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(tab.name);

  function commitRename() {
    if (draftName.trim()) onRename(draftName.trim());
    setEditingName(false);
  }

  function handleExportText() {
    const text = generatePlanSummary({ ...tab, name: draftName.trim() || tab.name });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab.name.replace(/\s+/g, "-")}-sammanfattning.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasAnyPlanData =
    state.enemyBases.length > 0 ||
    state.enemyEntities.length > 0 ||
    state.friendlyMarkers.length > 0 ||
    state.deployedUnits.some((u) => u.affiliation === "friend");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border shrink-0 space-y-2">
        {/* Plan name + export */}
        <div className="flex items-center gap-1.5">
          {editingName ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 bg-background border border-amber-500/50 rounded px-2 py-0.5 text-xs font-mono text-amber-300 outline-none"
            />
          ) : (
            <button
              onClick={() => { setDraftName(tab.name); setEditingName(true); }}
              className="flex-1 flex items-center gap-1.5 text-left group"
            >
              <span className="text-xs font-mono font-bold text-amber-400 truncate">{tab.name}</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <button
            onClick={handleExportText}
            title="Exportera lättläst sammanfattning för AI/briefing"
            className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-muted-foreground text-[10px] font-mono hover:text-foreground hover:border-amber-500/40 transition-colors shrink-0"
          >
            <FileText className="h-3 w-3" />
            Export
          </button>
        </div>

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
            delays={delays}
            onSetDelay={onSetDelay}
          />
        ) : (
          <EnemySection
            enemyBases={state.enemyBases}
            enemyEntities={state.enemyEntities}
            dispatch={dispatch}
            onStartPlacement={onStartPlacement}
            onFlyTo={onFlyTo}
            delays={delays}
            onSetDelay={onSetDelay}
          />
        )}
      </div>

      {/* Readiness summary */}
      <div className="shrink-0 px-4 pt-3 pb-0 border-t border-border">
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            {
              label: "Fiender",
              value: state.enemyBases.length + state.enemyEntities.length,
              warn: state.enemyBases.some((b) => b.threatLevel === "high"),
              color: state.enemyBases.some((b) => b.threatLevel === "high") ? "#f87171" : "#94a3b8",
            },
            {
              label: "Egna",
              value: state.deployedUnits.filter((u) => u.affiliation === "friend").length + state.friendlyMarkers.length,
              warn: false,
              color: "#60a5fa",
            },
            {
              label: "Vägbaser",
              value: state.roadBases.length,
              warn: state.roadBases.length === 0 && state.enemyBases.length >= 2,
              color: state.roadBases.length > 0 ? "#4ade80" : "#475569",
            },
          ].map(({ label, value, warn, color }) => (
            <div
              key={label}
              className="rounded p-1.5 text-center"
              style={{ background: warn ? "rgba(239,68,68,0.08)" : "rgba(100,116,139,0.08)", border: `1px solid ${warn ? "rgba(239,68,68,0.25)" : "rgba(100,116,139,0.18)"}` }}
            >
              <div className="text-[14px] font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-[8px] font-mono uppercase tracking-widest mt-0.5" style={{ color: warn ? "#f87171" : "#64748b" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Finalize plan button */}
      <div className="shrink-0 px-4 pb-4">
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
