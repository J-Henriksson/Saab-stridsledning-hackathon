import { useState } from "react";
import { Base, ScenarioPhase, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlaneTakeoff, Wrench, Target, Shield, Clock,
  Zap, AlertTriangle, TrendingUp, Info, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── SAAB Palette ─────────────────────────────────────────────────────────────
const NAVY  = "#0C234C";
const RED   = "#D9192E";
const AMBER = "#D7AB3A";

interface RemainingLifeGrafProps {
  bases: Base[];
  phase: ScenarioPhase;
  hideBars?: boolean;
}

// ─── Scoring helpers ───────────────────────────────────────────────────────────

function calcMissionFit(ac: Aircraft, base: Base): number {
  const ammo = base.ammunition;
  if (ac.type === "GripenE") {
    const aa = (ammo.find(a => a.type === "IRIS-T")?.quantity ?? 0)
              + (ammo.find(a => a.type === "Meteor")?.quantity ?? 0);
    const ag = (ammo.find(a => a.type === "GBU-39")?.quantity ?? 0)
              + (ammo.find(a => a.type === "RBS-15F")?.quantity ?? 0);
    return Math.min(1, Math.max(aa, ag) / 12);
  }
  if (ac.type === "GripenF_EA") {
    return Math.min(1, (ammo.find(a => a.type === "IRIS-T")?.quantity ?? 0) / 6);
  }
  if (ac.type === "GlobalEye") return 0.9;
  if (ac.type === "LOTUS")     return 0.7;
  return 0.5;
}

function calcPilotReadiness(ac: Aircraft): number {
  if (
    ac.status === "on_mission"       ||
    ac.status === "under_maintenance" ||
    ac.status === "unavailable"
  ) return 0;
  const exp = Math.min(1, (ac.flightHours ?? 50) / 300);
  return 0.3 + exp * 0.7;
}

function calcTurnaround(base: Base): number {
  const free = Math.max(0, base.maintenanceBays.total - base.maintenanceBays.occupied);
  const bayScore = base.maintenanceBays.total > 0
    ? free / base.maintenanceBays.total : 1;
  const mech = base.personnel.find(p => p.id === "mech");
  const mechScore = mech && mech.total > 0 ? mech.available / mech.total : 0.5;
  return (bayScore + mechScore) / 2;
}

type ScoreBreakdown = {
  total: number; health: number; missionFit: number;
  pilotReady: number; turnaround: number;
};

function calcScores(ac: Aircraft, base: Base): ScoreBreakdown {
  const h  = (ac.health ?? 100) / 100;
  const mf = calcMissionFit(ac, base);
  const pr = calcPilotReadiness(ac);
  const ta = calcTurnaround(base);
  return {
    total:       Math.round((h * 0.4 + mf * 0.3 + pr * 0.2 + ta * 0.1) * 100),
    health:      Math.round(h  * 100),
    missionFit:  Math.round(mf * 100),
    pilotReady:  Math.round(pr * 100),
    turnaround:  Math.round(ta * 100),
  };
}

function scoreColor(s: number) {
  return s >= 80 ? "#22c55e" : s >= 55 ? AMBER : RED;
}

const typeAbbr = (t: string) => {
  if (t === "GripenE")    return "E";
  if (t === "GripenF_EA") return "F";
  if (t === "GlobalEye")  return "GE";
  if (t === "VLO_UCAV")  return "UC";
  return "LO";
};

type Reason = { Icon: React.FC<{ className?: string }>; label: string; color: string };

function getReasons(scores: ScoreBreakdown, ac: Aircraft): Reason[] {
  const out: Reason[] = [];
  if (scores.health      >= 85) out.push({ Icon: Shield,    label: `Hälsa ${scores.health}%`,        color: "#22c55e" });
  if (scores.missionFit  >= 70) out.push({ Icon: Target,    label: `Beväpning ${scores.missionFit}%`, color: "#60a5fa" });
  if (scores.pilotReady  >= 65) out.push({ Icon: Zap,       label: `Pilot ${scores.pilotReady}%`,     color: AMBER });
  if (scores.turnaround  >= 70) out.push({ Icon: Clock,     label: `Omsättn ${scores.turnaround}%`,  color: "#a78bfa" });
  if (ac.hoursToService  <  20) out.push({ Icon: Wrench,    label: `Service ${ac.hoursToService}h`,   color: RED });
  if (ac.hoursToService  >= 50) out.push({ Icon: TrendingUp, label: `Uthållig ${ac.hoursToService}h`, color: "#0891B2" });
  return out;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RemainingLifeGraf({ bases, phase, hideBars }: RemainingLifeGrafProps) {
  const [expandedAc, setExpandedAc] = useState<string | null>(null);

  // Enrich aircraft with base reference and scores
  const all = bases.flatMap(base =>
    base.aircraft.map(ac => ({ ...ac, base, baseName: base.id, scores: calcScores(ac, base) }))
  );
  const total = all.length;

  // ── Bucket 1: Alpha Strike ──────────────────────────────────────────────────
  const alphaStrike = all
    .filter(ac =>
      (ac.status === "ready" || ac.status === "allocated") &&
      (ac.health ?? 0) >= 80 &&
      ac.hoursToService >= 25
    )
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, 3);

  // ── Bucket 2: Resource Bottleneck ──────────────────────────────────────────
  const underMaint = all.filter(
    ac => ac.status === "under_maintenance" || ac.status === "unavailable"
  );
  const quickestToFix = [...underMaint].sort(
    (a, b) => (a.maintenanceTimeRemaining ?? 99) - (b.maintenanceTimeRemaining ?? 99)
  )[0];
  const mechShortage = bases.some(b => {
    const m = b.personnel.find(p => p.id === "mech");
    return m && m.available < 3;
  });
  const bayShortage = bases.some(
    b => b.maintenanceBays.occupied >= b.maintenanceBays.total && b.maintenanceBays.total > 0
  );
  const partsShortage = bases.some(
    b => b.spareParts.some(p => p.quantity === 0 && p.reservedQuantity > 0)
  );

  // ── Bucket 3: Economic Drift ────────────────────────────────────────────────
  const economicDrift = all
    .filter(ac => ac.status === "ready" || ac.status === "allocated")
    .sort((a, b) => b.hoursToService - a.hoursToService)
    .slice(0, 4);

  // ── What-If ─────────────────────────────────────────────────────────────────
  const readyCandidates = all
    .filter(ac => ac.status === "ready" && (ac.health ?? 0) >= 70)
    .sort((a, b) => b.scores.total - a.scores.total);
  const top = readyCandidates[0];
  const alt = readyCandidates[1];
  const MISSION_H = 2;
  const willNeedService = top && (top.hoursToService - MISSION_H) < 20;

  // ── Sorted bars ─────────────────────────────────────────────────────────────
  const sorted = [...all].sort((a, b) => b.scores.total - a.scores.total);

  return (
    <div className="space-y-4">

      {/* Fleet summary strip */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1 pb-2 text-[9px] font-mono"
        style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}
      >
        {bases.map(base => {
          const cnt   = base.aircraft.length;
          const ready = base.aircraft.filter(ac => ac.status === "ready" || ac.status === "allocated").length;
          const maint = base.aircraft.filter(ac => ac.status === "under_maintenance").length;
          const nmc   = base.aircraft.filter(ac => ac.status === "unavailable").length;
          return (
            <span key={base.id} className="flex items-center gap-1.5">
              <span className="font-bold" style={{ color: NAVY }}>{base.id}</span>
              <span style={{ color: "hsl(218 15% 50%)" }}>{cnt} plan</span>
              <span style={{ color: "#22c55e" }}>· {ready} redo</span>
              {maint > 0 && <span style={{ color: AMBER }}>· {maint} UH</span>}
              {nmc   > 0 && <span style={{ color: RED   }}>· {nmc} NMC</span>}
            </span>
          );
        })}
        <span className="ml-auto font-bold" style={{ color: "hsl(218 15% 45%)" }}>
          Totalt: {total} flygplan
        </span>
      </div>

      {/* ── Smart Buckets ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

        {/* Box 1 — Alpha Strike */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: `${NAVY}08`, border: `1px solid ${NAVY}22` }}
        >
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" style={{ color: NAVY }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: NAVY }}>
              ALPHA STRIKE
            </span>
            <span
              className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${NAVY}12`, color: NAVY }}
            >
              {alphaStrike.length} redo
            </span>
          </div>
          <p className="text-[8px] font-mono leading-tight" style={{ color: "hsl(218 15% 48%)" }}>
            Fullt beväpnade plan med 80%+ hälsa och topp Mission Ready Score — redo för omedelbar scramble.
          </p>
          {alphaStrike.length === 0 ? (
            <p className="text-[9px] font-mono" style={{ color: RED }}>
              Inga Alpha Strike-plan tillgängliga just nu
            </p>
          ) : (
            alphaStrike.map(ac => {
              const reasons = getReasons(ac.scores, ac);
              return (
                <div
                  key={ac.id}
                  className="rounded-lg px-2 py-1.5 space-y-1"
                  style={{ background: `${NAVY}05` }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>
                        {ac.tailNumber}
                      </span>
                      <span
                        className="text-[8px] px-1 rounded font-mono"
                        style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}
                      >
                        {typeAbbr(ac.type)}
                      </span>
                      <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 60%)" }}>
                        {ac.baseName}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-mono font-black"
                      style={{ color: scoreColor(ac.scores.total) }}
                    >
                      {ac.scores.total}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {reasons.slice(0, 3).map((r, j) => (
                      <span
                        key={j}
                        className="flex items-center gap-0.5 text-[7px] font-mono px-1 py-0.5 rounded"
                        style={{ background: `${r.color}15`, color: r.color }}
                      >
                        <r.Icon className="h-2.5 w-2.5" />
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Box 2 — Resource Bottleneck */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: `${AMBER}0C`, border: `1px solid ${AMBER}38` }}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: AMBER }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: "#7a5200" }}>
              RESURS-FLASKHALSAR
            </span>
            <span
              className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: `${AMBER}1A`, color: "#7a5200" }}
            >
              {underMaint.length} UH
            </span>
          </div>
          <p className="text-[8px] font-mono leading-tight" style={{ color: "hsl(218 15% 48%)" }}>
            {[
              mechShortage && "⚠ Mekanikerbrist.",
              partsShortage && "⚠ Saknade reservdelar.",
              bayShortage && "⚠ Hangarbay full.",
            ]
              .filter(Boolean)
              .join(" ") || "Inga akuta flaskhalsar just nu."}
          </p>
          {quickestToFix && (
            <div
              className="rounded-lg px-2.5 py-2 space-y-0.5"
              style={{ background: `${AMBER}09` }}
            >
              <div className="text-[7px] font-mono uppercase tracking-wider" style={{ color: "#7a5200" }}>
                Snabbast klar → välj detta för snabbast kapacitetsåterstart
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>
                  {quickestToFix.tailNumber}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color: AMBER }}>
                  ~{quickestToFix.maintenanceTimeRemaining ?? "?"}h kvar
                </span>
              </div>
            </div>
          )}
          {underMaint.slice(0, 4).map(ac => (
            <div key={ac.id} className="flex items-center justify-between gap-1 text-[9px] font-mono">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3 w-3 shrink-0" style={{ color: AMBER }} />
                <span className="font-bold" style={{ color: NAVY }}>{ac.tailNumber}</span>
                <span className="text-[8px]" style={{ color: "hsl(218 15% 60%)" }}>{ac.baseName}</span>
              </div>
              <span style={{ color: ac.status === "unavailable" ? RED : AMBER }}>
                {ac.status === "unavailable" ? "NMC" : `${ac.maintenanceTimeRemaining ?? "?"}h`}
              </span>
            </div>
          ))}
          {underMaint.length === 0 && (
            <p className="text-[9px] font-mono" style={{ color: "#22c55e" }}>
              Alla plan är i operativ drift
            </p>
          )}
        </div>

        {/* Box 3 — Economic Drift */}
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(220 63% 18% / 0.04)", border: "1px solid hsl(215 14% 84%)" }}
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" style={{ color: "#0891B2" }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: "#0a3d4a" }}>
              EKONOMISK DRIFT
            </span>
          </div>
          <p className="text-[8px] font-mono leading-tight" style={{ color: "hsl(218 15% 48%)" }}>
            Spara elitplan — använd dessa för lång patrullering och bibehåll beredskapen hos {phase === "KRIG" ? "stridsklara" : "högpresterande"} individer.
          </p>
          {economicDrift.map(ac => (
            <div key={ac.id} className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <PlaneTakeoff className="h-3 w-3 shrink-0" style={{ color: "#0891B2" }} />
                <span className="text-[9px] font-mono font-bold" style={{ color: NAVY }}>{ac.tailNumber}</span>
                <span
                  className="text-[8px] px-1 rounded font-mono"
                  style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}
                >
                  {typeAbbr(ac.type)}
                </span>
                <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 60%)" }}>{ac.baseName}</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold" style={{ color: "#0891B2" }}>
                <Clock className="h-3 w-3" />
                {ac.hoursToService}h
              </div>
            </div>
          ))}
          {economicDrift.length === 0 && (
            <p className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
              Inga plan tillgängliga för ekonomisk drift
            </p>
          )}
        </div>
      </div>

      {/* ── What-If Simulation ──────────────────────────────────────────────── */}
      {top && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{ background: `${NAVY}05`, border: `1px solid ${NAVY}14` }}
        >
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" style={{ color: NAVY }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: NAVY }}>
              WHAT-IF SIMULERING — {top.tailNumber}
            </span>
          </div>
          <p className="text-[9px] font-mono leading-relaxed" style={{ color: "hsl(220 63% 20%)" }}>
            {willNeedService ? (
              <>
                <span style={{ color: RED }}>⚠ Om du skickar {top.tailNumber} nu</span> på ett {MISSION_H}h uppdrag
                {" "}landas det med bara <span style={{ color: RED }}>{top.hoursToService - MISSION_H}h</span> kvar till service —
                {" "}kräver omedelbar hangarinflyttning.{" "}
                {alt && (
                  <span style={{ color: "#22c55e" }}>
                    Rekommendation: Använd {alt.tailNumber} (MRS {alt.scores.total}) för att bibehålla basens beredskap.
                  </span>
                )}
              </>
            ) : (
              <>
                <span style={{ color: "#22c55e" }}>✓ {top.tailNumber}</span> kan utföra ett {MISSION_H}h uppdrag
                {" "}och har <span style={{ color: "#22c55e" }}>{top.hoursToService - MISSION_H}h</span> kvar till service
                {" "}— inom säkra marginaler. Mission Ready Score:{" "}
                <span style={{ color: scoreColor(top.scores.total) }}>{top.scores.total}/100</span>.
              </>
            )}
          </p>
          <div
            className="grid grid-cols-4 gap-2 pt-2"
            style={{ borderTop: "1px solid hsl(215 14% 90%)" }}
          >
            {[
              { label: "Hälsa 40%",      val: top.scores.health,     color: scoreColor(top.scores.health) },
              { label: "Beväpning 30%",  val: top.scores.missionFit, color: "#60a5fa" },
              { label: "Pilot 20%",      val: top.scores.pilotReady, color: AMBER },
              { label: "Omsättn 10%",   val: top.scores.turnaround, color: "#a78bfa" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-[7px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>{item.label}</div>
                <div className="text-[11px] font-mono font-black" style={{ color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Aircraft bars ───────────────────────────────────────────────────── */}
      {!hideBars && (
        <div className="space-y-1">
          {/* Header */}
          <div
            className="grid grid-cols-[118px_36px_1fr_72px_48px] gap-2 items-center pb-1.5"
            style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}
          >
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(218 15% 55%)" }}>
              FLYGPLAN ({total})
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-center" style={{ color: "hsl(218 15% 55%)" }}>
              MRS
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(218 15% 55%)" }}>HÄLSA</span>
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(218 15% 55%)" }}>SERVICE OM</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-right" style={{ color: "hsl(218 15% 55%)" }}>%</span>
          </div>

          {sorted.map((ac, i) => {
            const health     = ac.health ?? 100;
            const isCritical = health < 30;
            const isLow      = health < 60;
            const barColor   = isCritical ? RED : isLow ? AMBER : "#22c55e";
            const svcColor   = ac.hoursToService < 10 ? RED : ac.hoursToService < 20 ? AMBER : "hsl(218 15% 50%)";
            const isExp      = expandedAc === ac.id;
            const reasons    = getReasons(ac.scores, ac);

            return (
              <motion.div
                key={ac.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.008 }}
              >
                {/* Row */}
                <div
                  className="grid grid-cols-[118px_36px_1fr_72px_48px] gap-2 items-center cursor-pointer rounded px-1 py-0.5 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedAc(isExp ? null : ac.id)}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: NAVY }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: barColor }} />
                    <span className="font-bold truncate">{ac.tailNumber}</span>
                    <span
                      className="text-[7px] font-mono px-0.5 rounded shrink-0"
                      style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}
                    >
                      {ac.baseName}
                    </span>
                    {isExp
                      ? <ChevronDown className="h-2.5 w-2.5 ml-auto shrink-0 opacity-40" />
                      : <ChevronRight className="h-2.5 w-2.5 ml-auto shrink-0 opacity-20" />
                    }
                  </div>

                  <div className="text-center">
                    <span className="text-[9px] font-mono font-black" style={{ color: scoreColor(ac.scores.total) }}>
                      {ac.scores.total}
                    </span>
                  </div>

                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "hsl(216 18% 90%)" }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      animate={{ width: `${health}%` }}
                      transition={{ duration: 0.5, delay: i * 0.008, ease: "easeOut" }}
                      style={{ background: barColor }}
                    />
                  </div>

                  <div className="text-[9px] font-mono font-bold" style={{ color: svcColor }}>
                    {ac.hoursToService}h kvar
                  </div>

                  <div
                    className="text-[10px] font-mono font-bold text-right"
                    style={{ color: isCritical ? RED : isLow ? AMBER : NAVY }}
                  >
                    {health}%
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="ml-6 mb-1 rounded-lg p-2.5 space-y-2"
                        style={{ background: `${NAVY}05`, border: `1px solid ${NAVY}0E` }}
                      >
                        {/* Score breakdown */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {[
                            { label: "Teknisk Hälsa (40%)", val: ac.scores.health,     color: scoreColor(ac.scores.health) },
                            { label: "Mission Fit (30%)",   val: ac.scores.missionFit, color: "#60a5fa" },
                            { label: "Pilot Readiness (20%)", val: ac.scores.pilotReady, color: AMBER },
                            { label: "Turnaround (10%)",    val: ac.scores.turnaround, color: "#a78bfa" },
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between gap-2">
                              <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 50%)" }}>{item.label}</span>
                              <span className="text-[8px] font-mono font-bold" style={{ color: item.color }}>{item.val}</span>
                            </div>
                          ))}
                        </div>
                        {/* Reason tags */}
                        {reasons.length > 0 && (
                          <div
                            className="flex flex-wrap gap-1 pt-1.5"
                            style={{ borderTop: "1px solid hsl(215 14% 90%)" }}
                          >
                            {reasons.map((r, j) => (
                              <span
                                key={j}
                                className="flex items-center gap-1 text-[7px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: `${r.color}18`, color: r.color }}
                              >
                                <r.Icon className="h-2.5 w-2.5" />
                                {r.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
