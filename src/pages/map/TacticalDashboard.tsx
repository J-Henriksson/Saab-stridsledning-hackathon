import type { AircraftUnit, FuelStatus } from "@/types/units";
import type { Base } from "@/types/game";
import { Radar, Crosshair, Zap, Shield, Plane, AlertTriangle } from "lucide-react";

const FUEL_THRESHOLDS: Record<FuelStatus, { color: string; bg: string; label: string }> = {
  Normal:    { color: "#2D5A27", bg: "#2D5A2714", label: "NORMAL" },
  Joker:     { color: "#D97706", bg: "#D9770614", label: "JOKER" },
  Bingo:     { color: "#DC2626", bg: "#DC262614", label: "BINGO" },
  Emergency: { color: "#DC2626", bg: "#DC262622", label: "EMERGENCY" },
};

const MISSION_LABELS: Record<string, string> = {
  QRA: "Quick Reaction Alert", CAP: "Combat Air Patrol",
  CAS: "Close Air Support",    RECON: "Reconnaissance",
  DCA: "Defensive Counter-Air", AEW: "Airborne Early Warning",
  RECCE: "Reconnaissance",    ESCORT: "Escort",
  TRANSPORT: "Transport",
};

function GaugeBar({
  value, max = 100, color, label, sublabel,
}: {
  value: number; max?: number; color: string; label: string; sublabel?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: "#6b7280" }}>
          {label}
        </span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>
          {sublabel ?? `${value}`}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#e5e7eb" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function WeaponBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-2 py-1.5 min-w-[44px]"
      style={{ background: `${color}12`, border: `1px solid ${color}40` }}
    >
      <span className="text-sm font-bold font-mono" style={{ color }}>{count}</span>
      <span className="text-[8px] font-mono" style={{ color: "#9ca3af" }}>{label}</span>
    </div>
  );
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
  const loadout = aircraft.weaponLoadout;
  const missionLabel = aircraft.tacMission ? MISSION_LABELS[aircraft.tacMission] : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
      {/* Operating base banner — prominent */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center gap-2"
        style={{ background: "#f0fdf4", border: "1.5px solid #2D5A27" }}
      >
        <Plane className="h-4 w-4 shrink-0" style={{ color: "#2D5A27" }} />
        <div>
          <div className="text-[9px] font-mono tracking-widest" style={{ color: "#6b7280" }}>
            OPERATING FROM
          </div>
          <div className="font-bold text-sm font-mono" style={{ color: "#2D5A27" }}>
            {base?.name ?? aircraft.currentBase ?? "OKÄND BAS"}
          </div>
          {base?.icaoCode && (
            <div className="text-[9px] font-mono" style={{ color: "#6b7280" }}>
              {base.icaoCode} · {base.weather?.condition ?? "—"}
              {base.weather && ` · Vind ${base.weather.windKts} kt`}
            </div>
          )}
        </div>
      </div>

      {/* Identity row */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        {aircraft.callsign && (
          <div className="rounded-lg px-2 py-1.5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="text-[8px] tracking-widest" style={{ color: "#9ca3af" }}>CALLSIGN</div>
            <div className="font-bold text-gray-800 text-xs mt-0.5">{aircraft.callsign}</div>
          </div>
        )}
        {aircraft.squawkCode && (
          <div className="rounded-lg px-2 py-1.5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="text-[8px] tracking-widest" style={{ color: "#9ca3af" }}>SQUAWK</div>
            <div className="font-bold text-gray-800 text-xs mt-0.5">{aircraft.squawkCode}</div>
          </div>
        )}
        {aircraft.wing && (
          <div className="rounded-lg px-2 py-1.5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="text-[8px] tracking-widest" style={{ color: "#9ca3af" }}>WING</div>
            <div className="font-bold text-gray-800 text-xs mt-0.5">{aircraft.wing}</div>
          </div>
        )}
        {missionLabel && (
          <div className="rounded-lg px-2 py-1.5" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="text-[8px] tracking-widest" style={{ color: "#9ca3af" }}>MISSION</div>
            <div className="font-bold text-gray-800 text-xs mt-0.5">{aircraft.tacMission}</div>
          </div>
        )}
      </div>

      {/* Flight data */}
      {(aircraft.machSpeed !== undefined || aircraft.verticalRate !== undefined) && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono tracking-widest" style={{ color: "#9ca3af" }}>FLYGTILLSTÅND</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            {aircraft.machSpeed !== undefined && (
              <div>
                <div className="text-[8px]" style={{ color: "#9ca3af" }}>MACH</div>
                <div className="font-bold text-gray-800">{aircraft.machSpeed.toFixed(2)}</div>
              </div>
            )}
            {aircraft.verticalRate !== undefined && (
              <div>
                <div className="text-[8px]" style={{ color: "#9ca3af" }}>VSI (ft/min)</div>
                <div
                  className="font-bold"
                  style={{ color: aircraft.verticalRate > 200 ? "#2D5A27" : aircraft.verticalRate < -200 ? "#DC2626" : "#374151" }}
                >
                  {aircraft.verticalRate > 0 ? "+" : ""}{aircraft.verticalRate}
                </div>
              </div>
            )}
            {aircraft.movement.heading !== undefined && (
              <div>
                <div className="text-[8px]" style={{ color: "#9ca3af" }}>HDG</div>
                <div className="font-bold text-gray-800">{aircraft.movement.heading}°</div>
              </div>
            )}
            {aircraft.movement.speed > 0 && (
              <div>
                <div className="text-[8px]" style={{ color: "#9ca3af" }}>SPEED (kt)</div>
                <div className="font-bold text-gray-800">{aircraft.movement.speed}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fuel gauge */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-mono tracking-widest" style={{ color: "#9ca3af" }}>BRÄNSLE</div>
          <div
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{ background: fuelStyle.bg, color: fuelStyle.color }}
          >
            {fuelStyle.label}
          </div>
        </div>
        <GaugeBar
          value={aircraft.fuel}
          color={fuelThreshold === "Normal" ? "#2D5A27" : fuelThreshold === "Joker" ? "#D97706" : "#DC2626"}
          label=""
          sublabel={`${aircraft.fuel.toFixed(0)}%`}
        />
        {/* Threshold markers */}
        <div className="relative mt-1" style={{ height: 12 }}>
          <div className="absolute text-[7px] font-mono" style={{ left: "25%", transform: "translateX(-50%)", color: "#D97706" }}>
            JOKER
          </div>
          <div className="absolute text-[7px] font-mono" style={{ left: "10%", transform: "translateX(-50%)", color: "#DC2626" }}>
            BINGO
          </div>
        </div>
      </div>

      {/* Weapon loadout */}
      {loadout && (
        <div>
          <div className="text-[9px] font-mono tracking-widest mb-2" style={{ color: "#9ca3af" }}>
            VAPENLAST
          </div>
          <div className="flex gap-2 flex-wrap">
            {(loadout.aam ?? 0) > 0 && (
              <WeaponBadge count={loadout.aam!} label="AAM" color="#DC2626" />
            )}
            {(loadout.agm ?? 0) > 0 && (
              <WeaponBadge count={loadout.agm!} label="AGM" color="#D97706" />
            )}
            {(loadout.bombs ?? 0) > 0 && (
              <WeaponBadge count={loadout.bombs!} label="BOMBS" color="#6b7280" />
            )}
            {loadout.pods && loadout.pods.length > 0 && loadout.pods.map((p) => (
              <div
                key={p}
                className="flex items-center px-2 py-1 rounded-lg text-[8px] font-mono"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
              >
                {p}
              </div>
            ))}
            {!loadout.aam && !loadout.agm && !loadout.bombs && (!loadout.pods || loadout.pods.length === 0) && (
              <span className="text-[9px] font-mono" style={{ color: "#9ca3af" }}>Ingen last</span>
            )}
          </div>
        </div>
      )}

      {/* Radar & systems */}
      <div>
        <div className="text-[9px] font-mono tracking-widest mb-2" style={{ color: "#9ca3af" }}>SYSTEM</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-700">
              <Radar className="h-3 w-3" style={{ color: aircraft.radarActive ? "#2D5A27" : "#9ca3af" }} />
              Radar
              {aircraft.radarRangeKm && aircraft.radarActive && (
                <span style={{ color: "#6b7280" }}>{aircraft.radarRangeKm} km</span>
              )}
            </div>
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                background: aircraft.radarActive ? "#f0fdf4" : "#f9fafb",
                color: aircraft.radarActive ? "#2D5A27" : "#9ca3af",
                border: `1px solid ${aircraft.radarActive ? "#2D5A2740" : "#e5e7eb"}`,
              }}
            >
              {aircraft.radarActive ? "AKTIV" : "TYST"}
            </span>
          </div>

          {aircraft.isTargeted && (
            <div
              className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1.5 rounded-lg"
              style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#DC2626" }}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              VARNING — Fientlig målinmätning detekterad
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-700">
              <Shield className="h-3 w-3 text-gray-400" />
              Underhåll om
            </div>
            <span className="text-[10px] font-mono" style={{ color: (aircraft.hoursToService ?? 0) < 20 ? "#D97706" : "#374151" }}>
              {aircraft.hoursToService ?? "—"} h
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-700">
              <Zap className="h-3 w-3 text-gray-400" />
              Flygtimmar
            </div>
            <span className="text-[10px] font-mono text-gray-700">{aircraft.flightHours} h</span>
          </div>
        </div>
      </div>

      {/* Base weather */}
      {base?.weather && (
        <div>
          <div className="text-[9px] font-mono tracking-widest mb-2" style={{ color: "#9ca3af" }}>VÄDER VID BAS</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <div className="text-[8px]" style={{ color: "#9ca3af" }}>VIND</div>
              <div className="font-bold text-gray-700">
                {base.weather.windDirDeg}° / {base.weather.windKts} kt
              </div>
            </div>
            <div>
              <div className="text-[8px]" style={{ color: "#9ca3af" }}>SIKT</div>
              <div className="font-bold text-gray-700">{base.weather.visibilityKm} km</div>
            </div>
            <div>
              <div className="text-[8px]" style={{ color: "#9ca3af" }}>MOLN (ft)</div>
              <div className="font-bold text-gray-700">
                {base.weather.ceilingFt === 0 ? "CAVOK" : base.weather.ceilingFt}
              </div>
            </div>
            <div>
              <div className="text-[8px]" style={{ color: "#9ca3af" }}>TILLSTÅND</div>
              <div
                className="font-bold"
                style={{ color: base.weather.condition === "VMC" ? "#2D5A27" : base.weather.condition === "IMC" ? "#DC2626" : "#D97706" }}
              >
                {base.weather.condition}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
