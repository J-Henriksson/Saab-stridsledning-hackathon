import type { AircraftUnit, FuelStatus, WeaponLoadout } from "@/types/units";
import type { Base } from "@/types/game";
import {
  AlertTriangle,
  Clock3,
  Crosshair,
  Gauge,
  Plane,
  Radar,
  Shield,
  Wrench,
} from "lucide-react";

const FUEL_THRESHOLDS: Record<FuelStatus, { color: string; bg: string; label: string }> = {
  Normal: { color: "#2D5A27", bg: "#2D5A2714", label: "NORMAL" },
  Joker: { color: "#D97706", bg: "#D9770614", label: "JOKER" },
  Bingo: { color: "#DC2626", bg: "#DC262614", label: "BINGO" },
  Emergency: { color: "#DC2626", bg: "#DC262622", label: "EMERGENCY" },
};

const MISSION_LABELS: Record<string, string> = {
  QRA: "Quick Reaction Alert",
  CAP: "Combat Air Patrol",
  CAS: "Close Air Support",
  RECON: "Reconnaissance",
  RECCE: "Reconnaissance",
  TRANSPORT: "Transport",
  TRAINING: "Training",
  INTERCEPT: "Intercept",
  COMBAT: "Combat",
  DCA: "Defensive Counter-Air",
};

const DETAILED_LOADOUT_LABELS: Array<{ key: keyof WeaponLoadout; label: string; color: string }> = [
  { key: "irisT", label: "IRIS-T", color: "#DC2626" },
  { key: "meteor", label: "METEOR", color: "#B91C1C" },
  { key: "aim120", label: "AIM-120", color: "#EF4444" },
  { key: "sidewinder", label: "AIM-9", color: "#F97316" },
  { key: "rbs15", label: "RBS-15", color: "#D97706" },
  { key: "gbu39", label: "GBU-39", color: "#6B7280" },
  { key: "brimstone", label: "BRIM", color: "#92400E" },
];

function GaugeBar({
  value,
  max = 100,
  color,
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
  sublabel?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[9px] font-mono font-bold tracking-widest text-gray-500">
          {label}
        </span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {sublabel ?? `${value}`}
        </span>
      </div>
      <div className="overflow-hidden rounded-full bg-gray-200" style={{ height: 6 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function WeaponBadge({ count, label, color }: { count: number | string; label: string; color: string }) {
  return (
    <div
      className="flex min-w-[56px] flex-col items-center justify-center rounded-lg px-2 py-1.5"
      style={{ background: `${color}12`, border: `1px solid ${color}40` }}
    >
      <span className="font-mono text-sm font-bold" style={{ color }}>
        {count}
      </span>
      <span className="text-[8px] font-mono text-gray-500">{label}</span>
    </div>
  );
}

function dataCell(label: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
      <div className="text-[8px] tracking-widest text-gray-400">{label}</div>
      <div className="mt-0.5 text-xs font-bold text-gray-800">{value}</div>
    </div>
  );
}

function getDetailedLoadout(loadout?: WeaponLoadout) {
  if (!loadout) {
    return { entries: [] as Array<{ label: string; count: number; color: string }>, totalStores: 0 };
  }

  const detailedEntries = DETAILED_LOADOUT_LABELS
    .map(({ key, label, color }) => ({ label, color, count: Number(loadout[key] ?? 0) }))
    .filter((entry) => entry.count > 0);

  if (detailedEntries.length > 0) {
    return {
      entries: detailedEntries,
      totalStores: detailedEntries.reduce((sum, entry) => sum + entry.count, 0),
    };
  }

  const aggregateEntries = [
    loadout.aam ? { label: "AAM", count: loadout.aam, color: "#DC2626" } : null,
    loadout.agm ? { label: "AGM", count: loadout.agm, color: "#D97706" } : null,
    loadout.bombs ? { label: "BOMBS", count: loadout.bombs, color: "#6B7280" } : null,
  ].filter(Boolean) as Array<{ label: string; count: number; color: string }>;

  return {
    entries: aggregateEntries,
    totalStores: aggregateEntries.reduce((sum, entry) => sum + entry.count, 0),
  };
}

function getWeaponGaugeMax(aircraft: AircraftUnit, totalStores: number) {
  if (aircraft.type === "GlobalEye" || aircraft.type === "TP84") {
    return Math.max(1, aircraft.weaponLoadout?.pods?.length ?? 1);
  }
  if (aircraft.type === "SK60") {
    return 4;
  }
  return Math.max(8, totalStores);
}

function getLandingCapability(base?: Base) {
  if (!base?.weather) return "UNKNOWN";
  if (base.weather.condition === "IMC" || base.weather.visibilityKm < 8 || base.weather.windKts > 20) return "RESTRICTED";
  if (base.weather.condition === "MVMC" || base.weather.visibilityKm < 12) return "MARGINAL";
  return "OPEN";
}

export function TacticalDashboard({
  aircraft,
  base,
}: {
  aircraft: AircraftUnit;
  base: Base | undefined;
}) {
  const fuelThreshold = aircraft.fuelStatus ?? "Normal";
  const fuelStyle = FUEL_THRESHOLDS[fuelThreshold];
  const missionLabel = aircraft.tacMission ? MISSION_LABELS[aircraft.tacMission] : aircraft.currentMission ? MISSION_LABELS[aircraft.currentMission] : null;
  const operatingBaseName = base?.name ?? aircraft.originBase ?? aircraft.currentBase ?? "UNKNOWN BASE";
  const homeBaseName = base?.name ?? aircraft.homeBaseId ?? operatingBaseName;
  const { entries: loadoutEntries, totalStores } = getDetailedLoadout(aircraft.weaponLoadout);
  const pods = aircraft.weaponLoadout?.pods ?? [];
  const weaponGaugeMax = getWeaponGaugeMax(aircraft, totalStores);
  const weaponGaugeValue = aircraft.type === "GlobalEye" || aircraft.type === "TP84"
    ? pods.length
    : totalStores;
  const landingCapability = getLandingCapability(base);

  return (
    <div className="space-y-4 border-b border-border/60 pb-4">
      <div className="rounded-xl border border-[#2D5A27] bg-[#f0fdf4] px-3 py-3">
        <div className="flex items-start gap-2">
          <Plane className="mt-0.5 h-4 w-4 shrink-0 text-[#2D5A27]" />
          <div className="min-w-0">
            <div className="text-[11px] font-mono font-bold tracking-wide text-[#2D5A27]">
              OPERATING FROM: {operatingBaseName}
            </div>
            <div className="mt-1 text-[10px] font-mono text-gray-600">
              HOR TILL BAS: {homeBaseName}
            </div>
            <div className="mt-1 text-[9px] font-mono text-gray-500">
              {(base?.icaoCode ?? aircraft.homeBaseId ?? "----")} · ETA {aircraft.estimatedLandingTime ?? "TBD"} · LANDING {landingCapability}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        {dataCell("CALLSIGN", aircraft.callsign)}
        {dataCell("TRANSPONDER", aircraft.transponderCode ?? aircraft.squawkCode)}
        {dataCell("WING", aircraft.wing)}
        {dataCell("MISSION", aircraft.tacMission ?? aircraft.currentMission)}
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
        {dataCell("ALTITUDE", aircraft.altitudeFt !== undefined ? `${aircraft.altitudeFt} ft` : undefined)}
        {dataCell("HEADING", aircraft.movement.heading !== undefined ? `${aircraft.movement.heading}°` : undefined)}
        {dataCell("SPEED", aircraft.movement.speed ? `${aircraft.movement.speed} kt` : "0 kt")}
        {dataCell("MACH", aircraft.machSpeed !== undefined ? aircraft.machSpeed.toFixed(2) : undefined)}
        {dataCell("VERT RATE", aircraft.verticalRate !== undefined ? `${aircraft.verticalRate > 0 ? "+" : ""}${aircraft.verticalRate} ft/min` : undefined)}
        {dataCell("WEAPON SAFE", aircraft.weaponStatus ?? "Safe")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-gray-500">
              <Gauge className="h-3 w-3" />
              FUEL
            </div>
            <div
              className="rounded-full px-2 py-0.5 text-[9px] font-mono font-bold"
              style={{ background: fuelStyle.bg, color: fuelStyle.color }}
            >
              {fuelStyle.label}
            </div>
          </div>
          <GaugeBar
            value={aircraft.fuel}
            color={fuelStyle.color}
            label="STATE"
            sublabel={`${aircraft.fuel.toFixed(0)}%`}
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-gray-500">
              <Crosshair className="h-3 w-3" />
              WEAPONS
            </div>
            <div
              className="rounded-full px-2 py-0.5 text-[9px] font-mono font-bold"
              style={{
                background: aircraft.weaponStatus === "Armed" ? "#fef2f2" : "#f3f4f6",
                color: aircraft.weaponStatus === "Armed" ? "#B91C1C" : "#6B7280",
              }}
            >
              {aircraft.weaponStatus ?? "Safe"}
            </div>
          </div>
          <GaugeBar
            value={weaponGaugeValue}
            max={weaponGaugeMax}
            color={aircraft.weaponStatus === "Armed" ? "#B91C1C" : "#6B7280"}
            label="STORES"
            sublabel={aircraft.type === "GlobalEye" || aircraft.type === "TP84" ? `${pods.length} payload` : `${weaponGaugeValue}/${weaponGaugeMax}`}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-[9px] font-mono tracking-widest text-gray-500">WEAPON LOADOUT</div>
        <div className="flex flex-wrap gap-2">
          {loadoutEntries.map((entry) => (
            <WeaponBadge key={entry.label} count={entry.count} label={entry.label} color={entry.color} />
          ))}
          {pods.map((pod) => (
            <div
              key={pod}
              className="flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[8px] font-mono text-blue-700"
            >
              {pod}
            </div>
          ))}
          {loadoutEntries.length === 0 && pods.length === 0 && (
            <span className="text-[9px] font-mono text-gray-500">No stores loaded</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
        <div className="mb-2 text-[9px] font-mono tracking-widest text-gray-500">SYSTEMS</div>
        <div className="space-y-2 text-[10px] font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Radar className="h-3 w-3" style={{ color: aircraft.radarActive ? "#2D5A27" : "#9CA3AF" }} />
              Radar search sector
            </div>
            <span className="font-bold" style={{ color: aircraft.radarActive ? "#2D5A27" : "#9CA3AF" }}>
              {aircraft.radarActive ? `ACTIVE${aircraft.radarRangeKm ? ` · ${aircraft.radarRangeKm} km` : ""}` : "SILENT"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Shield className="h-3 w-3 text-gray-400" />
              Mission package
            </div>
            <span className="font-bold text-gray-700">{missionLabel ?? "Pending tasking"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Wrench className="h-3 w-3 text-gray-400" />
              To next service
            </div>
            <span className="font-bold" style={{ color: (aircraft.hoursToService ?? 0) < 20 ? "#D97706" : "#374151" }}>
              {aircraft.hoursToService ?? "—"} h
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Clock3 className="h-3 w-3 text-gray-400" />
              Estimated landing
            </div>
            <span className="font-bold text-gray-700">{aircraft.estimatedLandingTime ?? "TBD"}</span>
          </div>
          {aircraft.isTargeted && (
            <div className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-[10px] font-mono text-red-600">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Enemy lock indication detected
            </div>
          )}
        </div>
      </div>

      {base?.weather && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
          <div className="mb-2 text-[9px] font-mono tracking-widest text-gray-500">BASE WEATHER</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {dataCell("WIND", `${base.weather.windDirDeg}° / ${base.weather.windKts} kt`)}
            {dataCell("VIS", `${base.weather.visibilityKm} km`)}
            {dataCell("CEILING", base.weather.ceilingFt === 0 ? "CAVOK" : `${base.weather.ceilingFt} ft`)}
            {dataCell("APPROACH", `${base.weather.condition} / ${landingCapability}`)}
          </div>
        </div>
      )}
    </div>
  );
}
