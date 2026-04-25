import type { Unit, Affiliation, AirDefenseUnit } from "@/types/units";
import { isAircraft, isDrone, isAirDefense, isGroundVehicle, isRadar } from "@/types/units";
import type { BaseType } from "@/types/game";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import gripenSilhouette from "@/assets/gripen-silhouette.png";
import { useGame } from "@/context/GameContext";
import { Link } from "react-router-dom";
import { getAirDefenseRangeProfile } from "@/core/units/airDefense";

const AFFILIATIONS: Affiliation[] = ["friend", "hostile", "neutral", "unknown", "pending"];

export function UnitDetailPanel({
  unit,
  isAtBase,
  allBases,
}: {
  unit: Unit;
  isAtBase: boolean;
  allBases: { id: BaseType; name: string }[];
}) {
  const { dispatch } = useGame();

  const health = unit.health ?? 100;
  const healthColor = health < 30 ? "#ef4444" : health < 60 ? "#eab308" : "#22c55e";
  const fuel = "fuel" in unit ? unit.fuel : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        {isAircraft(unit) ? (
          <img
            src={gripenSilhouette}
            alt={unit.name}
            width={48}
            style={{
              filter: unit.affiliation === "hostile"
                ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(320deg)"
                : unit.affiliation === "neutral"
                ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(200deg)"
                : unit.affiliation === "friend"
                ? "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(90deg)"
                : "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(50deg)",
            }}
          />
        ) : (
          <UnitSymbol sidc={unit.sidc} size={48} />
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{unit.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {unit.category} · {unit.affiliation}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Hälsa</span>
          <span className="font-bold" style={{ color: healthColor }}>{health}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${health}%`, background: healthColor }} />
        </div>
      </div>

      {fuel != null && !isAirDefense(unit) && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Bränsle</span>
          <span className="font-bold text-foreground">{Math.round(fuel)}%</span>
        </div>
      )}

      {!isAirDefense(unit) && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aktuell bas</span>
            <span className="text-foreground">{unit.currentBase ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Senaste bas</span>
            <span className="text-foreground">{unit.lastBase ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Position</span>
            <span className="text-foreground">{unit.position.lat.toFixed(3)}, {unit.position.lng.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rörelse</span>
            <span className="text-foreground">{unit.movement.state} @ {Math.round(unit.movement.speed)} kt</span>
          </div>
        </div>
      )}

      {isDrone(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Drönare</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Status</span><span>{unit.status}</span></div>
          <div className="flex justify-between"><span>Uthållighet</span><span>{unit.enduranceHours} h</span></div>
        </section>
      )}

      {isAirDefense(unit) && (() => {
        const profile = getAirDefenseRangeProfile(unit);
        const missileRatio = profile.capacityFactor;
        const missileColor = missileRatio > 0.6 ? "#22c55e" : missileRatio > 0.25 ? "#eab308" : "#ef4444";
        const fuelColor = unit.fuel > 60 ? "#22c55e" : unit.fuel > 25 ? "#eab308" : "#ef4444";
        const healthColor = unit.health > 60 ? "#22c55e" : unit.health > 30 ? "#eab308" : "#ef4444";
        const baseName = allBases.find((b) => b.id === unit.currentBase)?.name ?? unit.currentBase ?? "Fält";
        const statusColors: Record<string, { bg: string; fg: string }> = {
          ready:      { bg: "rgba(34,197,94,0.20)",   fg: "#22c55e" },
          standby:    { bg: "rgba(234,179,8,0.20)",   fg: "#eab308" },
          firing:     { bg: "rgba(220,38,38,0.20)",   fg: "#DC2626" },
          relocating: { bg: "rgba(148,163,184,0.20)", fg: "#94a3b8" },
        };
        const sc = statusColors[unit.operationalStatus] ?? statusColors.standby;

        return (
          <section
            className="rounded-lg p-3 space-y-3"
            style={{ background: "rgba(10,14,22,0.85)", border: "1px solid rgba(220,38,38,0.30)" }}
          >
            <div className="text-[9px] font-mono tracking-widest text-red-400 uppercase">Luftvärn — {unit.type}</div>

            {/* Status + deploy state */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase"
                style={{ background: sc.bg, color: sc.fg }}>
                {unit.operationalStatus}
              </span>
              <span className="text-[9px] font-mono"
                style={{ color: unit.deployedState === "emplaced" ? "#22c55e" : "#94a3b8" }}>
                {unit.deployedState === "emplaced" ? "EMPLACED" : "STOWED"}
              </span>
            </div>

            {/* Base / unit affiliation */}
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-500">Tillhör</span>
              <span className="text-slate-200">{baseName}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-500">Position</span>
              <span className="text-slate-400">{unit.position.lat.toFixed(3)}, {unit.position.lng.toFixed(3)}</span>
            </div>

            {/* Health */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Systemhälsa</span>
                <span style={{ color: healthColor }}>{unit.health}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${unit.health}%`, background: healthColor }} />
              </div>
            </div>

            {/* Fuel */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Bränsle</span>
                <span style={{ color: fuelColor }}>{Math.round(unit.fuel)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${unit.fuel}%`, background: fuelColor }} />
              </div>
            </div>

            {/* Missile stock */}
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-slate-500">Ammunition</span>
                <span style={{ color: missileColor }}>{unit.missileStock.loaded} / {unit.missileStock.max} robotar</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${missileRatio * 100}%`, background: missileColor }} />
              </div>
            </div>

            {/* Ranges */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
              <span className="text-slate-500">Beredskap</span>
              <span style={{ color: profile.readinessPercent > 65 ? "#22c55e" : profile.readinessPercent > 35 ? "#eab308" : "#ef4444" }}>
                {profile.readinessPercent}%
              </span>
              <span className="text-slate-500">Eff. räckvidd</span>
              <span style={{ color: missileColor }}>{profile.effectiveEngagementRange} km</span>
              <span className="text-slate-500">Max räckvidd</span>
              <span className="text-slate-400">{unit.engagementRange} km</span>
              <span className="text-slate-500">Eff. detektering</span>
              <span className="text-amber-400">{profile.effectiveDetectionRange} km</span>
              <span className="text-slate-500">Max detektering</span>
              <span className="text-slate-400">{unit.detectionRange} km</span>
              <span className="text-slate-500">Förflyttning</span>
              <span className="text-slate-400">{unit.relocateSpeed} km/h</span>
            </div>

            <div
              className="rounded border px-2.5 py-2 text-[10px] font-mono"
              style={{ borderColor: "rgba(245,158,11,0.24)", background: "rgba(245,158,11,0.06)", color: "#f8fafc" }}
            >
              Klicka pa batteriet pa kartan for att visa aktuell rackvidd. Rackvidden vags mot robotlast, systemhalsa, bransle och status.
            </div>

            {/* WTA selector */}
            <WTASelector unit={unit} />

            {/* Emplace / Stow toggle */}
            <button
              className="w-full px-2 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(220,38,38,0.40)",
                color: "#DC2626",
              }}
              onClick={() => dispatch({
                type: "SET_AD_STATE",
                unitId: unit.id,
                deployedState: unit.deployedState === "emplaced" ? "stowed" : "emplaced",
              })}
            >
              {unit.deployedState === "emplaced" ? "Stow" : "Emplace"}
            </button>
          </section>
        );
      })()}

      {isGroundVehicle(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Markfordon</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Vägfart</span><span>{unit.roadSpeed} kt</span></div>
        </section>
      )}

      {isRadar(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Radar</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Läge</span><span>{unit.deployedState}</span></div>
          <div className="flex justify-between"><span>Sänder</span><span>{unit.emitting ? "ja" : "nej"}</span></div>
          <button
            className="mt-2 w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            onClick={() => dispatch({ type: "SET_RADAR_EMITTING", unitId: unit.id, emitting: !unit.emitting })}
          >
            {unit.emitting ? "Stäng av sändning" : "Börja sända"}
          </button>
        </section>
      )}

      <section className="space-y-2 pt-2 border-t border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Klassificering</div>
        <div className="flex flex-wrap gap-1">
          {AFFILIATIONS.map((aff) => (
            <button
              key={aff}
              onClick={() => dispatch({ type: "CLASSIFY_CONTACT", unitId: unit.id, affiliation: aff })}
              className="px-2 py-1 border border-border rounded hover:bg-muted/30 text-[10px]"
              style={{
                background: unit.affiliation === aff ? "rgba(215,171,58,0.25)" : undefined,
                borderColor: unit.affiliation === aff ? "#D7AB3A" : undefined,
              }}
            >
              {aff}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 pt-2 border-t border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Åtgärder</div>
        {isAtBase ? (
          <>
            <div className="rounded border border-primary/25 bg-primary/5 px-3 py-2 text-[10px] text-muted-foreground">
              Placera enheten genom att dra den fran baspanelen ut pa kartan.
            </div>
            <div className="flex gap-1 flex-wrap">
              {allBases.filter((b) => b.id !== unit.currentBase).map((b) => (
                <button
                  key={b.id}
                  onClick={() => dispatch({ type: "TRANSFER_UNIT", unitId: unit.id, toBaseId: b.id })}
                  className="px-2 py-1 border border-border rounded hover:bg-muted/30 text-[10px]"
                >
                  → {b.id}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {unit.affiliation !== "hostile" && (
              <button
                onClick={() => dispatch({ type: "RECALL_UNIT", unitId: unit.id })}
                className="w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
              >
                Återkalla till bas
              </button>
            )}
            <div className="rounded border border-primary/25 bg-primary/5 px-3 py-2 text-[10px] text-muted-foreground">
              Flytta enheten genom att dra markoren direkt pa kartan.
            </div>
          </>
        )}
      </section>

      <Link to={`/units/${unit.id}`} className="block text-center text-primary text-[11px] hover:underline pt-2 border-t border-border">
        Fullständig översikt →
      </Link>
    </div>
  );
}

// Re-export type guards helper for the parent
export { isAircraft };

function WTASelector({ unit }: { unit: AirDefenseUnit }) {
  const { state, dispatch } = useGame();

  const allTargets = [
    ...state.enemyEntities.map((e) => ({ id: e.id, label: `${e.name} (${e.category})` })),
    ...state.enemyBases.map((b) => ({ id: b.id, label: `${b.name} [bas]` })),
  ];

  if (allTargets.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">WTA — Mål</div>
      <select
        value={unit.assignedTargetId ?? ""}
        onChange={(e) =>
          dispatch({
            type: "ASSIGN_TARGET",
            unitId: unit.id,
            targetId: e.target.value || null,
          })
        }
        className="w-full rounded px-2 py-1 text-[10px] font-mono"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(220,38,38,0.30)",
          color: unit.assignedTargetId ? "#DC2626" : "#64748b",
        }}
      >
        <option value="">— Inget mål tilldelat —</option>
        {allTargets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
