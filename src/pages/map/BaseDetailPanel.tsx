import { Base } from "@/types/game";
import { fuelColor, getReadiness } from "./helpers";
import { StatBox, Row } from "./StatBox";
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
} from "lucide-react";

export function BaseDetailPanel({
  base,
  onSelectAircraft,
}: {
  base: Base;
  onSelectAircraft: (id: string) => void;
}) {
  const mc = base.aircraft.filter((a) => a.status === "ready");
  const nmc = base.aircraft.filter((a) => a.status === "unavailable");
  const maintenance = base.aircraft.filter((a) => a.status === "under_maintenance");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission");
  const readiness = getReadiness(base);
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.total, 0);
  const availPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Beredskap */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${readiness.cls}`}>
        <Shield className="h-4 w-4" />
        BEREDSKAP: {readiness.label}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox icon={<Plane className="h-3.5 w-3.5" />} label="Mission Capable" value={mc.length} total={base.aircraft.length} color="green" />
        <StatBox icon={<Plane className="h-3.5 w-3.5" />} label="På uppdrag" value={onMission.length} total={base.aircraft.length} color="blue" />
        <StatBox icon={<Wrench className="h-3.5 w-3.5" />} label="I underhåll" value={maintenance.length + nmc.length} total={base.aircraft.length} color="yellow" />
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

      {/* Aircraft list */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <Plane className="h-3 w-3" /> FLYGPLAN ({base.aircraft.length} st)
        </div>
        <div className="space-y-1">
          {base.aircraft.map((ac) => (
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
