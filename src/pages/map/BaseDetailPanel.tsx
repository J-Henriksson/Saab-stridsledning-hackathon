import { Base } from "@/types/game";
import { fuelColor, getReadiness } from "./helpers";
import { getAircraft } from "@/core/units/helpers";
import { isAirDefense, isRadar } from "@/types/units";
import type { Unit } from "@/types/units";
import { StatBox } from "./StatBox";
import {
  Plane,
  Fuel,
  Package,
  Users,
  Wrench,
  Shield,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Radio,
  Boxes,
  Send,
} from "lucide-react";

export function BaseDetailPanel({
  base,
  deployedUnits,
  onSelectAircraft,
  onSelectUnit,
  aorRadiusKm,
  onSetAor,
}: {
  base: Base;
  /** Full deployedUnits array from GameState — used to compute parent-base-linked
   *  inventory decrements (aircraft / drones deployed from this base). */
  deployedUnits?: Unit[];
  onSelectAircraft: (id: string) => void;
  onSelectUnit?: (id: string) => void;
  aorRadiusKm: number;
  onSetAor: (km: number) => void;
}) {
  const aircraftList = getAircraft(base);
  const groundUnits = base.units.filter((u) => isAirDefense(u) || isRadar(u));
  const mc = aircraftList.filter((a) => a.status === "ready");
  const nmc = aircraftList.filter((a) => a.status === "unavailable");
  const maintenance = aircraftList.filter((a) => a.status === "under_maintenance");
  const onMission = aircraftList.filter((a) => a.status === "on_mission");
  const readiness = getReadiness(base);
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.total, 0);
  const availPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);

  // ── Parent-base inventory rollup ────────────────────────────────────────
  const staticAd = base.units.filter((u) => isAirDefense(u) && (u as any).isStatic).length;
  const deployedFromHere = (deployedUnits ?? []).filter((u) => u.parentBaseId === base.id);
  const aircraftOnBase = aircraftList.length;
  const aircraftDeployed = deployedFromHere.filter((u) => u.category === "aircraft").length;
  const dronesOnBase = base.units.filter((u) => u.category === "drone").length;
  const dronesDeployed = deployedFromHere.filter((u) => u.category === "drone").length;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Beredskap */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${readiness.cls}`}>
        <Shield className="h-4 w-4" />
        BEREDSKAP: {readiness.label}
      </div>

      {/* Parent-base inventory — decrements automatically as units deploy */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Boxes className="h-3.5 w-3.5 text-foreground" />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-foreground">
            INVENTARIE
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-mono">
          <span className="text-muted-foreground">Flygplan vid bas</span>
          <span className="text-right text-foreground">{aircraftOnBase}</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Send className="h-2.5 w-2.5" /> Flyg deployerade
          </span>
          <span className="text-right text-foreground">{aircraftDeployed}</span>
          <span className="text-muted-foreground">Drönare vid bas</span>
          <span className="text-right text-foreground">{dronesOnBase}</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Send className="h-2.5 w-2.5" /> Drönare deployerade
          </span>
          <span className="text-right text-foreground">{dronesDeployed}</span>
          <span className="text-muted-foreground">Statiska Lv (SAM)</span>
          <span className="text-right text-foreground">{staticAd}</span>
        </div>
      </div>

      {/* AOR ring control */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
            <Radio className="h-3 w-3" /> ANSVARSOMRÅDE (AOR)
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: "#D7AB3A" }}>
            {aorRadiusKm} km
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          step={5}
          value={aorRadiusKm}
          onChange={(e) => onSetAor(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "#D7AB3A" }}
        />
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
          <span>10 km</span>
          <span>200 km</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox icon={<Plane className="h-3.5 w-3.5" />} label="Mission Capable" value={mc.length} total={aircraftList.length} color="green" />
        <StatBox icon={<Plane className="h-3.5 w-3.5" />} label="På uppdrag" value={onMission.length} total={aircraftList.length} color="blue" />
        <StatBox icon={<Wrench className="h-3.5 w-3.5" />} label="I underhåll" value={maintenance.length + nmc.length} total={aircraftList.length} color="yellow" />
        <StatBox icon={<Users className="h-3.5 w-3.5" />} label="Personal" value={availPersonnel} total={totalPersonnel} color="purple" />
      </div>

      {/* Fuel */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
            <Fuel className="h-3 w-3" /> BRÄNSLE
          </span>
          <span className="text-[10px] font-mono" style={{ color: fuelColor(base.fuel) }}>
            {base.fuel.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${base.fuel}%`, backgroundColor: fuelColor(base.fuel) }}
          />
        </div>
      </div>

      {/* Ammunition */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Package className="h-3 w-3" /> AMMUNITION
        </div>
        <div className="space-y-1.5">
          {base.ammunition.map((a) => {
            const pct = (a.quantity / a.max) * 100;
            return (
              <div key={a.type}>
                <div className="flex justify-between text-[9px] font-mono mb-0.5">
                  <span className="text-foreground">{a.type}</span>
                  <span className={pct < 30 ? "text-status-red" : "text-muted-foreground"}>
                    {a.quantity}/{a.max}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: pct < 30 ? "#ef4444" : pct < 60 ? "#eab308" : "#22c55e" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spare parts */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> RESERVDELAR
        </div>
        <div className="space-y-1">
          {base.spareParts.map((p) => {
            const pct = (p.quantity / p.maxQuantity) * 100;
            const critical = pct < 30;
            return (
              <div key={p.id} className="flex items-center gap-2">
                {critical && <AlertTriangle className="h-3 w-3 text-status-red shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className={critical ? "text-status-red" : "text-foreground truncate"}>{p.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-1">{p.quantity}/{p.maxQuantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Maintenance bays */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> UNDERHÅLLSPLATSER
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: base.maintenanceBays.total }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-6 rounded border text-[9px] font-mono flex items-center justify-center ${
                i < base.maintenanceBays.occupied
                  ? "bg-status-yellow/10 border-status-yellow/40 text-status-yellow"
                  : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {i < base.maintenanceBays.occupied ? "UH" : "FRI"}
            </div>
          ))}
        </div>
      </div>

      {/* Personnel */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Users className="h-3 w-3" /> PERSONAL
        </div>
        <div className="space-y-1">
          {base.personnel.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{p.role}</span>
              <span className={`font-mono ${p.available / p.total < 0.5 ? "text-status-red" : "text-muted-foreground"}`}>
                {p.available}/{p.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone overview */}
      {base.zones && base.zones.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> BASYZONER
          </div>
          <div className="space-y-1">
            {base.zones.filter((z) => z.capacity > 0).map((zone) => {
              const load = zone.currentQueue.length / zone.capacity;
              const isFull = zone.currentQueue.length >= zone.capacity;
              const zoneLabels: Record<string, string> = {
                runway: "Rullbana",
                prep_slot: "Klargöringsplats",
                front_maintenance: "Främre UH",
                rear_maintenance: "Bakre UH",
                parking: "Parkering",
                fuel_zone: "Bränsledepå",
                ammo_zone: "Ammunitionsdepå",
                spare_parts_zone: "Reservdelslager",
                logistics_area: "Logistikyta",
              };
              return (
                <div key={zone.id} className="flex items-center justify-between text-[10px]">
                  <span className={isFull ? "text-status-red font-bold" : "text-foreground"}>
                    {zoneLabels[zone.type] ?? zone.type}
                  </span>
                  <span className={`font-mono ${isFull ? "text-status-red" : load > 0.7 ? "text-status-yellow" : "text-muted-foreground"}`}>
                    {zone.currentQueue.length}/{zone.capacity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ground units (SAM, radar, drone) */}
      {groundUnits.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
            <Shield className="h-3 w-3" /> ENHETER ({groundUnits.length} st)
          </div>
          <div className="space-y-1">
            {groundUnits.map((u) => {
              const isAD = isAirDefense(u);
              const missiles = isAD ? u.missileStock : null;
              return (
                <button
                  key={u.id}
                  draggable
                  data-unit-drag-id={u.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", u.id);
                    e.dataTransfer.setData("application/x-sam-unit", u.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onSelectUnit?.(u.id)}
                  className="w-full flex items-center gap-2 p-2 rounded border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-colors text-left"
                  style={{
                    cursor: "grab",
                    boxShadow: isAD ? "inset 0 0 0 1px rgba(220,38,38,0.14)" : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: isAD && u.deployedState === "emplaced" ? "#22c55e" : "#94a3b8",
                    }}
                  />
                  <span className="text-[10px] font-mono font-bold text-foreground flex-1 truncate">{u.name}</span>
                  <span className="text-[9px] text-muted-foreground">{u.type}</span>
                  {missiles && (
                    <span className="text-[9px] font-mono text-red-400">{missiles.loaded}/{missiles.max}</span>
                  )}
                  {isAD && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[8px] font-mono text-red-300">
                      Dra till karta
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Aircraft list */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Plane className="h-3 w-3" /> FLYGPLAN ({aircraftList.length} st)
        </div>
        <div className="space-y-1">
          {aircraftList.map((ac) => (
            <button
              key={ac.id}
              onClick={() => onSelectAircraft(ac.id)}
              className="w-full flex items-center gap-2 p-2 rounded border border-border bg-card hover:border-primary/40 hover:bg-muted/30 transition-colors text-left"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  ac.status === "ready"
                    ? "bg-status-green"
                    : ac.status === "on_mission"
                    ? "bg-status-blue"
                    : ac.status === "under_maintenance"
                    ? "bg-status-yellow"
                    : "bg-status-red"
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-foreground">{ac.tailNumber}</span>
              <span className="text-[9px] text-muted-foreground flex-1">{ac.type}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{ac.flightHours}h</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
