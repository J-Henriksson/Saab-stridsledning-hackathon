import { useState } from "react";
import {
  Shield, FileText, Pencil, Sparkles, Trash2, MapPin, Plus,
  Crosshair, ChevronDown, ChevronRight, Fuel, Wrench, Zap, List, Check, Info, Play,
} from "lucide-react";
import type { GameState, GameAction, BaseType, FriendlyMarkerCategory, AircraftType, EnemyBaseCategory, EnemyEntityCategory, ThreatLevel, OperationalStatus, RoadBaseStatus, RoadBaseEchelon } from "@/types/game";
import type { UnitCategory, DroneType, GroundRadarType, AirDefenseType, GroundVehicleType } from "@/types/units";
import type { PlanTab, DelaySpec, AiRecommendation } from "@/hooks/usePlanTabs";
import { generatePlanSummary, delayToLabel } from "@/hooks/usePlanTabs";
import { getAircraft } from "@/core/units/helpers";
import { BASE_COORDS } from "./constants";
import { Slider } from "@/components/ui/slider";

type PlacingKind = "friendly_base" | "friendly_entity" | "friendly_unit" | "enemy_base" | "enemy_entity" | "road_base";
interface PlacingPayload { kind: PlacingKind; data: Record<string, string>; }
export type { PlacingPayload, PlacingKind };

interface Props {
  tab: PlanTab;
  state: GameState;
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onFinalizePlan: () => void;
  onRename: (name: string) => void;
  onFlyTo: (lat: number, lng: number) => void;
  onSelectUnit?: (id: string) => void;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, delay: DelaySpec | null) => void;
}

// ── Delay helpers ──────────────────────────────────────────────────────────

const DELAY_OPTIONS = [
  { label: "Omedelbart", value: "" },
  { label: "Om 15 min",   value: "15:minutes" },
  { label: "Om 1 timme",  value: "1:hours" },
  { label: "Om 6 timmar", value: "6:hours" },
  { label: "Om 1 dag",    value: "1:days" },
  { label: "Om 3 dagar",  value: "3:days" },
  { label: "Om 1 vecka",  value: "1:weeks" },
  { label: "Om 2 veckor", value: "2:weeks" },
];

function parseDelay(v: string): DelaySpec | null {
  if (!v) return null;
  const [val, unit] = v.split(":");
  return { value: Number(val), unit: unit as DelaySpec["unit"] };
}

function DelaySelect({ id, delays, onSetDelay }: { id: string; delays: Record<string, DelaySpec | null>; onSetDelay: (id: string, d: DelaySpec | null) => void }) {
  const current = delays[id] ?? null;
  return (
    <select
      value={current ? `${current.value}:${current.unit}` : ""}
      onChange={(e) => onSetDelay(id, parseDelay(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      title={`Exekveringstid: ${delayToLabel(current)}`}
      className="bg-background border border-amber-500/25 rounded px-1 py-0.5 text-[9px] font-mono text-amber-400/70 hover:text-amber-400 hover:border-amber-500/50 transition-colors shrink-0"
    >
      {DELAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Shared item row ────────────────────────────────────────────────────────

function PlanItemRow({ label, sub, color = "#93c5fd", id, coords, delays, onSetDelay, onFlyTo, onSelectUnit, onDelete, isNew }: {
  label: string; sub?: string; color?: string;
  id: string; coords?: { lat: number; lng: number } | null;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, d: DelaySpec | null) => void;
  onFlyTo: (lat: number, lng: number) => void;
  onSelectUnit?: (id: string) => void;
  onDelete: () => void;
  isNew?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 border rounded ${
      isNew ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-muted/5"
    }`}>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold truncate" style={{ color }}>{label}</span>
          {isNew && (
            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded"
              style={{ background: "rgba(215,171,58,0.18)", border: "1px solid rgba(215,171,58,0.4)", color: "#D7AB3A" }}>
              +NY
            </span>
          )}
        </div>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
      <DelaySelect id={id} delays={delays} onSetDelay={onSetDelay} />
      {coords && (
        <button
          onClick={() => { onFlyTo(coords.lat, coords.lng); onSelectUnit?.(id); }}
          className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0"
        >
          <MapPin className="h-3 w-3" />
        </button>
      )}
      <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest pt-2 pb-0.5">{label}</div>;
}

// ── Plan tab ───────────────────────────────────────────────────────────────

const ENEMY_BASE_CATS: { value: EnemyBaseCategory; label: string }[] = [
  { value: "airfield", label: "Flygbas" }, { value: "sam_site", label: "Luftvärnsposition" },
  { value: "command", label: "Ledningscentral" }, { value: "logistics", label: "Logistikpunkt" },
  { value: "radar", label: "Radarstation" },
];
const ENEMY_ENTITY_CATS: { value: EnemyEntityCategory; label: string }[] = [
  { value: "fighter", label: "Jaktflyg" }, { value: "transport", label: "Transportflyg" },
  { value: "helicopter", label: "Helikopter" }, { value: "apc", label: "Bepansrat fordon" },
  { value: "artillery", label: "Artilleri" }, { value: "sam_launcher", label: "Luftvärnsrobot" },
  { value: "ship", label: "Fartyg" },
];
const THREATS: { value: ThreatLevel; label: string }[] = [
  { value: "high", label: "Hög" }, { value: "medium", label: "Medel" },
  { value: "low", label: "Låg" }, { value: "unknown", label: "Okänd" },
];
const STATUSES: { value: OperationalStatus; label: string }[] = [
  { value: "active", label: "Aktiv" }, { value: "suspected", label: "Misstänkt" },
  { value: "destroyed", label: "Neutraliserad" }, { value: "unknown", label: "Okänd" },
];

function AiRecsPanel({ recs }: { recs: AiRecommendation[] }) {
  const [implemented, setImplemented] = useState<Set<string>>(new Set());
  const PRIO_COLOR: Record<AiRecommendation["priority"], string> = {
    high: "#f87171", medium: "#facc15", low: "#4ade80",
  };
  const PRIO_LABEL: Record<AiRecommendation["priority"], string> = {
    high: "HÖG", medium: "MEDEL", low: "LÅG",
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">AI-rekommendationer</span>
      </div>
      <div className="space-y-2">
        {recs.map((rec) => {
          const done = implemented.has(rec.id);
          return (
            <div
              key={rec.id}
              className="rounded border p-2 space-y-1 transition-all"
              style={{
                borderColor: done ? "rgba(74,222,128,0.3)" : "rgba(215,171,58,0.25)",
                background: done ? "rgba(74,222,128,0.05)" : "rgba(215,171,58,0.04)",
              }}
            >
              <div className="flex items-start gap-1.5">
                <span
                  className="text-[8px] font-mono font-bold px-1 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ background: `${PRIO_COLOR[rec.priority]}22`, color: PRIO_COLOR[rec.priority], border: `1px solid ${PRIO_COLOR[rec.priority]}44` }}
                >
                  {PRIO_LABEL[rec.priority]}
                </span>
                <span className={`text-[10px] font-mono font-bold flex-1 ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {rec.title}
                </span>
              </div>
              <p className={`text-[9px] leading-relaxed ${done ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                {rec.description}
              </p>
              {!done && (
                <button
                  onClick={() => setImplemented((prev) => new Set([...prev, rec.id]))}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold transition-colors"
                  style={{ background: "rgba(215,171,58,0.12)", border: "1px solid rgba(215,171,58,0.35)", color: "#D7AB3A" }}
                >
                  <Check className="h-2.5 w-2.5" /> Implementera
                </button>
              )}
              {done && (
                <div className="flex items-center gap-1 text-[9px] font-mono text-green-400">
                  <Check className="h-2.5 w-2.5" /> Implementerad
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanTab({ state, dispatch, onStartPlacement, onFlyTo, onSelectUnit, delays, onSetDelay, description, aiRecommendations }: {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onStartPlacement: (p: PlacingPayload) => void;
  onFlyTo: (lat: number, lng: number) => void;
  onSelectUnit?: (id: string) => void;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, d: DelaySpec | null) => void;
  description?: string;
  aiRecommendations?: AiRecommendation[];
}) {
  const friendlyUnits = state.deployedUnits.filter((u) => u.affiliation === "friend");
  const hasAnything =
    state.friendlyMarkers.length > 0 || friendlyUnits.length > 0 ||
    state.roadBases.length > 0 || state.enemyBases.length > 0 || state.enemyEntities.length > 0;

  return (
    <div className="p-3 space-y-1.5">
      {description && (
        <div className="flex gap-2 p-2 rounded border border-blue-500/25 bg-blue-500/5 mb-2">
          <Info className="h-3 w-3 text-blue-400/70 shrink-0 mt-0.5" />
          <p className="text-[9px] font-mono text-blue-300/90 leading-relaxed">{description}</p>
        </div>
      )}

      {!hasAnything && !description && (
        <div className="text-center py-8 text-[10px] font-mono text-muted-foreground">
          Inga objekt tillagda i planen ännu.<br />Använd fliken Placera för att lägga till enheter.
        </div>
      )}

      {state.friendlyMarkers.length > 0 && (
        <>
          <SectionHeader label="Vänliga baser" />
          {state.friendlyMarkers.map((m) => (
            <PlanItemRow key={m.id} id={m.id} label={m.name}
              sub={ENEMY_BASE_CATS.find(() => false)?.label ?? m.category}
              color="#93c5fd"
              coords={m.coords}
              delays={delays} onSetDelay={onSetDelay} onFlyTo={onFlyTo}
              onDelete={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_MARKER", id: m.id })}
              isNew
            />
          ))}
        </>
      )}

      {friendlyUnits.length > 0 && (
        <>
          <SectionHeader label="Placerade enheter" />
          {friendlyUnits.map((u) => (
            <PlanItemRow key={u.id} id={u.id} label={u.name}
              sub={`${u.type} · ${u.currentBase ?? u.lastBase ?? "—"}`}
              color="#93c5fd"
              coords={u.position}
              delays={delays} onSetDelay={onSetDelay} onFlyTo={onFlyTo} onSelectUnit={onSelectUnit}
              onDelete={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_UNIT", unitId: u.id })}
              isNew
            />
          ))}
        </>
      )}

      {state.roadBases.length > 0 && (
        <>
          <SectionHeader label="Vägbaser" />
          {state.roadBases.map((rb) => (
            <PlanItemRow key={rb.id} id={rb.id} label={rb.name}
              sub={`${rb.status} · ${rb.echelon} · ${rb.rangeRadius} km`}
              color="#4ade80"
              coords={rb.coords}
              delays={delays} onSetDelay={onSetDelay} onFlyTo={onFlyTo}
              onDelete={() => dispatch({ type: "PLAN_DELETE_ROAD_BASE", id: rb.id })}
              isNew
            />
          ))}
        </>
      )}

      {state.enemyBases.length > 0 && (
        <>
          <SectionHeader label="Fiendebaser" />
          {state.enemyBases.map((b) => (
            <PlanItemRow key={b.id} id={b.id} label={b.name}
              sub={ENEMY_BASE_CATS.find((c) => c.value === b.category)?.label}
              color="#f87171"
              coords={b.coords}
              delays={delays} onSetDelay={onSetDelay} onFlyTo={onFlyTo}
              onDelete={() => dispatch({ type: "PLAN_DELETE_ENEMY_BASE", id: b.id })}
              isNew
            />
          ))}
        </>
      )}

      {state.enemyEntities.length > 0 && (
        <>
          <SectionHeader label="Fiendeenheter" />
          {state.enemyEntities.map((e) => (
            <PlanItemRow key={e.id} id={e.id} label={e.name}
              sub={ENEMY_ENTITY_CATS.find((c) => c.value === e.category)?.label}
              color="#f87171"
              coords={(e as any).coords ?? null}
              delays={delays} onSetDelay={onSetDelay} onFlyTo={onFlyTo}
              onDelete={() => dispatch({ type: "PLAN_DELETE_ENEMY_ENTITY", id: e.id })}
              isNew
            />
          ))}
        </>
      )}

      {aiRecommendations && aiRecommendations.length > 0 && (
        <AiRecsPanel recs={aiRecommendations} />
      )}
    </div>
  );
}

// ── Enemy place content (used inside PlaceTab when side==="enemy") ─────────

function EnemyPlaceContent({ state, dispatch, onStartPlacement, onFlyTo, delays, onSetDelay }: {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onStartPlacement: (p: PlacingPayload) => void;
  onFlyTo: (lat: number, lng: number) => void;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, d: DelaySpec | null) => void;
}) {
  const [selectedEnemyBaseId, setSelectedEnemyBaseId] = useState<string | null>(state.enemyBases[0]?.id ?? null);
  const [addingEnemyBase, setAddingEnemyBase] = useState(false);
  const [addingEnemyEntity, setAddingEnemyEntity] = useState(false);

  const [ebName, setEbName] = useState("");
  const [ebCat, setEbCat] = useState<EnemyBaseCategory>("airfield");
  const [ebThreat, setEbThreat] = useState<ThreatLevel>("medium");
  const [ebStatus, setEbStatus] = useState<OperationalStatus>("active");
  const [ebNotes, setEbNotes] = useState("");

  const [eeName, setEeName] = useState("");
  const [eeCat, setEeCat] = useState<EnemyEntityCategory>("fighter");
  const [eeThreat, setEeThreat] = useState<ThreatLevel>("medium");
  const [eeStatus, setEeStatus] = useState<OperationalStatus>("active");
  const [eeCount, setEeCount] = useState(1);
  const [eeNotes, setEeNotes] = useState("");

  const selectedEnemyBase = state.enemyBases.find((b) => b.id === selectedEnemyBaseId) ?? null;
  const entitiesAtBase = state.enemyEntities.filter((e) => (e as any).baseId === selectedEnemyBaseId);

  function placeEnemyBase() {
    if (!ebName.trim()) return;
    onStartPlacement({ kind: "enemy_base", data: { name: ebName, category: ebCat, threat: ebThreat, status: ebStatus, notes: ebNotes } });
    setAddingEnemyBase(false); setEbName(""); setEbCat("airfield"); setEbThreat("medium"); setEbStatus("active"); setEbNotes("");
  }

  function placeEnemyEntity() {
    if (!eeName.trim()) return;
    onStartPlacement({ kind: "enemy_entity", data: { name: eeName, category: eeCat, threat: eeThreat, status: eeStatus, count: String(eeCount), notes: eeNotes } });
    setAddingEnemyEntity(false); setEeName(""); setEeCat("fighter"); setEeThreat("medium"); setEeStatus("active"); setEeCount(1); setEeNotes("");
  }

  const THREAT_COLOR: Record<string, string> = { high: "#f87171", medium: "#facc15", low: "#4ade80", unknown: "#94a3b8" };

  return (
    <div className="space-y-3">
      {/* Enemy base selector */}
      {state.enemyBases.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Välj fiendebas</div>
          <div className="flex flex-wrap gap-1.5">
            {state.enemyBases.map((b) => {
              const isSelected = selectedEnemyBaseId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedEnemyBaseId(b.id)}
                  className="flex flex-col items-start px-2.5 py-1.5 rounded border transition-all text-left"
                  style={{
                    borderColor: isSelected ? "#f87171" : "hsl(var(--border))",
                    background: isSelected ? "rgba(239,68,68,0.10)" : "rgba(100,116,139,0.05)",
                  }}
                >
                  <span className="text-[11px] font-mono font-bold truncate max-w-[80px]" style={{ color: isSelected ? "#f87171" : "hsl(var(--foreground))" }}>{b.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: THREAT_COLOR[b.threatLevel] ?? "#94a3b8" }}>{b.threatLevel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected enemy base detail */}
      {selectedEnemyBase && (
        <div className="border border-red-500/30 rounded bg-red-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-red-500/20">
            <div className="flex-1">
              <span className="text-xs font-mono font-bold text-red-300">{selectedEnemyBase.name}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">{ENEMY_BASE_CATS.find((c) => c.value === selectedEnemyBase.category)?.label}</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: THREAT_COLOR[selectedEnemyBase.threatLevel] }}>{selectedEnemyBase.threatLevel}</span>
            {selectedEnemyBase.coords && (
              <button onClick={() => onFlyTo(selectedEnemyBase.coords!.lat, selectedEnemyBase.coords!.lng)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                <MapPin className="h-3 w-3" />
              </button>
            )}
            <button onClick={() => dispatch({ type: "PLAN_DELETE_ENEMY_BASE", id: selectedEnemyBase.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {entitiesAtBase.length > 0 && (
            <div className="p-2 space-y-1">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Kopplade enheter</div>
              {entitiesAtBase.map((e) => (
                <div key={e.id} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: THREAT_COLOR[e.threatLevel] ?? "#94a3b8" }} />
                  <span className="flex-1 truncate text-foreground/80">{e.name}</span>
                  <DelaySelect id={e.id} delays={delays} onSetDelay={onSetDelay} />
                  <button onClick={() => dispatch({ type: "PLAN_DELETE_ENEMY_ENTITY", id: e.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add enemy base */}
      {addingEnemyBase ? (
        <div className="border border-red-500/30 rounded bg-red-500/5 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Ny fiendebas</span>
            <button onClick={() => setAddingEnemyBase(false)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
          <input autoFocus placeholder="Namn / beteckning" value={ebName} onChange={(e) => setEbName(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
          <select value={ebCat} onChange={(e) => setEbCat(e.target.value as EnemyBaseCategory)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
            {ENEMY_BASE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={ebThreat} onChange={(e) => setEbThreat(e.target.value as ThreatLevel)} className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {THREATS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={ebStatus} onChange={(e) => setEbStatus(e.target.value as OperationalStatus)} className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <textarea placeholder="Anteckningar..." value={ebNotes} rows={2} onChange={(e) => setEbNotes(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none" />
          <div className="flex gap-2">
            <button onClick={placeEnemyBase} disabled={!ebName.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-mono font-bold disabled:opacity-40 rounded transition-colors">
              <MapPin className="h-3 w-3" /> Välj position
            </button>
            <button onClick={() => setAddingEnemyBase(false)} className="px-3 py-1.5 border border-border rounded text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAddingEnemyBase(true); setAddingEnemyEntity(false); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded border border-red-500/30 text-red-400 text-[11px] font-mono hover:bg-red-500/5 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Ny fiendebas
        </button>
      )}

      {/* Add enemy entity */}
      {addingEnemyEntity ? (
        <div className="border border-red-500/30 rounded bg-red-500/5 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Ny fiendeenhet</span>
            <button onClick={() => setAddingEnemyEntity(false)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
          <input autoFocus placeholder="Namn / beteckning" value={eeName} onChange={(e) => setEeName(e.target.value)}
            className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
          <select value={eeCat} onChange={(e) => setEeCat(e.target.value as EnemyEntityCategory)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
            {ENEMY_ENTITY_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={eeThreat} onChange={(e) => setEeThreat(e.target.value as ThreatLevel)} className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {THREATS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={eeStatus} onChange={(e) => setEeStatus(e.target.value as OperationalStatus)} className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">Antal</span>
            <input type="number" min={1} max={99} value={eeCount} onChange={(e) => setEeCount(Number(e.target.value))}
              className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right" />
          </div>
          <div className="flex gap-2">
            <button onClick={placeEnemyEntity} disabled={!eeName.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-mono font-bold disabled:opacity-40 rounded transition-colors">
              <MapPin className="h-3 w-3" /> Välj position
            </button>
            <button onClick={() => setAddingEnemyEntity(false)} className="px-3 py-1.5 border border-border rounded text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAddingEnemyEntity(true); setAddingEnemyBase(false); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded border border-red-500/30 text-red-400 text-[11px] font-mono hover:bg-red-500/5 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Ny fiendeenhet
        </button>
      )}
    </div>
  );
}

// ── Placera tab ────────────────────────────────────────────────────────────

const FRIENDLY_BASE_CATS: { value: FriendlyMarkerCategory; label: string }[] = [
  { value: "airbase", label: "Flygbas" }, { value: "logistics", label: "Logistikpunkt" },
  { value: "command", label: "Ledningscentral" }, { value: "army", label: "Arméenhet" },
  { value: "navy", label: "Marinenhet" },
];
const UNIT_CATS: { value: UnitCategory; label: string }[] = [
  { value: "drone", label: "Drönare" }, { value: "aircraft", label: "Flygplan" },
  { value: "radar", label: "Radar" }, { value: "air_defense", label: "Luftvärn" },
  { value: "ground_vehicle", label: "Markfordon" },
];
const AIRCRAFT_TYPES: AircraftType[] = ["GripenE", "GripenF_EA", "GlobalEye", "VLO_UCAV", "LOTUS"];
const DRONE_TYPES: DroneType[] = ["ISR_DRONE", "STRIKE_DRONE"];
const RADAR_TYPES: GroundRadarType[] = ["SEARCH_RADAR", "TRACKING_RADAR"];
const AIR_DEFENSE_TYPES: AirDefenseType[] = ["SAM_SHORT", "SAM_MEDIUM", "SAM_LONG"];
const GROUND_VEHICLE_TYPES: GroundVehicleType[] = ["LOGISTICS_TRUCK", "ARMORED_TRANSPORT", "FUEL_BOWSER"];
const ROAD_BASE_STATUSES: { value: RoadBaseStatus; label: string }[] = [
  { value: "Beredskap", label: "Beredskap" }, { value: "Operativ", label: "Operativ" }, { value: "Underhåll", label: "Underhåll" },
];
const ROAD_BASE_ECHELONS: { value: RoadBaseEchelon; label: string }[] = [
  { value: "Group", label: "Grupp" }, { value: "Platoon", label: "Pluton" }, { value: "Battalion", label: "Bataljon" },
];

function subtypeOptions(cat: UnitCategory): string[] {
  switch (cat) {
    case "aircraft": return AIRCRAFT_TYPES;
    case "drone": return DRONE_TYPES;
    case "radar": return RADAR_TYPES;
    case "air_defense": return AIR_DEFENSE_TYPES;
    case "ground_vehicle": return GROUND_VEHICLE_TYPES;
  }
}

function PlaceTab({ state, dispatch, onStartPlacement, onFlyTo, delays, onSetDelay }: {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onStartPlacement: (p: PlacingPayload) => void;
  onFlyTo: (lat: number, lng: number) => void;
  delays: Record<string, DelaySpec | null>;
  onSetDelay: (id: string, d: DelaySpec | null) => void;
}) {
  const [side, setSide] = useState<"friendly" | "enemy">("friendly");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(state.bases[0]?.id ?? null);
  const [addingBase, setAddingBase] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  // New base form
  const [baseName, setBaseName] = useState("");
  const [baseCat, setBaseCat] = useState<FriendlyMarkerCategory>("airbase");
  const [baseNotes, setBaseNotes] = useState("");
  const [baseEstimates, setBaseEstimates] = useState("");

  // New unit form
  const [unitCat, setUnitCat] = useState<UnitCategory | "vag_bas">("drone");
  const [unitName, setUnitName] = useState("");
  const [unitSubtype, setUnitSubtype] = useState<string>(DRONE_TYPES[0]);
  const [unitBaseId, setUnitBaseId] = useState<BaseType>("MOB");
  const [unitPayload, setUnitPayload] = useState("");
  const [vagStatus, setVagStatus] = useState<RoadBaseStatus>("Operativ");
  const [vagEchelon, setVagEchelon] = useState<RoadBaseEchelon>("Platoon");
  const [vagRange, setVagRange] = useState(15);

  // Per-base local resource state (fuel/bays/ammo)
  const [localFuel, setLocalFuel] = useState<Record<string, number>>({});
  const [localBays, setLocalBays] = useState<Record<string, number>>({});

  const selectedBase = state.bases.find((b) => b.id === selectedBaseId) ?? null;
  const aircraft = selectedBase ? getAircraft(selectedBase) : [];
  const otherBases = state.bases.filter((b) => b.id !== selectedBaseId);
  const baseFuel = localFuel[selectedBaseId ?? ""] ?? selectedBase?.fuel ?? 100;
  const baseBays = localBays[selectedBaseId ?? ""] ?? selectedBase?.maintenanceBays.total ?? 4;

  function commitBaseResources(bid: string, fuel: number, bays: number) {
    dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: bid, fuel, ammo: selectedBase?.ammunition ?? [], maintenanceBayTotal: bays });
  }

  function placeBase() {
    if (!baseName.trim()) return;
    onStartPlacement({ kind: "friendly_base", data: { name: baseName, category: baseCat, notes: baseNotes, estimates: baseEstimates } });
    setAddingBase(false); setBaseName(""); setBaseCat("airbase"); setBaseNotes(""); setBaseEstimates("");
  }

  function placeUnit() {
    if (!unitName.trim()) return;
    if (unitCat === "vag_bas") {
      onStartPlacement({ kind: "road_base", data: { name: unitName, status: vagStatus, echelon: vagEchelon, parentBaseId: unitBaseId, rangeRadius: String(vagRange) } });
    } else {
      onStartPlacement({ kind: "friendly_unit", data: { name: unitName, category: unitCat, subtype: unitSubtype, baseId: unitBaseId, payload: unitCat === "drone" ? unitPayload : "" } });
    }
    setAddingUnit(false); setUnitName(""); setUnitCat("drone"); setUnitSubtype(DRONE_TYPES[0]); setUnitBaseId("MOB"); setUnitPayload("");
    setVagStatus("Operativ"); setVagEchelon("Platoon"); setVagRange(15);
  }

  function handleUnitCatChange(v: UnitCategory | "vag_bas") {
    setUnitCat(v);
    if (v !== "vag_bas") { setUnitSubtype(subtypeOptions(v as UnitCategory)[0]); if (v !== "drone") setUnitPayload(""); }
  }

  const baseCoords = selectedBaseId ? BASE_COORDS[selectedBaseId] : null;

  return (
    <div className="p-3 space-y-3">
      {/* Friendly / Enemy toggle */}
      <div className="flex rounded overflow-hidden border border-border">
        <button
          onClick={() => setSide("friendly")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
            side === "friendly" ? "bg-blue-600/20 text-blue-400 border-r border-blue-500/30" : "text-muted-foreground hover:text-foreground border-r border-border"
          }`}
        >
          <Shield className="h-3 w-3" /> Vänliga
        </button>
        <button
          onClick={() => setSide("enemy")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
            side === "enemy" ? "bg-red-600/20 text-red-400" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Crosshair className="h-3 w-3" /> Fiende
        </button>
      </div>

      {side === "enemy" ? (
        <EnemyPlaceContent state={state} dispatch={dispatch} onStartPlacement={onStartPlacement} onFlyTo={onFlyTo} delays={delays} onSetDelay={onSetDelay} />
      ) : (<>

      {/* Base selector */}
      <div>
        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Välj bas</div>
        <div className="flex flex-wrap gap-1.5">
          {state.bases.map((b) => {
            const ac = getAircraft(b);
            const mc = ac.filter((a) => a.status === "ready").length;
            const ratio = mc / (ac.length || 1);
            const readColor = ratio >= 0.7 ? "#4ade80" : ratio >= 0.4 ? "#facc15" : "#f87171";
            const isSelected = selectedBaseId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBaseId(b.id)}
                className="flex flex-col items-start px-2.5 py-1.5 rounded border transition-all text-left"
                style={{
                  borderColor: isSelected ? "#D7AB3A" : "hsl(var(--border))",
                  background: isSelected ? "rgba(215,171,58,0.10)" : "rgba(100,116,139,0.05)",
                }}
              >
                <span className="text-[11px] font-mono font-bold" style={{ color: isSelected ? "#D7AB3A" : "hsl(var(--foreground))" }}>{b.id}</span>
                <span className="text-[9px] font-mono" style={{ color: readColor }}>{mc}/{ac.length} MC</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected base detail */}
      {selectedBase && (
        <div className="border border-border rounded bg-muted/5 overflow-hidden">
          {/* Base header */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
            <div className="flex-1">
              <span className="text-xs font-mono font-bold text-foreground">{selectedBase.id}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">{selectedBase.name}</span>
            </div>
            {baseCoords && (
              <button onClick={() => onFlyTo(baseCoords.lat, baseCoords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0">
                <MapPin className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Resource sliders */}
          <div className="p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Fuel className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className={`text-[10px] font-mono w-8 shrink-0 ${baseFuel >= 60 ? "text-green-400" : baseFuel >= 30 ? "text-yellow-400" : "text-red-400"}`}>{baseFuel}%</span>
              <Slider value={[baseFuel]} min={0} max={100} step={1}
                onValueChange={(v) => setLocalFuel((p) => ({ ...p, [selectedBase.id]: v[0] }))}
                onValueCommit={(v) => commitBaseResources(selectedBase.id, v[0], baseBays)}
                className="flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-mono text-foreground w-8 shrink-0">{baseBays}</span>
              <Slider value={[baseBays]} min={0} max={8} step={1}
                onValueChange={(v) => setLocalBays((p) => ({ ...p, [selectedBase.id]: v[0] }))}
                onValueCommit={(v) => commitBaseResources(selectedBase.id, baseFuel, v[0])}
                className="flex-1" />
            </div>

            {/* Aircraft with reassign */}
            {aircraft.length > 0 && (
              <div className="pt-1 border-t border-border/50 space-y-1">
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Enheter</div>
                {aircraft.map((ac) => {
                  const ac_mc = ac.status === "ready" || ac.status === "allocated";
                  return (
                    <div key={ac.id} className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ac_mc ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="flex-1 truncate text-foreground/80">{ac.tailNumber ?? ac.name}</span>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          dispatch({ type: "PLAN_REASSIGN_UNIT_TO_BASE", unitId: ac.id, fromBaseId: selectedBase.id, toBaseId: e.target.value as BaseType });
                          e.target.value = "";
                        }}
                        className="bg-background border border-border rounded px-1 py-0.5 text-[9px] font-mono text-muted-foreground"
                      >
                        <option value="">Flytta →</option>
                        {otherBases.map((b) => <option key={b.id} value={b.id}>{b.id}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add new base form */}
      <div className="space-y-2">
        {addingBase ? (
          <div className="border border-blue-500/30 rounded bg-blue-500/5 p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">Ny vänlig bas</span>
              <button onClick={() => setAddingBase(false)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
            </div>
            <input autoFocus placeholder="Basnamn" value={baseName} onChange={(e) => setBaseName(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
            <select value={baseCat} onChange={(e) => setBaseCat(e.target.value as FriendlyMarkerCategory)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {FRIENDLY_BASE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input placeholder="Uppskattade resurser (t.ex. ~12 Gripen)" value={baseEstimates} onChange={(e) => setBaseEstimates(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
            <textarea placeholder="Anteckningar..." value={baseNotes} rows={2} onChange={(e) => setBaseNotes(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none" />
            <div className="flex gap-2">
              <button onClick={placeBase} disabled={!baseName.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/15 border border-blue-500/40 rounded text-[11px] font-mono text-blue-300 hover:bg-blue-500/25 disabled:opacity-40 transition-colors">
                <MapPin className="h-3 w-3" /> Placera
              </button>
              <button onClick={() => setAddingBase(false)} className="px-3 py-1.5 border border-border rounded text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">Avbryt</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAddingBase(true); setAddingUnit(false); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-blue-500/30 text-blue-400 text-[11px] font-mono hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Ny vänlig bas
          </button>
        )}

        {/* Add new unit form */}
        {addingUnit ? (
          <div className="border border-blue-500/30 rounded bg-blue-500/5 p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">Placera enhet</span>
              <button onClick={() => setAddingUnit(false)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
            </div>
            <input autoFocus placeholder={unitCat === "vag_bas" ? "Beteckning (t.ex. ROB-E21)" : "Enhetsnamn"} value={unitName} onChange={(e) => setUnitName(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
            <select value={unitCat} onChange={(e) => handleUnitCatChange(e.target.value as UnitCategory | "vag_bas")} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
              {UNIT_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              <option value="vag_bas">Vägbas</option>
            </select>
            {unitCat === "vag_bas" ? (
              <>
                <select value={vagStatus} onChange={(e) => setVagStatus(e.target.value as RoadBaseStatus)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {ROAD_BASE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={vagEchelon} onChange={(e) => setVagEchelon(e.target.value as RoadBaseEchelon)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {ROAD_BASE_ECHELONS.map((ec) => <option key={ec.value} value={ec.value}>{ec.label}</option>)}
                </select>
                <select value={unitBaseId} onChange={(e) => setUnitBaseId(e.target.value as BaseType)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {state.bases.map((b) => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">Räckvidd</span>
                  <input type="number" min={1} max={100} value={vagRange} onChange={(e) => setVagRange(Number(e.target.value))}
                    className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right" />
                  <span className="text-[10px] text-muted-foreground">km</span>
                </div>
              </>
            ) : (
              <>
                <select value={unitSubtype} onChange={(e) => setUnitSubtype(e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {subtypeOptions(unitCat as UnitCategory).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <select value={unitBaseId} onChange={(e) => setUnitBaseId(e.target.value as BaseType)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {state.bases.map((b) => <option key={b.id} value={b.id}>{b.id} · {b.name}</option>)}
                </select>
                {unitCat === "drone" && (
                  <input placeholder="Last / payload (t.ex. EO/IR, SIGINT)" value={unitPayload} onChange={(e) => setUnitPayload(e.target.value)}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground" />
                )}
              </>
            )}
            <div className="flex gap-2">
              <button onClick={placeUnit} disabled={!unitName.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/15 border border-blue-500/40 rounded text-[11px] font-mono text-blue-300 hover:bg-blue-500/25 disabled:opacity-40 transition-colors">
                <MapPin className="h-3 w-3" /> Placera
              </button>
              <button onClick={() => setAddingUnit(false)} className="px-3 py-1.5 border border-border rounded text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">Avbryt</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAddingUnit(true); setAddingBase(false); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-blue-500/30 text-blue-400 text-[11px] font-mono hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Placera vänlig enhet
          </button>
        )}
      </div>

      </>)}
    </div>
  );
}

// ── Root sidebar ───────────────────────────────────────────────────────────

type SidebarTab = "plan" | "place";

export function PlanModeSidebar({ tab, state, dispatch, onStartPlacement, onFinalizePlan, onRename, onFlyTo, onSelectUnit, delays, onSetDelay }: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("place");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(tab.name);

  function commitRename() {
    if (draftName.trim()) onRename(draftName.trim());
    setEditingName(false);
  }

  function handleExport() {
    const text = generatePlanSummary({ ...tab, name: draftName.trim() || tab.name });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${tab.name.replace(/\s+/g, "-")}-sammanfattning.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasAnyPlanData =
    state.enemyBases.length > 0 || state.enemyEntities.length > 0 ||
    state.friendlyMarkers.length > 0 || state.deployedUnits.some((u) => u.affiliation === "friend");

  const planCount = state.friendlyMarkers.length + state.deployedUnits.filter((u) => u.affiliation === "friend").length
    + state.roadBases.length + state.enemyBases.length + state.enemyEntities.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border shrink-0 space-y-2">
        <div className="flex items-center gap-1.5">
          {editingName ? (
            <input autoFocus value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 bg-background border border-amber-500/50 rounded px-2 py-0.5 text-xs font-mono text-amber-300 outline-none"
            />
          ) : (
            <button onClick={() => { setDraftName(tab.name); setEditingName(true); }} className="flex-1 flex items-center gap-1.5 text-left group">
              <span className="text-xs font-mono font-bold text-amber-400 truncate">{tab.name}</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <button
            title="Simulera plan (ej implementerat)"
            className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-muted-foreground text-[10px] font-mono hover:text-foreground hover:border-green-500/40 transition-colors shrink-0 cursor-not-allowed opacity-60"
          >
            <Play className="h-3 w-3" /> Sim
          </button>
          <button onClick={handleExport} title="Exportera plansammanfattning"
            className="flex items-center gap-1 px-1.5 py-1 rounded border border-border text-muted-foreground text-[10px] font-mono hover:text-foreground hover:border-amber-500/40 transition-colors shrink-0">
            <FileText className="h-3 w-3" /> Export
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded overflow-hidden border border-border">
          <button
            onClick={() => setActiveTab("plan")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
              activeTab === "plan" ? "bg-amber-500/15 text-amber-400 border-r border-amber-500/30" : "text-muted-foreground hover:text-foreground border-r border-border"
            }`}
          >
            <List className="h-3 w-3" />
            Plan
            {planCount > 0 && <span className="text-[9px] font-normal opacity-70">({planCount})</span>}
          </button>
          <button
            onClick={() => setActiveTab("place")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-mono font-bold transition-colors ${
              activeTab === "place" ? "bg-blue-600/20 text-blue-400" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-3 w-3" />
            Placera
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "plan" ? (
          <PlanTab state={state} dispatch={dispatch} onStartPlacement={onStartPlacement} onFlyTo={onFlyTo} onSelectUnit={onSelectUnit} delays={delays} onSetDelay={onSetDelay} description={tab.description} aiRecommendations={tab.aiRecommendations} />
        ) : (
          <PlaceTab state={state} dispatch={dispatch} onStartPlacement={onStartPlacement} onFlyTo={onFlyTo} delays={delays} onSetDelay={onSetDelay} />
        )}
      </div>

      {/* Readiness summary */}
      <div className="shrink-0 px-4 pt-3 pb-0 border-t border-border">
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: "Fiender", value: state.enemyBases.length + state.enemyEntities.length, warn: state.enemyBases.some((b) => b.threatLevel === "high"), color: state.enemyBases.some((b) => b.threatLevel === "high") ? "#f87171" : "#94a3b8" },
            { label: "Egna",    value: state.deployedUnits.filter((u) => u.affiliation === "friend").length + state.friendlyMarkers.length, warn: false, color: "#60a5fa" },
            { label: "Vägbaser", value: state.roadBases.length, warn: state.roadBases.length === 0 && state.enemyBases.length >= 2, color: state.roadBases.length > 0 ? "#4ade80" : "#475569" },
          ].map(({ label, value, warn, color }) => (
            <div key={label} className="rounded p-1.5 text-center" style={{ background: warn ? "rgba(239,68,68,0.08)" : "rgba(100,116,139,0.08)", border: `1px solid ${warn ? "rgba(239,68,68,0.25)" : "rgba(100,116,139,0.18)"}` }}>
              <div className="text-[14px] font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-[8px] font-mono uppercase tracking-widest mt-0.5" style={{ color: warn ? "#f87171" : "#64748b" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Finalize */}
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
