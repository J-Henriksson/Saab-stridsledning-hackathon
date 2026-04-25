import { useState } from "react";
import { Plus, Trash2, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import type { EnemyBase, EnemyBaseCategory, EnemyEntity, EnemyEntityCategory, ThreatLevel, OperationalStatus, GameAction } from "@/types/game";

// ── Types ─────────────────────────────────────────────────────────────────

type PlacingKind = "enemy_base" | "enemy_entity";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  enemyBases: EnemyBase[];
  enemyEntities: EnemyEntity[];
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────

const BASE_CATEGORIES: { value: EnemyBaseCategory; label: string }[] = [
  { value: "airfield",  label: "Flygbas" },
  { value: "sam_site",  label: "Luftvärnsposition" },
  { value: "command",   label: "Ledningscentral" },
  { value: "logistics", label: "Logistikpunkt" },
  { value: "radar",     label: "Radarstation" },
];

const ENTITY_CATEGORIES: { value: EnemyEntityCategory; label: string }[] = [
  { value: "fighter",      label: "Jaktflyg" },
  { value: "transport",    label: "Transportflyg" },
  { value: "helicopter",   label: "Helikopter" },
  { value: "apc",          label: "Bepansrat fordon" },
  { value: "artillery",    label: "Artilleri" },
  { value: "sam_launcher", label: "Luftvärnsrobot" },
  { value: "ship",         label: "Fartyg" },
];

const THREATS: { value: ThreatLevel; label: string }[] = [
  { value: "high",    label: "Hög" },
  { value: "medium",  label: "Medel" },
  { value: "low",     label: "Låg" },
  { value: "unknown", label: "Okänd" },
];

const STATUSES: { value: OperationalStatus; label: string }[] = [
  { value: "active",    label: "Aktiv" },
  { value: "suspected", label: "Misstänkt" },
  { value: "destroyed", label: "Neutraliserad" },
  { value: "unknown",   label: "Okänd" },
];

const THREAT_DOT: Record<ThreatLevel, string> = {
  high: "bg-red-400", medium: "bg-yellow-400", low: "bg-green-400", unknown: "bg-muted-foreground",
};

// ── Add form ──────────────────────────────────────────────────────────────

function AddForm({
  title,
  fields,
  canPlace,
  onPlace,
  onCancel,
}: {
  title: string;
  fields: React.ReactNode;
  canPlace: boolean;
  onPlace: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-amber-500/30 rounded bg-amber-500/5 p-3 space-y-2">
      <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">{title}</div>
      {fields}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onPlace}
          disabled={!canPlace}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-mono font-bold disabled:opacity-40 transition-colors"
        >
          <MapPin className="h-3 w-3" />
          Välj position
        </button>
        <button
          onClick={onCancel}
          className="py-1.5 px-3 rounded border border-border text-muted-foreground text-[11px] font-mono hover:text-foreground transition-colors"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

// ── Enemy item row ────────────────────────────────────────────────────────

function EnemyBaseRow({
  base,
  dispatch,
  onFlyTo,
}: {
  base: EnemyBase;
  dispatch: (a: GameAction) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rangeInput, setRangeInput] = useState(String(base.threatRangeKm ?? 0));

  function commitRange() {
    const km = Math.max(0, Number(rangeInput) || 0);
    dispatch({ type: "PLAN_EDIT_ENEMY_BASE", id: base.id, updates: { threatRangeKm: km } });
    setRangeInput(String(km));
  }

  return (
    <div className="border border-border rounded mb-1.5">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${THREAT_DOT[base.threatLevel]}`} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono font-bold text-red-300">{base.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{BASE_CATEGORIES.find(c => c.value === base.category)?.label}</span>
          {(base.threatRangeKm ?? 0) > 0 && (
            <span className="text-[9px] font-mono text-red-400/70 ml-1.5">⌀ {base.threatRangeKm} km</span>
          )}
        </div>
        {onFlyTo && (
          <button onClick={() => onFlyTo(base.coords.lat, base.coords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
            <MapPin className="h-3 w-3" />
          </button>
        )}
        <button onClick={() => setOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <button onClick={() => dispatch({ type: "PLAN_DELETE_ENEMY_BASE", id: base.id })} className="p-1 text-muted-foreground hover:text-red-400">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2 border-t border-border/50 pt-2 space-y-1.5 text-[11px] font-mono text-muted-foreground">
          {base.estimates && <div><span className="text-muted-foreground/60">Styrka:</span> {base.estimates}</div>}
          {base.notes && <div><span className="text-muted-foreground/60">Notering:</span> {base.notes}</div>}
          <div className="text-[10px] text-muted-foreground/50">{base.coords.lat.toFixed(3)}, {base.coords.lng.toFixed(3)}</div>
          {/* Threat range editor */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-muted-foreground/60 shrink-0">Hotzon (km):</span>
            <input
              type="number"
              min={0}
              step={10}
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              onBlur={commitRange}
              onKeyDown={(e) => e.key === "Enter" && commitRange()}
              className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-xs font-mono text-foreground"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EnemyEntityRow({
  entity,
  dispatch,
  onFlyTo,
}: {
  entity: EnemyEntity;
  dispatch: (a: GameAction) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded mb-1.5">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${THREAT_DOT[entity.threatLevel]}`} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono font-bold text-red-200">{entity.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{ENTITY_CATEGORIES.find(c => c.value === entity.category)?.label}</span>
        </div>
        {onFlyTo && (
          <button onClick={() => onFlyTo(entity.coords.lat, entity.coords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
            <MapPin className="h-3 w-3" />
          </button>
        )}
        <button onClick={() => setOpen((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <button onClick={() => dispatch({ type: "PLAN_DELETE_ENEMY_ENTITY", id: entity.id })} className="p-1 text-muted-foreground hover:text-red-400">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2 border-t border-border/50 pt-2 space-y-1 text-[11px] font-mono text-muted-foreground">
          {entity.estimates && <div><span className="text-muted-foreground/60">Styrka:</span> {entity.estimates}</div>}
          {entity.notes && <div><span className="text-muted-foreground/60">Notering:</span> {entity.notes}</div>}
          <div className="text-[10px] text-muted-foreground/50">{entity.coords.lat.toFixed(3)}, {entity.coords.lng.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function EnemySection({ enemyBases, enemyEntities, dispatch, onStartPlacement, onFlyTo }: Props) {
  const [addingBase, setAddingBase] = useState(false);
  const [addingEntity, setAddingEntity] = useState(false);

  // Base form
  const [baseName, setBaseName] = useState("");
  const [baseCategory, setBaseCategory] = useState<EnemyBaseCategory>("airfield");
  const [baseThreat, setBaseThreat] = useState<ThreatLevel>("unknown");
  const [baseStatus, setBaseStatus] = useState<OperationalStatus>("suspected");
  const [baseEstimates, setBaseEstimates] = useState("");
  const [baseNotes, setBaseNotes] = useState("");
  const [baseThreatRange, setBaseThreatRange] = useState("");

  // Entity form
  const [entityName, setEntityName] = useState("");
  const [entityCategory, setEntityCategory] = useState<EnemyEntityCategory>("fighter");
  const [entityThreat, setEntityThreat] = useState<ThreatLevel>("unknown");
  const [entityStatus, setEntityStatus] = useState<OperationalStatus>("suspected");
  const [entityEstimates, setEntityEstimates] = useState("");
  const [entityNotes, setEntityNotes] = useState("");

  function handlePlaceBase() {
    if (!baseName.trim()) return;
    onStartPlacement({ kind: "enemy_base", data: { name: baseName, category: baseCategory, threatLevel: baseThreat, operationalStatus: baseStatus, estimates: baseEstimates, notes: baseNotes, threatRangeKm: baseThreatRange } });
    setAddingBase(false);
    setBaseName(""); setBaseCategory("airfield"); setBaseThreat("unknown"); setBaseStatus("suspected"); setBaseEstimates(""); setBaseNotes(""); setBaseThreatRange("");
  }

  function handlePlaceEntity() {
    if (!entityName.trim()) return;
    onStartPlacement({ kind: "enemy_entity", data: { name: entityName, category: entityCategory, threatLevel: entityThreat, operationalStatus: entityStatus, estimates: entityEstimates, notes: entityNotes } });
    setAddingEntity(false);
    setEntityName(""); setEntityCategory("fighter"); setEntityThreat("unknown"); setEntityStatus("suspected"); setEntityEstimates(""); setEntityNotes("");
  }

  const inputCls = "w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground";

  return (
    <div className="p-3 space-y-2">
      {/* Enemy bases overview */}
      {enemyBases.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Fiendebaser</div>
          {enemyBases.map((b) => <EnemyBaseRow key={b.id} base={b} dispatch={dispatch} onFlyTo={onFlyTo} />)}
        </>
      )}

      {/* Enemy entities overview */}
      {enemyEntities.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-2 mb-1">Fiendeenheter</div>
          {enemyEntities.map((e) => <EnemyEntityRow key={e.id} entity={e} dispatch={dispatch} onFlyTo={onFlyTo} />)}
        </>
      )}

      {enemyBases.length === 0 && enemyEntities.length === 0 && (
        <p className="text-[10px] text-muted-foreground font-mono py-1">Inga fiendepositioner planlagda.</p>
      )}

      {/* Add buttons */}
      <div className="pt-2 space-y-2">
        {addingBase ? (
          <AddForm
            title="Ny fiendens bas"
            canPlace={!!baseName.trim()}
            onPlace={handlePlaceBase}
            onCancel={() => setAddingBase(false)}
            fields={
              <>
                <input autoFocus placeholder="Målbeteckning (t.ex. OSCAR-1)" value={baseName} onChange={(e) => setBaseName(e.target.value)} className={inputCls} />
                <select value={baseCategory} onChange={(e) => setBaseCategory(e.target.value as EnemyBaseCategory)} className={inputCls}>
                  {BASE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={baseThreat} onChange={(e) => setBaseThreat(e.target.value as ThreatLevel)} className={inputCls}>
                  {THREATS.map((t) => <option key={t.value} value={t.value}>{t.label} hot</option>)}
                </select>
                <select value={baseStatus} onChange={(e) => setBaseStatus(e.target.value as OperationalStatus)} className={inputCls}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input placeholder="Uppskattad styrka (t.ex. ~12 Mig-29, 4 S-400)" value={baseEstimates} onChange={(e) => setBaseEstimates(e.target.value)} className={inputCls} />
                <input type="number" min={0} step={10} placeholder="Hotzon (km, 0 = ingen ring)" value={baseThreatRange} onChange={(e) => setBaseThreatRange(e.target.value)} className={inputCls} />
                <textarea placeholder="Anteckningar/underrättelser..." value={baseNotes} rows={2} onChange={(e) => setBaseNotes(e.target.value)} className={`${inputCls} resize-none`} />
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingBase(true); setAddingEntity(false); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-red-500/40 rounded text-[11px] font-mono text-red-400 hover:border-red-500/70 hover:bg-red-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Lägg till fiendens bas
          </button>
        )}

        {addingEntity ? (
          <AddForm
            title="Ny fiendens enhet"
            canPlace={!!entityName.trim()}
            onPlace={handlePlaceEntity}
            onCancel={() => setAddingEntity(false)}
            fields={
              <>
                <input autoFocus placeholder="Enhetsbeteckning (t.ex. ROMEO-4)" value={entityName} onChange={(e) => setEntityName(e.target.value)} className={inputCls} />
                <select value={entityCategory} onChange={(e) => setEntityCategory(e.target.value as EnemyEntityCategory)} className={inputCls}>
                  {ENTITY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={entityThreat} onChange={(e) => setEntityThreat(e.target.value as ThreatLevel)} className={inputCls}>
                  {THREATS.map((t) => <option key={t.value} value={t.value}>{t.label} hot</option>)}
                </select>
                <select value={entityStatus} onChange={(e) => setEntityStatus(e.target.value as OperationalStatus)} className={inputCls}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input placeholder="Uppskattad styrka (t.ex. ~8 stridsvagnar)" value={entityEstimates} onChange={(e) => setEntityEstimates(e.target.value)} className={inputCls} />
                <textarea placeholder="Anteckningar/underrättelser..." value={entityNotes} rows={2} onChange={(e) => setEntityNotes(e.target.value)} className={`${inputCls} resize-none`} />
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingEntity(true); setAddingBase(false); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-red-500/40 rounded text-[11px] font-mono text-red-400 hover:border-red-500/70 hover:bg-red-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Lägg till fiendens enhet
          </button>
        )}
      </div>
    </div>
  );
}
