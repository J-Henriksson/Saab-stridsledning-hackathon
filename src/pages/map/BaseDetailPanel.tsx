import type { Base } from "@/types/game";
import { fuelColor, getReadiness } from "./helpers";
import { getAircraft } from "@/core/units/helpers";
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
  Radio,
  Radar,
  CloudDrizzle,
  Link2,
} from "lucide-react";

function getLandingCapability(base: Base) {
  if (!base.weather) return { label: "Unknown", color: "#94A3B8" };
  if (base.weather.condition === "IMC" || base.weather.visibilityKm < 8 || base.weather.windKts > 20) {
    return { label: "Restricted", color: "#DC2626" };
  }
  if (base.weather.condition === "MVMC" || base.weather.visibilityKm < 12) {
    return { label: "Marginal", color: "#D97706" };
  }
  return { label: "Open", color: "#2D5A27" };
}

function getGroundStateLabel(status: string) {
  switch (status) {
    case "on_mission":
    case "returning":
      return "Scrambled";
    case "under_maintenance":
    case "recovering":
      return "Maintenance";
    case "awaiting_launch":
    case "in_preparation":
      return "Apron";
    default:
      return "Hangar";
  }
}

export function BaseDetailPanel({
  base,
  onSelectAircraft,
  aorRadiusKm,
  onSetAor,
  onOpenSyncDashboard,
}: {
  base: Base;
  onSelectAircraft: (id: string) => void;
  aorRadiusKm: number;
  onSetAor: (km: number) => void;
  onOpenSyncDashboard?: () => void;
}) {
  const aircraftList = getAircraft(base);
  const mc = aircraftList.filter((a) => a.status === "ready");
  const maintenance = aircraftList.filter((a) => a.status === "under_maintenance" || a.status === "recovering");
  const onMission = aircraftList.filter((a) => a.status === "on_mission" || a.status === "returning");
  const onGround = aircraftList.filter((a) => !onMission.includes(a));
  const readiness = getReadiness(base);
  const totalPersonnel = base.personnel.reduce((sum, person) => sum + person.total, 0);
  const availPersonnel = base.personnel.reduce((sum, person) => sum + person.available, 0);
  const landingCapability = getLandingCapability(base);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold font-mono ${readiness.cls}`}>
        <Shield className="h-4 w-4" />
        BEREDSKAP: {readiness.label}
      </div>

      <div className="rounded-xl border border-border bg-card/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">Base Sync</div>
            <div className="mt-1 text-sm font-bold font-mono text-foreground">{base.name}</div>
            <div className="mt-1 text-[10px] font-mono text-muted-foreground">
              {base.icaoCode ?? base.id} · {base.operationalStatus ?? "Active"} · Landing {landingCapability.label}
            </div>
          </div>
          {onOpenSyncDashboard && (
            <button
              onClick={onOpenSyncDashboard}
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[10px] font-mono font-bold text-primary transition-colors hover:bg-primary/10"
            >
              OPEN BASE DASHBOARD
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            <div className="text-[8px] tracking-[0.22em] text-muted-foreground">CAPACITY</div>
            <div className="mt-1 font-bold text-foreground">
              HANGAR {onGround.length}/{base.hangarCapacity ?? 0}
            </div>
            <div className="text-muted-foreground">
              RAMP {Math.max(0, aircraftList.length - onGround.length)}/{base.rampCapacity ?? 0}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
            <div className="text-[8px] tracking-[0.22em] text-muted-foreground">DEFENSES</div>
            <div className="mt-1 font-bold text-foreground">{base.defenseUnitIds?.join(", ") || "None"}</div>
            {base.sensorUnitIds && base.sensorUnitIds.length > 0 && (
              <div className="text-muted-foreground">SENSOR {base.sensorUnitIds.join(", ")}</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Radio className="h-3 w-3" /> ANSVARSOMRADE (AOR)
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
          className="h-1.5 w-full cursor-pointer"
          style={{ accentColor: "#D7AB3A" }}
        />
        <div className="mt-0.5 flex justify-between text-[9px] font-mono text-muted-foreground">
          <span>10 km</span>
          <span>200 km</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatBox icon={<Plane className="h-3.5 w-3.5" />} label="Mission Capable" value={mc.length} total={aircraftList.length} color="green" />
        <StatBox icon={<Link2 className="h-3.5 w-3.5" />} label="Scrambled" value={onMission.length} total={aircraftList.length} color="blue" />
        <StatBox icon={<Wrench className="h-3.5 w-3.5" />} label="Maintenance" value={maintenance.length} total={aircraftList.length} color="yellow" />
        <StatBox icon={<Users className="h-3.5 w-3.5" />} label="Personnel" value={availPersonnel} total={totalPersonnel} color="purple" />
      </div>

      {base.weather && (
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <CloudDrizzle className="h-3 w-3" />
            WEATHER
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <Row label="Vind" value={`${base.weather.windDirDeg}° / ${base.weather.windKts} kt`} />
            <Row label="Sikt" value={`${base.weather.visibilityKm} km`} />
            <Row label="Moln" value={base.weather.ceilingFt === 0 ? "CAVOK" : `${base.weather.ceilingFt} ft`} />
            <Row label="Landning" value={landingCapability.label} />
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Fuel className="h-3 w-3" /> BRANSLE
          </span>
          <span className="text-[10px] font-mono" style={{ color: fuelColor(base.fuel) }}>
            {base.fuel.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${base.fuel}%`, backgroundColor: fuelColor(base.fuel) }} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Package className="h-3 w-3" /> AMMUNITION
        </div>
        <div className="space-y-1.5">
          {base.ammunition.map((ammo) => {
            const pct = (ammo.quantity / ammo.max) * 100;
            return (
              <div key={ammo.type}>
                <div className="mb-0.5 flex justify-between text-[9px] font-mono">
                  <span className="text-foreground">{ammo.type}</span>
                  <span className={pct < 30 ? "text-status-red" : "text-muted-foreground"}>
                    {ammo.quantity}/{ammo.max}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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

      <div>
        <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Wrench className="h-3 w-3" /> RESERVDELAR
        </div>
        <div className="space-y-1">
          {base.spareParts.map((part) => {
            const pct = (part.quantity / part.maxQuantity) * 100;
            const critical = pct < 30;
            return (
              <div key={part.id} className="flex items-center gap-2">
                {critical && <AlertTriangle className="h-3 w-3 shrink-0 text-status-red" />}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className={critical ? "font-bold text-status-red" : "truncate text-foreground"}>{part.name}</span>
                    <span className="ml-1 shrink-0 text-muted-foreground">{part.quantity}/{part.maxQuantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Radar className="h-3 w-3" /> MAINTENANCE BAYS
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: base.maintenanceBays.total }).map((_, index) => (
            <div
              key={index}
              className={`flex h-6 flex-1 items-center justify-center rounded border text-[9px] font-mono ${
                index < base.maintenanceBays.occupied
                  ? "border-status-yellow/40 bg-status-yellow/10 text-status-yellow"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {index < base.maintenanceBays.occupied ? "OCC" : "FREE"}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Users className="h-3 w-3" /> PERSONAL
        </div>
        <div className="space-y-1">
          {base.personnel.map((person) => (
            <div key={person.id} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{person.role}</span>
              <span className={`font-mono ${person.available / person.total < 0.5 ? "text-status-red" : "text-muted-foreground"}`}>
                {person.available}/{person.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <MapPin className="h-3 w-3" /> AIRCRAFT ({aircraftList.length} st)
        </div>
        <div className="space-y-1">
          {aircraftList.map((aircraft) => (
            <button
              key={aircraft.id}
              onClick={() => onSelectAircraft(aircraft.id)}
              className="flex w-full items-center gap-2 rounded border border-border bg-card p-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  aircraft.status === "ready"
                    ? "bg-status-green"
                    : aircraft.status === "on_mission" || aircraft.status === "returning"
                    ? "bg-status-blue"
                    : aircraft.status === "under_maintenance"
                    ? "bg-status-yellow"
                    : "bg-status-red"
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-foreground">{aircraft.tailNumber}</span>
              <span className="flex-1 text-[9px] text-muted-foreground">
                {aircraft.type} · {getGroundStateLabel(aircraft.status)}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">{aircraft.hoursToService}h</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
