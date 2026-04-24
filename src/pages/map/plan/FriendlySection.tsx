import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Fuel, Zap, Wrench, Plus, Trash2, MapPin } from "lucide-react";
import type { Base, BaseType, FriendlyMarker, FriendlyMarkerCategory, GameAction, AircraftType } from "@/types/game";
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

type PlacingKind = "friendly_base" | "friendly_unit";

interface PlacingPayload {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface Props {
  bases: Base[];
  friendlyMarkers: FriendlyMarker[];
  placedUnits: Unit[];
  dispatch: (action: GameAction) => void;
  onStartPlacement: (payload: PlacingPayload) => void;
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

function ExistingBaseRow({ base, dispatch }: { base: Base; dispatch: (a: GameAction) => void }) {
  const [open, setOpen] = useState(false);
  const [fuel, setFuel] = useState(base.fuel);
  const [bays, setBays] = useState(base.maintenanceBays.total);
  const [ammo, setAmmo] = useState(base.ammunition.map((a) => ({ type: a.type, quantity: a.quantity })));

  const aircraft = getAircraft(base);
  const mc = aircraft.filter((a) => a.status === "ready").length;
  const ratio = mc / (aircraft.length || 1);
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
        <span className={`text-[10px] font-mono ${readinessColor}`}>{mc}/{aircraft.length} MC</span>
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

export function FriendlySection({ bases, friendlyMarkers, placedUnits, dispatch, onStartPlacement }: Props) {
  const [addingBase, setAddingBase] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);

  const [baseName, setBaseName] = useState("");
  const [baseCategory, setBaseCategory] = useState<FriendlyMarkerCategory>("airbase");
  const [baseNotes, setBaseNotes] = useState("");
  const [baseEstimates, setBaseEstimates] = useState("");

  const [unitName, setUnitName] = useState("");
  const [unitCategory, setUnitCategory] = useState<UnitCategory>("drone");
  const [unitSubtype, setUnitSubtype] = useState<string>(DRONE_TYPES[0]);
  const [unitBaseId, setUnitBaseId] = useState<BaseType>("MOB");
  const [unitPayload, setUnitPayload] = useState("");

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
    setAddingUnit(false);
    setUnitName("");
    setUnitCategory("drone");
    setUnitSubtype(DRONE_TYPES[0]);
    setUnitBaseId("MOB");
    setUnitPayload("");
  }

  function handleUnitCategoryChange(value: UnitCategory) {
    setUnitCategory(value);
    setUnitSubtype(subtypeOptions(value)[0]);
    if (value !== "drone") setUnitPayload("");
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
        Befintliga baser
      </div>
      {bases.map((base) => (
        <ExistingBaseRow key={base.id} base={base} dispatch={dispatch} />
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
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_MARKER", id: m.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
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
              <button onClick={() => dispatch({ type: "PLAN_DELETE_FRIENDLY_UNIT", unitId: unit.id })} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
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
                  placeholder="Enhetsnamn"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground"
                />
                <select value={unitCategory} onChange={(e) => handleUnitCategoryChange(e.target.value as UnitCategory)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {UNIT_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={unitSubtype} onChange={(e) => setUnitSubtype(e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
                  {subtypeOptions(unitCategory).map((option) => <option key={option} value={option}>{option}</option>)}
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
