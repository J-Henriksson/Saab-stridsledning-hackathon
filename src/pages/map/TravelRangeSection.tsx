import { useMemo } from "react";
import type { AircraftUnit, DroneUnit, GeoPosition } from "@/types/units";
import { isAircraft } from "@/types/units";
import type { BaseType } from "@/types/game";
import {
  computeTravelRange,
  formatHoursMinutes,
  etaHoursTo,
  type TravelRangeOptions,
  type CruiseMode,
  type PayloadMod,
} from "@/utils/travelRange";

export interface TravelRangeMode {
  enabled: boolean;
  returnBaseId: BaseType | null;
  options: TravelRangeOptions;
  autoPickBase: boolean;
  pinnedTargetId: string | null;
}

export interface BattleIntelSummary {
  reachableCount: number;
  strikeReturnCount: number;
  strikeOnlyCount: number;
  threatenedCount: number;
}

interface Props {
  unit: AircraftUnit | DroneUnit;
  bases: { id: BaseType; name: string; coords: GeoPosition }[];
  mode: TravelRangeMode;
  onChange: (next: TravelRangeMode) => void;
  intelSummary?: BattleIntelSummary;
}

const CRUISE_LABELS: { id: CruiseMode; label: string; hint: string }[] = [
  { id: "eco",    label: "ECO",    hint: "Längre räckvidd, lägre fart" },
  { id: "cruise", label: "CRUISE", hint: "Standard reseflygning" },
  { id: "dash",   label: "DASH",   hint: "Hög fart, kortare räckvidd" },
];

const PAYLOAD_LABELS: { id: PayloadMod; label: string }[] = [
  { id: "none",  label: "Tom" },
  { id: "light", label: "Lätt" },
  { id: "heavy", label: "Tung" },
];

export function TravelRangeSection({ unit, bases, mode, onChange, intelSummary }: Props) {
  const range = useMemo(() => computeTravelRange(unit, mode.options), [unit, mode.options]);

  const returnBase = mode.returnBaseId
    ? bases.find((b) => b.id === mode.returnBaseId) ?? null
    : null;

  const distToBaseKm = returnBase
    ? Math.round(
        Math.sqrt(
          Math.pow((returnBase.coords.lat - unit.position.lat) * 111, 2) +
            Math.pow(
              (returnBase.coords.lng - unit.position.lng) *
                111 *
                Math.cos((unit.position.lat * Math.PI) / 180),
              2
            )
        )
      )
    : null;
  const etaToBase = returnBase
    ? etaHoursTo(unit.position, returnBase.coords, range.cruiseSpeedKts)
    : null;

  const fuelInsufficient = range.maxRangeKm <= 0;

  const update = (patch: Partial<TravelRangeMode>) => onChange({ ...mode, ...patch });
  const updateOpts = (patch: Partial<TravelRangeOptions>) =>
    onChange({ ...mode, options: { ...mode.options, ...patch } });

  return (
    <section
      className="space-y-3 pt-2 border-t border-border"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Räckvidd & stridsintel
        </span>
        <button
          onClick={() => update({ enabled: !mode.enabled })}
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: mode.enabled ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${mode.enabled ? "rgba(34,197,94,0.55)" : "rgba(148,163,184,0.30)"}`,
            color: mode.enabled ? "#22c55e" : "#94a3b8",
          }}
        >
          {mode.enabled ? "På" : "Av"}
        </button>
      </div>

      {mode.enabled && (
        <>
          {/* Read-outs */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Effektiv räckvidd</span>
              <span
                className="text-foreground font-bold"
                style={{ color: fuelInsufficient ? "#ef4444" : "#f8fafc" }}
              >
                {fuelInsufficient ? "0 km — bränsle slut" : `${range.maxRangeKm.toFixed(0)} km`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uthållighet</span>
              <span className="text-foreground">
                {formatHoursMinutes(range.enduranceHours)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cruise</span>
              <span className="text-foreground">{range.cruiseSpeedKts.toFixed(0)} kt</span>
            </div>
            {isAircraft(unit) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bränsle</span>
                <span className="text-foreground">{Math.round(unit.fuel)}%</span>
              </div>
            )}
          </div>

          {/* Return base */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Returbas
            </div>
            <select
              className="w-full rounded px-2 py-1 text-[11px]"
              value={mode.returnBaseId ?? ""}
              onChange={(e) =>
                update({ returnBaseId: (e.target.value || null) as BaseType | null })
              }
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148,163,184,0.30)",
                color: "#e2e8f0",
              }}
              disabled={mode.autoPickBase}
            >
              <option value="">— Ingen returbas —</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {b.name}
                </option>
              ))}
            </select>

            {returnBase && distToBaseKm != null && etaToBase != null && (
              <div className="text-[10px] text-muted-foreground">
                {distToBaseKm} km direkt · ETA {formatHoursMinutes(etaToBase)}
                {distToBaseKm > range.maxRangeKm && (
                  <span className="ml-1 text-red-400">⚠ utom räckvidd</span>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
              <input
                type="checkbox"
                checked={mode.autoPickBase}
                onChange={(e) => update({ autoPickBase: e.target.checked })}
              />
              Auto: välj bästa returbas för pinnat mål
            </label>
          </div>

          {/* Reserve slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Bränslereserv</span>
              <span>{Math.round(mode.options.reservePct * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={Math.round(mode.options.reservePct * 100)}
              onChange={(e) => updateOpts({ reservePct: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </div>

          {/* Cruise mode */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Flygläge
            </div>
            <div className="flex gap-1">
              {CRUISE_LABELS.map((c) => {
                const active = mode.options.cruiseMode === c.id;
                return (
                  <button
                    key={c.id}
                    title={c.hint}
                    onClick={() => updateOpts({ cruiseMode: c.id })}
                    className="flex-1 px-1 py-1 text-[10px] font-bold tracking-wider rounded"
                    style={{
                      background: active ? "rgba(215,171,58,0.20)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? "rgba(215,171,58,0.65)" : "rgba(148,163,184,0.30)"}`,
                      color: active ? "#D7AB3A" : "#94a3b8",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payload */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Last
            </div>
            <div className="flex gap-1">
              {PAYLOAD_LABELS.map((p) => {
                const active = mode.options.payload === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateOpts({ payload: p.id })}
                    className="flex-1 px-1 py-1 text-[10px] font-bold rounded"
                    style={{
                      background: active ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? "rgba(56,189,248,0.55)" : "rgba(148,163,184,0.30)"}`,
                      color: active ? "#38bdf8" : "#94a3b8",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Battle intel summary */}
          {intelSummary && (
            <div
              className="rounded p-2 space-y-0.5"
              style={{
                background: "rgba(15,23,42,0.7)",
                border: "1px solid rgba(34,197,94,0.20)",
              }}
            >
              <div className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold mb-1">
                Stridsintel — auto
              </div>
              <SummaryRow
                label="Inom strike-räckvidd"
                value={intelSummary.reachableCount}
                color="#facc15"
              />
              <SummaryRow
                label="Strike & retur"
                value={intelSummary.strikeReturnCount}
                color="#22c55e"
              />
              <SummaryRow
                label="Endast envägs"
                value={intelSummary.strikeOnlyCount}
                color="#f59e0b"
              />
              <SummaryRow
                label="Hotad flygväg"
                value={intelSummary.threatenedCount}
                color="#ef4444"
              />
              {mode.pinnedTargetId && (
                <div className="text-[9px] text-cyan-400 pt-1 border-t border-white/5 mt-1">
                  ⌖ pinnat mål — klicka samma mål eller Esc för att avpinna
                </div>
              )}
              <div className="text-[9px] text-muted-foreground pt-1">
                Hovera över fientlig markör för detaljer · klicka för att pinna
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-slate-400">{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
