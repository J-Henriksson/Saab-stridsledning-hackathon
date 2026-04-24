import { useState } from "react";
import { Pencil, Trash2, Plus, MapPin } from "lucide-react";
import type { EnemyBase, EnemyBaseCategory, ThreatLevel, GameAction } from "@/types/game";

interface Props {
  enemyBases: EnemyBase[];
  dispatch: (action: GameAction) => void;
  pendingCoords: { lat: number; lng: number } | null;
  onStartPlacement: () => void;
  onClearPendingCoords: () => void;
}

const CATEGORIES: { value: EnemyBaseCategory; label: string }[] = [
  { value: "airfield", label: "Flygbas" },
  { value: "sam_site", label: "Luftvärnsposition" },
  { value: "command", label: "Ledningscentral" },
  { value: "logistics", label: "Logistikpunkt" },
  { value: "radar", label: "Radarstation" },
];

const THREATS: { value: ThreatLevel; label: string }[] = [
  { value: "high", label: "Hög" },
  { value: "medium", label: "Medel" },
  { value: "low", label: "Låg" },
  { value: "unknown", label: "Okänd" },
];

const THREAT_COLOR: Record<ThreatLevel, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-green-400",
  unknown: "text-muted-foreground",
};

interface EditState {
  name: string;
  category: EnemyBaseCategory;
  threatLevel: ThreatLevel;
  notes: string;
}

function defaultEdit(base?: Partial<EnemyBase>): EditState {
  return {
    name: base?.name ?? "",
    category: base?.category ?? "airfield",
    threatLevel: base?.threatLevel ?? "unknown",
    notes: base?.notes ?? "",
  };
}

function BaseForm({
  initial,
  coords,
  onSave,
  onCancel,
}: {
  initial: EditState;
  coords?: { lat: number; lng: number };
  onSave: (data: EditState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="bg-muted/20 border border-amber-500/30 rounded p-3 space-y-2">
      {coords && (
        <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </div>
      )}

      <input
        autoFocus
        placeholder="Målbeteckning (t.ex. OSCAR-1)"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
      />

      <select
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EnemyBaseCategory }))}
        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      <select
        value={form.threatLevel}
        onChange={(e) => setForm((f) => ({ ...f, threatLevel: e.target.value as ThreatLevel }))}
        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
      >
        {THREATS.map((t) => (
          <option key={t.value} value={t.value}>{t.label} hot</option>
        ))}
      </select>

      <textarea
        placeholder="Anteckningar..."
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        rows={2}
        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
      />

      <div className="flex gap-2">
        <button
          onClick={() => { if (form.name.trim()) onSave(form); }}
          disabled={!form.name.trim()}
          className="flex-1 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-mono font-bold disabled:opacity-40 transition-colors"
        >
          Spara
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1 rounded border border-border text-muted-foreground text-[11px] font-mono hover:text-foreground transition-colors"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

export function EnemyBasesTab({ enemyBases, dispatch, pendingCoords, onStartPlacement, onClearPendingCoords }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(data: EditState) {
    if (!pendingCoords) return;
    dispatch({
      type: "PLAN_ADD_ENEMY_BASE",
      base: { ...data, coords: pendingCoords },
    });
    onClearPendingCoords();
  }

  function handleEdit(id: string, data: EditState) {
    dispatch({ type: "PLAN_EDIT_ENEMY_BASE", id, updates: data });
    setEditingId(null);
  }

  function handleDelete(id: string) {
    dispatch({ type: "PLAN_DELETE_ENEMY_BASE", id });
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-[10px] text-muted-foreground font-mono">
        Lägg till och hantera fiendens baser på kartan.
      </p>

      {enemyBases.map((base) => (
        <div key={base.id}>
          {editingId === base.id ? (
            <BaseForm
              initial={defaultEdit(base)}
              onSave={(data) => handleEdit(base.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start gap-2 p-2 border border-border rounded bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-red-400 truncate">{base.name}</span>
                  <span className={`text-[9px] font-mono uppercase ${THREAT_COLOR[base.threatLevel]}`}>
                    {base.threatLevel}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === base.category)?.label}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/60">
                  {base.coords.lat.toFixed(3)}, {base.coords.lng.toFixed(3)}
                </div>
              </div>
              <button onClick={() => setEditingId(base.id)} className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(base.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}

      {pendingCoords ? (
        <BaseForm
          initial={defaultEdit()}
          coords={pendingCoords}
          onSave={handleAdd}
          onCancel={onClearPendingCoords}
        />
      ) : (
        <button
          onClick={onStartPlacement}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-red-500/40 rounded text-[11px] font-mono text-red-400 hover:border-red-500/70 hover:bg-red-500/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Lägg till fiendens bas
        </button>
      )}
    </div>
  );
}
