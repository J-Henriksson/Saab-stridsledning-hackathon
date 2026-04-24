import { useState } from "react";
import { Radio, Shield } from "lucide-react";
import type { RoadBase, RoadBaseStatus, RoadBaseEchelon, GameAction } from "@/types/game";

const STATUSES: { value: RoadBaseStatus; label: string; cls: string }[] = [
  { value: "Operativ",  label: "Operativ",  cls: "text-green-400 border-green-500/40 bg-green-500/10"  },
  { value: "Beredskap", label: "Beredskap", cls: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" },
  { value: "Underhåll", label: "Underhåll", cls: "text-gray-400 border-gray-500/40 bg-gray-500/10"    },
];

const ECHELONS: { value: RoadBaseEchelon; label: string }[] = [
  { value: "Group",    label: "Grupp"   },
  { value: "Platoon",  label: "Pluton"  },
  { value: "Battalion",label: "Bataljon"},
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/40">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono font-bold text-foreground">{value}</span>
    </div>
  );
}

export function RoadBaseDetailPanel({
  roadBase,
  isPlanMode,
  dispatch,
  rangeRadiusKm,
  onSetRange,
}: {
  roadBase: RoadBase;
  isPlanMode: boolean;
  dispatch: (action: GameAction) => void;
  rangeRadiusKm: number;
  onSetRange: (km: number) => void;
}) {
  const [editName, setEditName]     = useState(roadBase.name);
  const [editParent, setEditParent] = useState(roadBase.parentBaseId);

  function commitEdit(updates: Partial<Omit<RoadBase, "id" | "createdAt" | "isDraggable">>) {
    dispatch({ type: "PLAN_EDIT_ROAD_BASE", id: roadBase.id, updates });
  }

  const statusMeta = STATUSES.find((s) => s.value === roadBase.status) ?? STATUSES[0];
  const echelonLabel = ECHELONS.find((e) => e.value === roadBase.echelon)?.label ?? roadBase.echelon;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${statusMeta.cls}`}>
        <Shield className="h-4 w-4" />
        STATUS: {statusMeta.label.toUpperCase()}
      </div>

      {/* Range ring slider — always visible, only interactive in plan mode */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
            <Radio className="h-3 w-3" /> RÄCKVIDD
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: "#2D5A27" }}>
            {rangeRadiusKm} km
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={rangeRadiusKm}
          onChange={(e) => {
            const km = Number(e.target.value);
            onSetRange(km);
            if (isPlanMode) commitEdit({ rangeRadius: km });
          }}
          disabled={!isPlanMode}
          className="w-full h-1.5 disabled:opacity-50 disabled:cursor-default"
          style={{ accentColor: "#2D5A27", cursor: isPlanMode ? "pointer" : "default" }}
        />
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
          <span>5 km</span>
          <span>100 km</span>
        </div>
      </div>

      {/* Info rows — always shown */}
      <div className="border border-border rounded-lg p-3 space-y-0.5">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Information</div>
        <InfoRow label="Beteckning" value={roadBase.name} />
        <InfoRow label="Echelon"    value={echelonLabel} />
        <InfoRow label="Förband"    value={roadBase.parentBaseId} />
        <InfoRow label="Räckvidd"   value={`${rangeRadiusKm} km`} />
      </div>

      {/* Edit fields — only in plan mode */}
      {isPlanMode && (
        <div className="border border-border rounded-lg p-3 space-y-3">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Redigera</div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground block mb-1">Beteckning</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => commitEdit({ name: editName })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground block mb-1">Status</label>
            <select
              value={roadBase.status}
              onChange={(e) => commitEdit({ status: e.target.value as RoadBaseStatus })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground block mb-1">Echelon</label>
            <select
              value={roadBase.echelon}
              onChange={(e) => commitEdit({ echelon: e.target.value as RoadBaseEchelon })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
            >
              {ECHELONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground block mb-1">Förälderbas / Förband</label>
            <input
              value={editParent}
              onChange={(e) => setEditParent(e.target.value)}
              onBlur={() => commitEdit({ parentBaseId: editParent })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
            />
          </div>
        </div>
      )}
    </div>
  );
}
