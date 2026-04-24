import { useState } from "react";
import { ChevronDown, ChevronRight, Fuel, Zap, Wrench, Plus, Trash2, MapPin } from "lucide-react";
import type { Base, BaseType, FriendlyMarker, FriendlyMarkerCategory, FriendlyEntity, FriendlyEntityCategory, GameAction } from "@/types/game";
import { Slider } from "@/components/ui/slider";

// ── Types ─────────────────────────────────────────────────────────────────

type PlacingKind = "friendly_base" | "friendly_entity";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  bases: Base[];
  friendlyMarkers: FriendlyMarker[];
  friendlyEntities: FriendlyEntity[];
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
}

// ── Existing base editor ──────────────────────────────────────────────────

const BASE_CATEGORIES: { value: FriendlyMarkerCategory; label: string }[] = [
  { value: "airbase",   label: "Flygbas" },
  { value: "logistics", label: "Logistikpunkt" },
  { value: "command",   label: "Ledningscentral" },
  { value: "army",      label: "Arméenhet" },
  { value: "navy",      label: "Marinenhet" },
];

const ENTITY_CATEGORIES: { value: FriendlyEntityCategory; label: string }[] = [
  { value: "aircraft",    label: "Luftfart" },
  { value: "infantry",    label: "Infanteri" },
  { value: "armor",       label: "Pansarfordon" },
  { value: "artillery",   label: "Artilleri" },
  { value: "air_defense", label: "Luftvärn" },
  { value: "support",     label: "Stödenhet" },
];

function ExistingBaseRow({ base, dispatch }: { base: Base; dispatch: (a: GameAction) => void }) {
  const [open, setOpen] = useState(false);
  const [fuel, setFuel] = useState(base.fuel);
  const [bays, setBays] = useState(base.maintenanceBays.total);
  const [ammo, setAmmo] = useState(base.ammunition.map((a) => ({ type: a.type, quantity: a.quantity })));

  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const ratio = mc / (base.aircraft.length || 1);
  const readinessColor = ratio >= 0.7 ? "text-green-400" : ratio >= 0.4 ? "text-yellow-400" : "text-red-400";
  const fuelColor = fuel >= 60 ? "text-green-400" : fuel >= 30 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="border border-border rounded mb-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${ratio >= 0.7 ? "bg-green-400" : ratio >= 0.4 ? "bg-yellow-400" : "bg-red-400"}`} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono font-bold text-foreground">{base.id}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{base.name}</span>
        </div>
        <span className={`text-[10px] font-mono ${readinessColor}`}>{mc}/{base.aircraft.length} MC</span>
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Fuel className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Bränsle</span>
              <span className={`ml-auto text-[10px] font-mono font-bold ${fuelColor}`}>{Math.round(fuel)}%</span>
            </div>
            <Slider
              min={0} max={100} step={1}
              value={[fuel]}
              onValueChange={([v]) => setFuel(v)}
              onValueCommit={([v]) => dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, fuel: v })}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Ammunition</span>
            </div>
            <div className="space-y-1.5">
              {ammo.map((a, i) => (
                <div key={a.type} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">{a.type}</span>
                  <input
                    type="number" min={0} max={base.ammunition[i]?.max ?? 99}
                    value={a.quantity}
                    onChange={(e) => { const n = [...ammo]; n[i] = { ...n[i], quantity: +e.target.value }; setAmmo(n); }}
                    onBlur={() => dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, ammo })}
                    className="w-14 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
                  />
                  <span className="text-[10px] text-muted-foreground">/ {base.ammunition[i]?.max ?? "?"}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Underhållsplatser</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" min={base.maintenanceBays.occupied} max={20}
                value={bays}
                onChange={(e) => setBays(+e.target.value)}
                onBlur={() => dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id as BaseType, maintenanceBayTotal: bays })}
                className="w-14 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
              />
              <span className="text-[10px] text-muted-foreground">({base.maintenanceBays.occupied} upptagna)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add form ──────────────────────────────────────────────────────────────

function AddForm({
  title,
  fields,
  onPlace,
  onCancel,
}: {
  title: string;
  fields: React.ReactNode;
  onPlace: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-blue-500/30 rounded bg-blue-500/5 p-3 space-y-2">
      <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">{title}</div>
      {fields}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onPlace}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-mono font-bold transition-colors"
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

// ── Main component ────────────────────────────────────────────────────────

export function FriendlySection({ bases, friendlyMarkers, friendlyEntities, dispatch, onStartPlacement }: Props) {
  const [addingBase, setAddingBase] = useState(false);
  const [addingEntity, setAddingEntity] = useState(false);

  // Add base form state
  const [baseName, setBaseName] = useState("");
  const [baseCategory, setBaseCategory] = useState<FriendlyMarkerCategory>("airbase");
  const [baseNotes, setBaseNotes] = useState("");
  const [baseEstimates, setBaseEstimates] = useState("");

  // Add entity form state
  const [entityName, setEntityName] = useState("");
  const [entityCategory, setEntityCategory] = useState<FriendlyEntityCategory>("infantry");
  const [entityNotes, setEntityNotes] = useState("");

  function handlePlaceBase() {
    if (!baseName.trim()) return;
    onStartPlacement({ kind: "friendly_base", data: { name: baseName, category: baseCategory, notes: baseNotes, estimates: baseEstimates } });
    setAddingBase(false);
    setBaseName(""); setBaseCategory("airbase"); setBaseNotes(""); setBaseEstimates("");
  }

  function handlePlaceEntity() {
    if (!entityName.trim()) return;
    onStartPlacement({ kind: "friendly_entity", data: { name: entityName, category: entityCategory, notes: entityNotes } });
    setAddingEntity(false);
    setEntityName(""); setEntityCategory("infantry"); setEntityNotes("");
  }

  return (
    <div className="p-3 space-y-3">
      {/* Existing game bases */}
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
        Befintliga baser
      </div>
      {bases.map((base) => (
        <ExistingBaseRow key={base.id} base={base} dispatch={dispatch} />
      ))}

      {/* Custom friendly markers */}
      {friendlyMarkers.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Planlagda baser
          </div>
          {friendlyMarkers.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-blue-300">{m.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{BASE_CATEGORIES.find(c => c.value === m.category)?.label}</span>
                {m.estimates && <div className="text-[10px] text-muted-foreground/70">{m.estimates}</div>}
              </div>
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_MARKER", id: m.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Custom friendly entities */}
      {friendlyEntities.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Planlagda enheter
          </div>
          {friendlyEntities.map((e) => (
            <div key={e.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-blue-300">{e.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{ENTITY_CATEGORIES.find(c => c.value === e.category)?.label}</span>
              </div>
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_ENTITY", id: e.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Add buttons */}
      <div className="pt-2 space-y-2">
        {addingBase ? (
          <AddForm
            title="Ny vänlig bas"
            onPlace={handlePlaceBase}
            onCancel={() => setAddingBase(false)}
            fields={
              <>
                <input
                  autoFocus placeholder="Basnamn" value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <select value={baseCategory} onChange={(e) => setBaseCategory(e.target.value as FriendlyMarkerCategory)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {BASE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input placeholder="Uppskattade resurser (t.ex. ~12 Gripen)" value={baseEstimates}
                  onChange={(e) => setBaseEstimates(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <textarea placeholder="Anteckningar..." value={baseNotes} rows={2}
                  onChange={(e) => setBaseNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
                />
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingBase(true); setAddingEntity(false); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-blue-500/40 rounded text-[11px] font-mono text-blue-400 hover:border-blue-500/70 hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Lägg till bas
          </button>
        )}

        {addingEntity ? (
          <AddForm
            title="Ny vänlig enhet"
            onPlace={handlePlaceEntity}
            onCancel={() => setAddingEntity(false)}
            fields={
              <>
                <input
                  autoFocus placeholder="Enhetsbeteckning" value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <select value={entityCategory} onChange={(e) => setEntityCategory(e.target.value as FriendlyEntityCategory)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {ENTITY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <textarea placeholder="Anteckningar..." value={entityNotes} rows={2}
                  onChange={(e) => setEntityNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
                />
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingEntity(true); setAddingBase(false); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-blue-500/40 rounded text-[11px] font-mono text-blue-400 hover:border-blue-500/70 hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Lägg till enhet
          </button>
        )}
      </div>
    </div>
  );
}
