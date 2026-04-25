import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Fuel, Zap, Wrench, Plus, Trash2, MapPin } from "lucide-react";
import type {
  Base,
  BaseType,
  FriendlyMarker,
  FriendlyMarkerCategory,
  FriendlyEntity,
  RoadBase,
  RoadBaseStatus,
  RoadBaseEchelon,
  GameAction,
  AircraftType,
} from "@/types/game";
import type {
  Unit,
  UnitCategory,
  DroneType,
  GroundRadarType,
  AirDefenseType,
  GroundVehicleType,
} from "@/types/units";
import { Slider } from "@/components/ui/slider";
import { getAircraft } from "@/core/units/helpers";
import { BASE_COORDS } from "../constants";

type PlacingKind = "friendly_base" | "friendly_unit" | "road_base";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  bases: Base[];
  friendlyMarkers: FriendlyMarker[];
  friendlyEntities: FriendlyEntity[];
  roadBases: RoadBase[];
  placedUnits: Unit[];
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}

const BASE_CATEGORIES: { value: FriendlyMarkerCategory; label: string }[] = [
  { value: "airbase", label: "Flygbas" },
  { value: "logistics", label: "Logistikpunkt" },
  { value: "command", label: "Ledningscentral" },
  { value: "army", label: "Arméenhet" },
  { value: "navy", label: "Marinenhet" },
];

const UNIT_CATEGORIES: { value: UnitCategory; label: string }[] = [
  { value: "drone", label: "Drönare" },
  { value: "aircraft", label: "Flygplan" },
  { value: "radar", label: "Radar" },
  { value: "air_defense", label: "Luftvärn" },
  { value: "ground_vehicle", label: "Markfordon" },
];

const AIRCRAFT_TYPES: AircraftType[] = ["GripenE", "GripenF_EA", "GlobalEye", "VLO_UCAV", "LOTUS"];
const DRONE_TYPES: DroneType[] = ["ISR_DRONE", "STRIKE_DRONE"];
const RADAR_TYPES: GroundRadarType[] = ["SEARCH_RADAR", "TRACKING_RADAR"];
const AIR_DEFENSE_TYPES: AirDefenseType[] = ["SAM_SHORT", "SAM_MEDIUM", "SAM_LONG"];
const GROUND_VEHICLE_TYPES: GroundVehicleType[] = ["LOGISTICS_TRUCK", "ARMORED_TRANSPORT", "FUEL_BOWSER"];

const ROAD_BASE_STATUSES: { value: RoadBaseStatus; label: string }[] = [
  { value: "Beredskap", label: "Beredskap" },
  { value: "Operativ", label: "Operativ" },
  { value: "Underhåll", label: "Underhåll" },
];

const ROAD_BASE_ECHELONS: { value: RoadBaseEchelon; label: string }[] = [
  { value: "Group", label: "Grupp" },
  { value: "Platoon", label: "Pluton" },
  { value: "Battalion", label: "Bataljon" },
];

function subtypeOptions(category: UnitCategory): string[] {
  switch (category) {
    case "aircraft":
      return AIRCRAFT_TYPES;
    case "drone":
      return DRONE_TYPES;
    case "radar":
      return RADAR_TYPES;
    case "air_defense":
      return AIR_DEFENSE_TYPES;
    case "ground_vehicle":
      return GROUND_VEHICLE_TYPES;
  }
}

function ExistingBaseRow({ base, allBases, dispatch, onFlyTo }: { base: Base; allBases: Base[]; dispatch: (a: GameAction) => void; onFlyTo?: (lat: number, lng: number) => void }) {
  const [open, setOpen] = useState(false);
  const [fuel, setFuel] = useState(base.fuel);
  const [bays, setBays] = useState(base.maintenanceBays.total);
  const [ammo, setAmmo] = useState(base.ammunition.map((a) => ({ type: a.type, quantity: a.quantity })));

  const aircraft = getAircraft(base);
  const mc = aircraft.filter((a) => a.status === "ready").length;
  const ratio = mc / (aircraft.length || 1);
  const readinessColor = ratio >= 0.7 ? "text-green-400" : ratio >= 0.4 ? "text-yellow-400" : "text-red-400";
  const fuelColor = fuel >= 60 ? "text-green-400" : fuel >= 30 ? "text-yellow-400" : "text-red-400";

  function commit() {
    dispatch({ type: "PLAN_UPDATE_BASE_RESOURCES", baseId: base.id, fuel, ammo, maintenanceBayTotal: bays });
  }

  const otherBases = allBases.filter((b) => b.id !== base.id);
  const coords = BASE_COORDS[base.id];

  return (
    <div className="border border-border rounded bg-muted/5 overflow-hidden">
      <div className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex-1 text-left">
          <span className="text-xs font-mono font-bold text-foreground">{base.id}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{base.name}</span>
        </div>
        <span className={`text-[10px] font-mono ${readinessColor}`}>{mc}/{aircraft.length} MC</span>
        {onFlyTo && coords && (
          <button
            onClick={(e) => { e.stopPropagation(); onFlyTo(coords.lat, coords.lng); }}
            className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0"
            title="Visa på kartan"
          >
            <MapPin className="h-3 w-3" />
          </button>
        )}
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <div className="p-2 space-y-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Fuel className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className={`text-[10px] font-mono ${fuelColor} w-8 shrink-0`}>{fuel}%</span>
            <Slider value={[fuel]} min={0} max={100} step={1} onValueChange={(v) => setFuel(v[0])} onValueCommit={commit} className="flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-mono text-foreground w-8 shrink-0">{bays}</span>
            <Slider value={[bays]} min={0} max={8} step={1} onValueChange={(v) => setBays(v[0])} onValueCommit={commit} className="flex-1" />
          </div>
          {ammo.map((a, i) => (
            <div key={a.type} className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[9px] font-mono text-foreground w-14 truncate">{a.type}</span>
              <input
                type="number"
                min={0}
                value={a.quantity}
                onChange={(e) => {
                  const next = [...ammo];
                  next[i] = { ...next[i], quantity: Number(e.target.value) };
                  setAmmo(next);
                }}
                onBlur={commit}
                className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
              />
            </div>
          ))}

          {/* Unit roster with reassignment */}
          {aircraft.length > 0 && (
            <div className="pt-1 border-t border-border/50 space-y-1">
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Enheter</div>
              {aircraft.map((ac) => (
                <div key={ac.id} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="flex-1 truncate text-foreground/80">{ac.tailNumber ?? ac.name}</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      dispatch({ type: "PLAN_REASSIGN_UNIT_TO_BASE", unitId: ac.id, fromBaseId: base.id, toBaseId: e.target.value as BaseType });
                      e.target.value = "";
                    }}
                    className="bg-background border border-border rounded px-1 py-0.5 text-[9px] font-mono text-muted-foreground"
                  >
                    <option value="">Flytta →</option>
                    {otherBases.map((b) => (
                      <option key={b.id} value={b.id}>{b.id}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddForm({ title, onPlace, onCancel, fields }: { title: string; onPlace: () => void; onCancel: () => void; fields: React.ReactNode }) {
  return (
    <div className="border border-blue-500/30 rounded bg-blue-500/5 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-blue-300 uppercase tracking-wider">{title}</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {fields}
      <div className="flex gap-2">
        <button
          onClick={onPlace}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/15 border border-blue-500/40 rounded text-[11px] font-mono text-blue-300 hover:bg-blue-500/25 transition-colors"
        >
          <MapPin className="h-3 w-3" /> Placera
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 border border-border rounded text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

export function FriendlySection({ bases, friendlyMarkers, friendlyEntities, roadBases, placedUnits, dispatch, onStartPlacement, onFlyTo }: Props) {
  const [addingBase, setAddingBase] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  const [baseName, setBaseName] = useState("");
  const [baseCategory, setBaseCategory] = useState<FriendlyMarkerCategory>("airbase");
  const [baseNotes, setBaseNotes] = useState("");
  const [baseEstimates, setBaseEstimates] = useState("");

  // "vag_bas" is a local sentinel — not a UnitCategory
  const [unitCategory, setUnitCategory] = useState<UnitCategory | "vag_bas">("drone");
  const [unitName, setUnitName] = useState("");
  const [unitSubtype, setUnitSubtype] = useState<string>(DRONE_TYPES[0]);
  const [unitBaseId, setUnitBaseId] = useState<BaseType>("MOB");
  const [unitPayload, setUnitPayload] = useState("");
  // Vägbas-specific fields (shown when unitCategory === "vag_bas")
  const [vagStatus, setVagStatus] = useState<RoadBaseStatus>("Operativ");
  const [vagEchelon, setVagEchelon] = useState<RoadBaseEchelon>("Platoon");
  const [vagRange, setVagRange] = useState(15);

  const placedFriendlyUnits = useMemo(
    () => placedUnits.filter((unit) => unit.affiliation === "friend"),
    [placedUnits]
  );

  function handlePlaceBase() {
    if (!baseName.trim()) return;
    onStartPlacement({ kind: "friendly_base", data: { name: baseName, category: baseCategory, notes: baseNotes, estimates: baseEstimates } });
    setAddingBase(false);
    setBaseName("");
    setBaseCategory("airbase");
    setBaseNotes("");
    setBaseEstimates("");
  }

  function handlePlaceUnit() {
    if (!unitName.trim()) return;
    if (unitCategory === "vag_bas") {
      onStartPlacement({
        kind: "road_base",
        data: {
          name: unitName,
          status: vagStatus,
          echelon: vagEchelon,
          parentBaseId: unitBaseId,
          rangeRadius: String(vagRange),
        },
      });
    } else {
      onStartPlacement({
        kind: "friendly_unit",
        data: {
          name: unitName,
          category: unitCategory,
          subtype: unitSubtype,
          baseId: unitBaseId,
          payload: unitCategory === "drone" ? unitPayload : "",
        },
      });
    }
    setAddingUnit(false);
    setUnitName("");
    setUnitCategory("drone");
    setUnitSubtype(DRONE_TYPES[0]);
    setUnitBaseId("MOB");
    setUnitPayload("");
    setVagStatus("Operativ");
    setVagEchelon("Platoon");
    setVagRange(15);
  }

  function handleUnitCategoryChange(value: UnitCategory | "vag_bas") {
    setUnitCategory(value);
    if (value !== "vag_bas") {
      setUnitSubtype(subtypeOptions(value as UnitCategory)[0]);
      if (value !== "drone") setUnitPayload("");
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
        Befintliga baser
      </div>
      {bases.map((base) => (
        <ExistingBaseRow key={base.id} base={base} allBases={bases} dispatch={dispatch} onFlyTo={onFlyTo} />
      ))}

      {friendlyMarkers.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Planlagda baser
          </div>
          {friendlyMarkers.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-blue-300">{m.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{BASE_CATEGORIES.find((c) => c.value === m.category)?.label}</span>
                {m.estimates && <div className="text-[10px] text-muted-foreground/70">{m.estimates}</div>}
              </div>
              {onFlyTo && (
                <button onClick={() => onFlyTo(m.coords.lat, m.coords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_MARKER", id: m.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      {friendlyEntities.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Planlagda enheter (legacy)
          </div>
          {friendlyEntities.map((e) => (
            <div key={e.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-blue-300">{e.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{e.category}</span>
              </div>
              {onFlyTo && (e as any).coords && (
                <button onClick={() => onFlyTo((e as any).coords.lat, (e as any).coords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_ENTITY", id: e.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      {placedFriendlyUnits.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Placerade enheter
          </div>
          {placedFriendlyUnits.map((unit) => (
            <div key={unit.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-blue-300">{unit.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{UNIT_CATEGORIES.find((c) => c.value === unit.category)?.label}</span>
                <div className="text-[10px] text-muted-foreground/70">
                  {unit.type} · Hemabas {unit.currentBase ?? unit.lastBase ?? "—"}
                </div>
                {unit.category === "drone" && unit.payload && (
                  <div className="text-[10px] text-muted-foreground/70">
                    Last: {unit.payload}
                  </div>
                )}
              </div>
              {onFlyTo && (
                <button onClick={() => onFlyTo(unit.position.lat, unit.position.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_UNIT", unitId: unit.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      {roadBases.length > 0 && (
        <>
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-3 mb-1">
            Vägbaser
          </div>
          {roadBases.map((rb) => (
            <div key={rb.id} className="flex items-center gap-2 p-2 border border-border rounded bg-muted/10">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold" style={{ color: "#2D5A27" }}>{rb.name}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{rb.status}</span>
                <span className="text-[10px] text-muted-foreground ml-1">· {rb.echelon} · {rb.rangeRadius} km</span>
              </div>
              {onFlyTo && (
                <button onClick={() => onFlyTo(rb.coords.lat, rb.coords.lng)} className="p-1 text-muted-foreground hover:text-blue-400 transition-colors shrink-0" title="Visa på kartan">
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => dispatch({ type: "PLAN_DELETE_ROAD_BASE", id: rb.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </>
      )}

      <div className="pt-2 space-y-2">
        {addingBase ? (
          <AddForm
            title="Ny vänlig bas"
            onPlace={handlePlaceBase}
            onCancel={() => setAddingBase(false)}
            fields={
              <>
                <input
                  autoFocus
                  placeholder="Basnamn"
                  value={baseName}
                  onChange={(e) => setBaseName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <select value={baseCategory} onChange={(e) => setBaseCategory(e.target.value as FriendlyMarkerCategory)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {BASE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input
                  placeholder="Uppskattade resurser (t.ex. ~12 Gripen)"
                  value={baseEstimates}
                  onChange={(e) => setBaseEstimates(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <textarea
                  placeholder="Anteckningar..."
                  value={baseNotes}
                  rows={2}
                  onChange={(e) => setBaseNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground resize-none"
                />
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingBase(true); setAddingUnit(false); }} className="w-full flex items-center justify-center gap-2 py-2 rounded border border-blue-500/30 text-blue-400 text-[11px] font-mono hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Ny vänlig bas
          </button>
        )}

        {addingUnit ? (
          <AddForm
            title="Ny vänlig enhet"
            onPlace={handlePlaceUnit}
            onCancel={() => setAddingUnit(false)}
            fields={
              <>
                <input
                  autoFocus
                  placeholder={unitCategory === "vag_bas" ? "Beteckning (t.ex. ROB-E21)" : "Enhetsnamn"}
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                {/* Category selector — includes Vägbas */}
                <select
                  value={unitCategory}
                  onChange={(e) => handleUnitCategoryChange(e.target.value as UnitCategory | "vag_bas")}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground"
                >
                  {UNIT_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="vag_bas">Vägbas</option>
                </select>

                {unitCategory === "vag_bas" ? (
                  <>
                    <select value={vagStatus} onChange={(e) => setVagStatus(e.target.value as RoadBaseStatus)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                      {ROAD_BASE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <select value={vagEchelon} onChange={(e) => setVagEchelon(e.target.value as RoadBaseEchelon)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                      {ROAD_BASE_ECHELONS.map((ec) => <option key={ec.value} value={ec.value}>{ec.label}</option>)}
                    </select>
                    <select value={unitBaseId} onChange={(e) => setUnitBaseId(e.target.value as BaseType)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                      {bases.map((base) => <option key={base.id} value={base.id}>{base.id} · {base.name}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-20 shrink-0">Räckvidd</span>
                      <input
                        type="number" min={1} max={100} value={vagRange}
                        onChange={(e) => setVagRange(Number(e.target.value))}
                        className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground text-right"
                      />
                      <span className="text-[10px] text-muted-foreground">km</span>
                    </div>
                  </>
                ) : (
                  <>
                    <select value={unitSubtype} onChange={(e) => setUnitSubtype(e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                      {subtypeOptions(unitCategory as UnitCategory).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <select value={unitBaseId} onChange={(e) => setUnitBaseId(e.target.value as BaseType)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                      {bases.map((base) => <option key={base.id} value={base.id}>{base.id} · {base.name}</option>)}
                    </select>
                    {unitCategory === "drone" && (
                      <input
                        placeholder="Last / payload (t.ex. EO/IR, SIGINT, lätt attacklast)"
                        value={unitPayload}
                        onChange={(e) => setUnitPayload(e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                      />
                    )}
                  </>
                )}
              </>
            }
          />
        ) : (
          <button onClick={() => { setAddingUnit(true); setAddingBase(false); }} className="w-full flex items-center justify-center gap-2 py-2 rounded border border-blue-500/30 text-blue-400 text-[11px] font-mono hover:bg-blue-500/5 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Placera vänlig enhet
          </button>
        )}
      </div>
    </div>
  );
}
