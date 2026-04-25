import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertOctagon, AlertTriangle, ArrowRight, Brain, CheckCircle2, ChevronRight,
  Clock, Crosshair, Fuel, Layers, Package, Radio, ShieldAlert, Skull,
  Sparkles, Target, TrendingDown, Truck, Users, Wrench, Zap,
} from "lucide-react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import {
  computeAtoLoad, computeContingencies, findCriticalItems,
  fleetAllocationPerBase, forecastFuelPerBase, generateLogisticsRecommendations,
  listResupply, singlePointOfFailure, snapshotBase, suggestBestConvoy,
  RESERVE_TARGET_PCT, FUEL_BURN_PCT_PER_HOUR, AMMO_BURN_PCT_PER_DAY,
  type BaseAtoLoad, type AtoLoadStatus,
  type ContingencyOutcome, type ContingencyVerdict,
  type CriticalItem, type LogisticsRecommendation, type LogRecPriority, type LogRecCategory,
} from "@/core/logistics";
import type { BaseType } from "@/types/game";

// ── SAAB palette ─────────────────────────────────────────────────────────────
const NAVY = "#0C234C";
const RED = "#D9192E";
const GOLD = "#D7AB3A";
const GREEN = "#22A05A";
const ORANGE = "#D97706";
const BLUE = "#3B82F6";
const PURPLE = "#7C3AED";
const SLATE = "hsl(218 15% 50%)";
const BORDER = "hsl(215 14% 86%)";

const heatColor = (pct: number) =>
  pct < 25 ? RED : pct < 45 ? "#E26A2C" : pct < 65 ? GOLD : pct < 80 ? "#7CB342" : GREEN;

const sevColor: Record<"critical" | "high" | "medium", string> = {
  critical: RED, high: ORANGE, medium: GOLD,
};

const verdictColor: Record<ContingencyVerdict, string> = {
  critical: RED, marginal: ORANGE, nominal: GREEN,
};
const verdictLabel: Record<ContingencyVerdict, string> = {
  critical: "KRITISK", marginal: "MARGINELL", nominal: "NOMINELL",
};

const atoStatusColor: Record<AtoLoadStatus, string> = {
  nominal: GREEN, tight: GOLD, over_committed: ORANGE, infeasible: RED,
};
const atoStatusLabel: Record<AtoLoadStatus, string> = {
  nominal: "NOMINELL", tight: "TIGHT", over_committed: "ÖVERBELASTAD", infeasible: "OMÖJLIG",
};

const prioMeta: Record<LogRecPriority, { color: string; label: string }> = {
  critical: { color: RED, label: "KRITISK" },
  high: { color: ORANGE, label: "HÖG" },
  medium: { color: GOLD, label: "MEDIUM" },
  low: { color: SLATE, label: "LÅG" },
};

const catLabel: Record<LogRecCategory, string> = {
  fuel_rebalance: "BRÄNSLEOMFÖRDELNING",
  fuel_reserve: "DOKTRINSRESERV",
  ammo_preposition: "AMMUNITION",
  parts_reorder: "RESERVDELAR",
  personnel_gap: "PERSONAL",
  bay_balance: "UH-PLATSER",
  convoy_route: "KONVOJ / TRANSPORT",
  phase_escalation: "FAS-ESKALERING",
};

/** Distinct line color per base for the per-base forecast chart. */
const BASE_LINE_COLOR: Record<string, string> = {
  MOB: "#0C234C",
  FOB_N: BLUE,
  FOB_S: PURPLE,
  ROB_N: ORANGE,
  ROB_S: GREEN,
  ROB_E: GOLD,
};
const baseLineColor = (id: string) => BASE_LINE_COLOR[id] ?? NAVY;

// ── Generic card frame ───────────────────────────────────────────────────────
function Card({
  title, icon: Icon, accent = NAVY, right, children, padded = true, emphasis,
}: {
  title: string;
  icon?: React.ElementType;
  accent?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  /** When true, draws a heavier ring + slightly elevated shadow (used for the contingency hero card). */
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white"
      style={{
        border: `1px solid ${emphasis ? `${accent}55` : BORDER}`,
        boxShadow: emphasis
          ? `0 0 0 1px ${accent}10, 0 4px 18px ${accent}10`
          : "0 1px 3px hsl(220 63% 18% / 0.06)",
      }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: emphasis ? `${accent}25` : "hsl(215 14% 90%)", background: `linear-gradient(90deg, ${accent}0e, transparent)` }}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} color={accent} />}
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: NAVY }}>{title}</span>
        </div>
        {right}
      </div>
      <div className={padded ? "p-4" : ""}>{children}</div>
    </div>
  );
}

// ── Heat-map cell ────────────────────────────────────────────────────────────
function MatrixCell({ pct, detail, onClick }: { pct: number; detail: string; onClick?: () => void }) {
  const color = heatColor(pct);
  return (
    <button
      onClick={onClick}
      className="px-2 py-2 text-left transition-all hover:brightness-95"
      style={{
        background: `${color}1a`,
        borderLeft: `3px solid ${color}`,
        cursor: onClick ? "pointer" : "default",
        width: "100%",
      }}
    >
      <div className="text-[12px] font-mono font-black leading-none" style={{ color }}>{pct}%</div>
      <div className="text-[8px] font-mono mt-1" style={{ color: SLATE }}>{detail}</div>
    </button>
  );
}

// ── Contingency row (collapsible) ────────────────────────────────────────────
function ContingencyRow({ s, onClickBase }: { s: ContingencyOutcome; onClickBase: (b: BaseType) => void }) {
  const [expanded, setExpanded] = useState(s.verdict === "critical");
  const c = verdictColor[s.verdict];
  const Icon = s.kind === "base_loss" ? Skull : s.kind === "supply_loss" ? Truck : ShieldAlert;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${c}33`, background: `${c}05` }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:brightness-95">
        <div className="w-1 h-9 rounded-full flex-shrink-0" style={{ background: c }} />
        <Icon size={14} color={c} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold" style={{ color: NAVY }}>{s.label}</span>
            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: `${c}18`, color: c, border: `1px solid ${c}55` }}>
              {verdictLabel[s.verdict]}
            </span>
          </div>
          <div className="text-[9px] font-mono mt-0.5" style={{ color: SLATE }}>{s.implication}</div>
        </div>
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <Stat label="DOS" value={`${s.daysUntilHalt.toFixed(1)}d`} color={s.daysUntilHalt < 1.5 ? RED : s.daysUntilHalt < 3 ? ORANGE : GREEN} />
          {s.kind === "base_loss" && (
            <>
              <Stat label="Sorties" value={`+${s.reroutedSorties}`} color={NAVY} />
              <Stat label="Marginal" value={s.capacityMargin >= 0 ? `+${s.capacityMargin}` : `${s.capacityMargin}`} color={s.capacityMargin < 0 ? RED : GREEN} />
            </>
          )}
        </div>
        <ChevronRight size={11} className="transition-transform" style={{ color: SLATE, transform: expanded ? "rotate(90deg)" : "none" }} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            style={{ borderTop: `1px solid ${c}25` }}
          >
            <div className="px-3 py-3 space-y-2 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Stat label="Återstående DOS (worst)" value={`${s.worstFuelDOS.toFixed(1)}d`} color={s.worstFuelDOS < 1.5 ? RED : s.worstFuelDOS < 3 ? ORANGE : GREEN} large />
                {s.kind === "base_loss" && (
                  <>
                    <Stat label="MC kvar" value={`${s.mcRemaining}/${s.acAircraftRemaining}`} color={NAVY} large />
                    <Stat label="Kapacitet" value={`${s.reroutedCapacity}/d`} color={NAVY} large />
                    <Stat label="Marginal" value={s.capacityMargin >= 0 ? `+${s.capacityMargin}` : `${s.capacityMargin}`} color={s.capacityMargin < 0 ? RED : GREEN} large />
                  </>
                )}
              </div>
              {s.kind === "base_loss" && s.brokenMissions.length > 0 && (
                <div className="rounded p-2" style={{ background: `${RED}0e`, border: `1px solid ${RED}33` }}>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-wider mb-1" style={{ color: RED }}>OMÖJLIGA UPPDRAG</div>
                  <div className="text-[10px] font-mono" style={{ color: NAVY }}>{s.brokenMissions.join(" · ")}</div>
                </div>
              )}
              {s.remainingBases.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[8px] font-mono uppercase tracking-wider mr-1" style={{ color: SLATE }}>Återstående baser:</span>
                  {s.remainingBases.map((b) => (
                    <button
                      key={b}
                      onClick={(e) => { e.stopPropagation(); onClickBase(b); }}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-all hover:brightness-110"
                      style={{ background: "hsl(220 63% 18% / 0.07)", color: NAVY, border: `1px solid ${BORDER}` }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <div className="rounded px-2 py-1.5" style={{ background: "hsl(216 18% 97%)", border: `1px solid ${BORDER}` }}>
      <div className="text-[8px] font-mono uppercase tracking-wider" style={{ color: SLATE }}>{label}</div>
      <div className={`${large ? "text-[14px]" : "text-[11px]"} font-mono font-black leading-none mt-0.5`} style={{ color }}>{value}</div>
    </div>
  );
}

// ── Recommendation card ──────────────────────────────────────────────────────
function RecCard({ rec, dismissed, onApply, onDismiss }: {
  rec: LogisticsRecommendation;
  dismissed: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = prioMeta[rec.priority];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dismissed ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg overflow-hidden"
      style={{
        background: dismissed ? "hsl(216 18% 97%)" : "white",
        border: `1px solid ${dismissed ? BORDER : `${meta.color}38`}`,
        boxShadow: dismissed ? "none" : `0 0 0 1px ${meta.color}10`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors"
        style={{ background: dismissed ? undefined : `${meta.color}07` }}
      >
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-1 h-10 rounded-full" style={{ background: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}38` }}>
              {meta.label}
            </span>
            <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE }}>
              {catLabel[rec.category]}
            </span>
            <span className="text-[8px] font-mono ml-auto flex items-center gap-0.5" style={{ color: SLATE }}>
              <Sparkles size={9} />
              {Math.round(rec.confidence * 100)}%
            </span>
          </div>
          <div className="text-[11px] font-mono font-bold" style={{ color: NAVY }}>{rec.title}</div>
          <div className="flex items-center gap-1 mt-1.5">
            {rec.affected.map((b) => (
              <span key={b} className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(220 63% 18% / 0.07)", color: NAVY }}>
                {b}
              </span>
            ))}
            <ChevronRight size={11} className="ml-auto transition-transform" style={{ color: SLATE, transform: expanded ? "rotate(90deg)" : "none" }} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <div className="px-3 py-3 space-y-2.5" style={{ background: "hsl(216 18% 98%)" }}>
              <Field label="ANALYS" body={rec.rationale} />
              <Field label="REKOMMENDERAD ÅTGÄRD" body={rec.action} icon={Target} accent={meta.color} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="FÖRVÄNTAD NYTTA" body={rec.expectedBenefit} accent={GREEN} />
                <Field label="AVVÄGNING" body={rec.tradeoff} accent={ORANGE} />
              </div>
              {!dismissed && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onApply}
                    className="flex-1 py-1.5 px-3 rounded text-[10px] font-mono font-bold transition-all hover:brightness-110 active:scale-95"
                    style={{ background: meta.color, color: "white" }}
                  >
                    Acceptera & dispatcha
                  </button>
                  <button
                    onClick={onDismiss}
                    className="px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all hover:bg-gray-50"
                    style={{ background: "white", color: SLATE, border: `1px solid ${BORDER}` }}
                  >
                    Avvisa
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({ label, body, icon: Icon, accent }: { label: string; body: string; icon?: React.ElementType; accent?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={10} color={accent ?? SLATE} />}
        <span className="text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: accent ?? SLATE }}>{label}</span>
      </div>
      <div className="text-[10px] font-mono leading-snug" style={{ color: NAVY }}>{body}</div>
    </div>
  );
}

// ── ATO load row (feasibility table) ─────────────────────────────────────────
function AtoRow({ load, onClick }: { load: BaseAtoLoad; onClick: () => void }) {
  const c = atoStatusColor[load.status];
  const isProblem = load.status === "over_committed" || load.status === "infeasible";
  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: isProblem ? `${c}08` : undefined }}>
      <td className="px-3 py-2 align-middle">
        <button onClick={onClick} className="text-left">
          <div className="text-[12px] font-mono font-black" style={{ color: NAVY }}>{load.baseId}</div>
          <div className="text-[9px] font-mono" style={{ color: SLATE }}>{load.baseName}</div>
        </button>
      </td>
      <td className="px-2 py-2 text-center align-middle">
        <span className="text-[12px] font-mono font-black" style={{ color: NAVY }}>{load.committedSorties}</span>
        <div className="text-[8px] font-mono" style={{ color: SLATE }}>{load.pendingOrders}p · {load.dispatchedOrders}d</div>
      </td>
      <td className="px-2 py-2 text-center align-middle">
        <span className="text-[12px] font-mono font-black" style={{ color: NAVY }}>{load.sortieCeilingPerDay}</span>
        <div className="text-[8px] font-mono" style={{ color: SLATE }}>{load.bayTotal}× UH</div>
      </td>
      <td className="px-2 py-2 text-center align-middle">
        <span className="text-[12px] font-mono font-black" style={{ color: load.capacityMargin < 0 ? RED : GREEN }}>
          {load.capacityMargin >= 0 ? `+${load.capacityMargin}` : load.capacityMargin}
        </span>
      </td>
      <td className="px-2 py-2 text-center align-middle">
        <span className="text-[10px] font-mono font-bold" style={{ color: NAVY }}>{load.mcAvailable}/{load.acTotal}</span>
        <div className="text-[8px] font-mono" style={{ color: SLATE }}>{load.bayFree}/{load.bayTotal} fria</div>
      </td>
      <td className="px-2 py-2 align-middle">
        <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: `${c}1a`, color: c, border: `1px solid ${c}55` }}>
          {atoStatusLabel[load.status]}
        </span>
        {load.recommendation && (
          <div className="text-[9px] font-mono mt-1 leading-snug" style={{ color: isProblem ? c : SLATE }}>{load.recommendation}</div>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LogisticsAnalysis() {
  const { state, togglePause, setGameSpeed, resetGame } = useGame();
  const navigate = useNavigate();

  const snapshots = useMemo(
    () => state.bases.map((b) => snapshotBase(b, state.phase)),
    [state.bases, state.phase],
  );
  const atoLoads = useMemo(() => computeAtoLoad(state), [state]);
  const contingencies = useMemo(() => computeContingencies(state), [state]);
  const spof = useMemo(() => singlePointOfFailure(contingencies), [contingencies]);
  const critical = useMemo(() => findCriticalItems(state), [state]);
  const fuelForecast = useMemo(() => forecastFuelPerBase(state, 14), [state]);
  const resupply = useMemo(() => listResupply(state), [state]);
  const fleet = useMemo(() => fleetAllocationPerBase(state), [state]);
  const bestConvoy = useMemo(() => suggestBestConvoy(state), [state]);
  const allRecs = useMemo(() => generateLogisticsRecommendations(state), [state]);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | LogRecPriority>("all");

  const recs = filter === "all" ? allRecs : allRecs.filter((r) => r.priority === filter);
  const criticalRecs = allRecs.filter((r) => r.priority === "critical").length;
  const highRecs = allRecs.filter((r) => r.priority === "high").length;
  const criticalContingencies = contingencies.filter((c) => c.verdict === "critical").length;

  const reserveFloor = RESERVE_TARGET_PCT[state.phase];
  const fuelBurn = FUEL_BURN_PCT_PER_HOUR[state.phase];
  const ammoBurn = AMMO_BURN_PCT_PER_DAY[state.phase];

  const handleApply = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    setAppliedToast(id);
    setTimeout(() => setAppliedToast(null), 2400);
  };

  const goBase = (b: BaseType) => navigate(`/dashboard/${b}`);

  return (
    <div className="flex flex-col h-screen font-mono" style={{ background: "hsl(216 18% 97%)" }}>
      <TopBar state={state} onTogglePause={togglePause} onSetSpeed={setGameSpeed} onReset={resetGame} />

      {/* ── COMMAND STRIP ── */}
      <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0 border-b" style={{ background: NAVY, borderColor: "rgba(215,222,225,0.1)" }}>
        <div className="flex items-center gap-1.5 text-[10px] font-mono pr-3 border-r" style={{ color: "rgba(215,222,225,0.55)", borderColor: "rgba(215,222,225,0.1)" }}>
          <Brain className="h-3 w-3" style={{ color: GOLD }} />
          <span className="font-bold tracking-widest">LOGISTIK ANALYS</span>
          <span style={{ color: "rgba(215,222,225,0.3)" }}>· STRATEGISK ÖVERBLICK</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono pr-3 border-r" style={{ color: "rgba(215,222,225,0.55)", borderColor: "rgba(215,222,225,0.1)" }}>
          <Clock className="h-3 w-3" />
          DAG {state.day} · {String(state.hour).padStart(2, "0")}:{String(state.minute).padStart(2, "0")}Z
        </div>
        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded" style={{
          background: state.phase === "FRED" ? "rgba(34,160,90,0.18)" : state.phase === "KRIS" ? "rgba(217,171,58,0.18)" : "rgba(217,25,46,0.18)",
          color: state.phase === "FRED" ? "#22a05a" : state.phase === "KRIS" ? "#D7AB3A" : RED,
          border: `1px solid ${state.phase === "FRED" ? "rgba(34,160,90,0.35)" : state.phase === "KRIS" ? "rgba(217,171,58,0.35)" : "rgba(217,25,46,0.4)"}`,
        }}>
          FAS: {state.phase}
        </span>

        <div className="flex-1" />

        {criticalContingencies > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(217,25,46,0.12)", color: RED, border: "1px solid rgba(217,25,46,0.4)" }}>
            <Skull className="h-3 w-3 animate-pulse" />
            {criticalContingencies} KRITISKA SCENARIER
          </span>
        )}
        {criticalRecs > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(217,25,46,0.12)", color: RED, border: "1px solid rgba(217,25,46,0.4)" }}>
            <AlertOctagon className="h-3 w-3" />
            {criticalRecs} KRITISKA ÅTGÄRDER
          </span>
        )}
        {highRecs > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(217,151,42,0.12)", color: GOLD, border: "1px solid rgba(217,151,42,0.4)" }}>
            <AlertTriangle className="h-3 w-3" />
            {highRecs} HÖGPRIO
          </span>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 grid grid-cols-12 gap-5 max-w-[1800px] mx-auto">

          {/* ── LEFT COLUMN ── */}
          <div className="col-span-12 xl:col-span-8 space-y-5">

            {/* ── BASINVENTARIE (heat-map matrix) ── */}
            <Card title="Basinventarie — heat map" icon={Target} accent={NAVY} padded={false}
              right={
                <span className="text-[8px] font-mono" style={{ color: SLATE }}>
                  Klicka cell för dashboard ·
                  <span style={{ color: GREEN, marginLeft: 6 }}>≥80%</span>
                  <span style={{ color: GOLD, marginLeft: 6 }}>45–80%</span>
                  <span style={{ color: ORANGE, marginLeft: 6 }}>25–45%</span>
                  <span style={{ color: RED, marginLeft: 6 }}>&lt;25%</span>
                </span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "hsl(216 18% 98%)" }}>
                      <th className="px-3 py-2 text-left text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE }}>Bas</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}><Fuel size={10} className="inline mr-1" />Bränsle</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}><Zap size={10} className="inline mr-1" />Ammo</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}><Package size={10} className="inline mr-1" />Delar</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}><Users size={10} className="inline mr-1" />Personal</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}><Wrench size={10} className="inline mr-1" />UH</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 84 }}>MC-rate</th>
                      <th className="px-1 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 70 }}>DOS</th>
                      <th className="px-2 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 110 }}><Crosshair size={10} className="inline mr-1" />ATO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s) => {
                      const goto = () => goBase(s.baseId);
                      const load = atoLoads.find((l) => l.baseId === s.baseId);
                      const ac = load ? atoStatusColor[load.status] : SLATE;
                      return (
                        <tr key={s.baseId} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td className="px-3 py-2 align-middle">
                            <button onClick={goto} className="flex flex-col text-left">
                              <span className="text-[12px] font-mono font-black" style={{ color: NAVY }}>{s.baseId}</span>
                              <span className="text-[9px] font-mono" style={{ color: SLATE }}>{s.name}</span>
                            </button>
                          </td>
                          <td className="px-1"><MatrixCell pct={s.fuelPct} detail={`${s.fuelLiters.toLocaleString("sv-SE")} L`} onClick={goto} /></td>
                          <td className="px-1"><MatrixCell pct={s.ammoPct} detail={`${s.ammoCount}/${s.ammoMax}`} onClick={goto} /></td>
                          <td className="px-1"><MatrixCell pct={s.partsPct} detail={s.partsCriticalCount > 0 ? `⚠ ${s.partsCriticalCount} kritisk` : "ok"} onClick={goto} /></td>
                          <td className="px-1"><MatrixCell pct={s.personnelPct} detail={`${s.personnelAvail}/${s.personnelTotal}`} onClick={goto} /></td>
                          <td className="px-1"><MatrixCell pct={s.bayPct} detail={`${s.bayFree}/${s.bayTotal} fria`} onClick={goto} /></td>
                          <td className="px-1"><MatrixCell pct={s.mcRate} detail={`${s.mcCount}/${s.acTotal}`} onClick={goto} /></td>
                          <td className="px-1 text-center align-middle">
                            <span className="text-[11px] font-mono font-black" style={{ color: s.fuelDOS < 2 ? RED : s.fuelDOS < 5 ? GOLD : GREEN }}>
                              {s.fuelDOS.toFixed(1)}d
                            </span>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {load ? (
                              <button onClick={goto} className="text-left w-full">
                                <div className="text-[11px] font-mono font-black" style={{ color: ac }}>
                                  {load.committedSorties}/{load.sortieCeilingPerDay}
                                </div>
                                <span className="text-[8px] font-mono font-black px-1 py-0.5 rounded" style={{ background: `${ac}1a`, color: ac, border: `1px solid ${ac}55` }}>
                                  {atoStatusLabel[load.status]}
                                </span>
                              </button>
                            ) : <span className="text-[9px] font-mono" style={{ color: SLATE }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── ATO-FEASIBILITY ── */}
            <Card title="ATO-belastning vs. baskapacitet" icon={Layers} accent={ORANGE}
              right={
                <span className="text-[8px] font-mono" style={{ color: SLATE }}>
                  Sortie-tak ≈ UH-platser × kapacitet/dygn · turnaround inräknad
                </span>
              }
              padded={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "hsl(216 18% 98%)" }}>
                      <th className="px-3 py-2 text-left text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE }}>Bas</th>
                      <th className="px-2 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 90 }}>Sorties idag</th>
                      <th className="px-2 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 90 }}>Tak/dygn</th>
                      <th className="px-2 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 80 }}>Marginal</th>
                      <th className="px-2 py-2 text-center text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE, width: 110 }}>MC / Bays</th>
                      <th className="px-2 py-2 text-left text-[8px] font-mono font-bold uppercase tracking-wider" style={{ color: SLATE }}>Status / Rekommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atoLoads.map((load) => (
                      <AtoRow key={load.baseId} load={load} onClick={() => goBase(load.baseId)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── PER-BASE FUEL FORECAST ── */}
            <Card
              title={`Bränsleprognos per bas — 14 dagar (${state.phase})`}
              icon={TrendingDown}
              accent={ORANGE}
              right={
                <span className="text-[8px] font-mono" style={{ color: SLATE }}>
                  Burn −{(fuelBurn * 24).toFixed(1)}%/d · Doktrinsfloor {reserveFloor}%
                </span>
              }
            >
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={fuelForecast} margin={{ top: 6, right: 14, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke={SLATE} tick={{ fontSize: 9, fontFamily: "monospace" }} />
                    <YAxis domain={[0, 100]} stroke={SLATE} tick={{ fontSize: 9, fontFamily: "monospace" }} unit="%" />
                    <RechartsTooltip
                      contentStyle={{ background: "white", border: `1px solid ${BORDER}`, fontSize: 10, fontFamily: "monospace", borderRadius: 6 }}
                      labelStyle={{ color: NAVY, fontWeight: 700 }}
                    />
                    <ReferenceLine y={reserveFloor} stroke={RED} strokeDasharray="4 2" label={{ value: `Floor ${reserveFloor}%`, position: "right", fill: RED, fontSize: 9, fontFamily: "monospace" }} />
                    {state.bases.map((b) => (
                      <Line
                        key={b.id}
                        type="monotone"
                        dataKey={b.id}
                        name={b.id}
                        stroke={baseLineColor(b.id)}
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 px-2 flex-wrap">
                {state.bases.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5">
                    <div style={{ width: 14, height: 2, background: baseLineColor(b.id), borderRadius: 1 }} />
                    <span className="text-[9px] font-mono font-bold" style={{ color: NAVY }}>{b.id}</span>
                    <span className="text-[9px] font-mono" style={{ color: SLATE }}>{b.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 14, borderTop: `2px dashed ${RED}` }} />
                  <span className="text-[9px] font-mono" style={{ color: SLATE }}>Doktrinsfloor</span>
                </div>
              </div>
            </Card>

            {/* ── KONTINGENSANALYS (what-if scenarios — comes after current state) ── */}
            <Card title="Kontingensanalys · vad händer om" icon={ShieldAlert} accent={NAVY}
              right={
                <span className="text-[8px] font-mono" style={{ color: SLATE }}>
                  {contingencies.length} scenarier · {criticalContingencies} kritiska · klicka för detalj
                </span>
              }
            >
              {spof && spof.verdict !== "nominal" && (
                <div className="rounded-md p-2.5 mb-3 flex items-center gap-3"
                  style={{
                    background: `linear-gradient(90deg, ${verdictColor[spof.verdict]}10, transparent)`,
                    border: `1px solid ${verdictColor[spof.verdict]}33`,
                  }}>
                  <Skull size={14} color={verdictColor[spof.verdict]} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest" style={{ color: SLATE }}>Topprisk · </span>
                    <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{spof.label}</span>
                    <span className="text-[10px] font-mono ml-2" style={{ color: SLATE }}>— {spof.implication}</span>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {contingencies.map((c) => (
                  <ContingencyRow key={c.id} s={c} onClickBase={goBase} />
                ))}
              </div>
            </Card>

            {/* ── KRITISKA BRISTER ── */}
            <Card
              title={`Kritiska brister · ${critical.length} poster`}
              icon={AlertOctagon}
              accent={RED}
              right={<span className="text-[8px] font-mono" style={{ color: SLATE }}>Sorterad efter allvarsgrad</span>}
            >
              {critical.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded" style={{ background: "hsl(152 60% 32% / 0.08)", border: "1px solid hsl(152 60% 32% / 0.25)" }}>
                  <CheckCircle2 size={14} color={GREEN} />
                  <span className="text-[11px] font-mono font-bold" style={{ color: GREEN }}>NOMINELLT — inga resurser under tröskel</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {critical.map((c) => <CriticalRow key={c.id} item={c} onClick={() => goBase(c.baseId)} />)}
                </div>
              )}
            </Card>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="col-span-12 xl:col-span-4 space-y-5">

            {/* ── AI Recommendations ── */}
            <Card
              title="AI-Rekommendationer"
              icon={Brain}
              accent={GOLD}
              right={
                <div className="flex items-center gap-1">
                  {(["all", "critical", "high", "medium"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-all uppercase"
                      style={{
                        background: filter === f ? NAVY : "transparent",
                        color: filter === f ? "white" : SLATE,
                        border: `1px solid ${filter === f ? NAVY : BORDER}`,
                      }}
                    >
                      {f === "all" ? "Alla" : prioMeta[f].label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <Sparkles size={11} color={GOLD} />
                <span className="text-[9px] font-mono" style={{ color: SLATE }}>
                  {state.bases.length} baser · {allRecs.length} rekommendationer · {state.phase}-doktrin
                </span>
              </div>
              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                <AnimatePresence>
                  {recs.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-3 rounded" style={{ background: "hsl(152 60% 32% / 0.08)", border: "1px solid hsl(152 60% 32% / 0.25)" }}>
                      <CheckCircle2 size={14} color={GREEN} />
                      <span className="text-[10px] font-mono font-bold" style={{ color: GREEN }}>Inga rekommendationer på den prio-nivån</span>
                    </div>
                  ) : (
                    recs.map((r) => (
                      <RecCard
                        key={r.id}
                        rec={r}
                        dismissed={dismissed.has(r.id)}
                        onApply={() => handleApply(r.id)}
                        onDismiss={() => setDismissed((prev) => new Set(prev).add(r.id))}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </Card>

            {/* ── LOGISTIKFLOTTA per bas ── */}
            <Card title="Logistikflotta · per bas" icon={Truck} accent={PURPLE}>
              <div className="space-y-2">
                {fleet.map((f) => {
                  const total = f.bowsers + f.trucks + f.armored;
                  const dosCovered = fuelBurn > 0
                    ? (f.bowserCapacityLiters / 800) / (fuelBurn * 24)
                    : 0;
                  return (
                    <button key={f.baseId}
                      onClick={() => goBase(f.baseId)}
                      className="w-full text-left rounded-lg p-2.5 transition-all hover:brightness-95"
                      style={{ background: "hsl(216 18% 98%)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono font-black" style={{ color: NAVY }}>{f.baseId}</span>
                        <span className="text-[9px] font-mono" style={{ color: SLATE }}>{total} fordon</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                        <FleetMicro color={ORANGE} icon={Fuel} count={f.bowsers} label="Tankbil" />
                        <FleetMicro color={BLUE} icon={Truck} count={f.trucks} label="Logistik" />
                        <FleetMicro color={PURPLE} icon={Truck} count={f.armored} label="Pansrad" />
                      </div>
                      {f.bowsers > 0 ? (
                        <div className="text-[9px] font-mono leading-snug" style={{ color: SLATE }}>
                          <span style={{ color: NAVY, fontWeight: 700 }}>{f.bowserCapacityLiters.toLocaleString("sv-SE")} L</span> påfyllbart
                          {" · "}≈ <span style={{ color: NAVY, fontWeight: 700 }}>{dosCovered.toFixed(1)}d</span> DOS-täckning vid {state.phase}-burn
                        </div>
                      ) : (
                        <div className="text-[9px] font-mono" style={{ color: SLATE }}>Ingen tankbil tillgänglig</div>
                      )}
                    </button>
                  );
                })}
              </div>
              {bestConvoy && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                  <div className="text-[8px] font-mono uppercase tracking-wider mb-1.5" style={{ color: SLATE }}>
                    Skickbar fyllnad nu
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: `${GOLD}0e`, border: `1px solid ${GOLD}40` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{bestConvoy.donor}</span>
                      <ArrowRight size={11} color={GOLD} />
                      <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{bestConvoy.acceptor}</span>
                    </div>
                    <div className="text-[9px] font-mono leading-snug" style={{ color: SLATE }}>
                      {bestConvoy.bowsersAvailable}× tankbil · <span style={{ color: NAVY, fontWeight: 700 }}>{bestConvoy.liters.toLocaleString("sv-SE")} L</span>
                      {" · vinst ≈ "}<span style={{ color: GREEN, fontWeight: 700 }}>+{bestConvoy.dosGainDays.toFixed(1)}d</span>
                      {" DOS hos "}{bestConvoy.acceptor}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* ── Resupply pipeline ── */}
            <Card title={`Påfyllningspipeline · ${resupply.length}`} icon={Truck} accent={BLUE}>
              {resupply.length === 0 ? (
                <div className="text-[10px] font-mono px-1 py-2" style={{ color: SLATE }}>Inga aktiva beställningar.</div>
              ) : (
                <div className="space-y-1.5">
                  {resupply.map((o) => (
                    <div key={`${o.baseId}-${o.partId}`} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "hsl(216 18% 98%)", border: `1px solid ${BORDER}` }}>
                      <div className="flex-shrink-0 w-1 h-7 rounded-full" style={{ background: BLUE }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono font-bold" style={{ color: NAVY }}>
                          {o.partName} <span style={{ color: SLATE, fontWeight: 400 }}>×{o.quantity}</span>
                        </div>
                        <div className="text-[8px] font-mono" style={{ color: SLATE }}>
                          {o.source === "central_stock" ? "RESMAT" : o.source === "mro" ? "MRO" : "Basförråd"} → {o.baseId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono font-black" style={{ color: NAVY }}>D+{o.leadTimeDays}</div>
                        <div className="text-[8px] font-mono" style={{ color: SLATE }}>ETA dag {o.etaDay}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ── Doktrin (reference, bottom) ── */}
            <Card title={`Doktrin · ${state.phase}`} icon={Radio} accent={NAVY}>
              <DoctrineRow label="Bränsle-burn" value={`${(fuelBurn * 24).toFixed(1)} %/dag`} accent={ORANGE} />
              <DoctrineRow label="Ammo-burn" value={`${ammoBurn} %/dag`} accent={BLUE} />
              <DoctrineRow label="Min reserv" value={`≥${reserveFloor}% bränsle`} accent={NAVY} />
              <DoctrineRow label="LRU-attrition" value={state.phase === "KRIG" ? "2.2 LRU/dag" : state.phase === "KRIS" ? "1.1 LRU/dag" : "0.4 LRU/dag"} accent={PURPLE} />
              <div className="mt-2 pt-2 text-[9px] font-mono leading-relaxed" style={{ color: SLATE, borderTop: `1px solid ${BORDER}` }}>
                Burn-rates och tröskelvärden härleds från {state.phase}-doktrin. Justeras vid fas-eskalering.
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {appliedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
            style={{ background: NAVY, border: `1px solid ${GOLD}`, color: "white" }}
          >
            <CheckCircle2 size={14} color={GREEN} />
            <span className="text-[11px] font-mono font-bold">Rekommendation dispatchad till logistikenhet</span>
            <ArrowRight size={12} color={GOLD} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────
function CriticalRow({ item, onClick }: { item: CriticalItem; onClick: () => void }) {
  const c = sevColor[item.severity];
  const catIcon = item.category === "fuel" ? Fuel : item.category === "ammo" ? Zap : item.category === "parts" ? Package : item.category === "personnel" ? Users : Wrench;
  const Icon = catIcon;
  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded transition-all hover:brightness-95"
      style={{ background: `${c}0e`, border: `1px solid ${c}30` }}>
      <Icon size={12} color={c} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold" style={{ color: NAVY }}>{item.label}</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "hsl(220 63% 18% / 0.07)", color: NAVY }}>{item.baseId}</span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: SLATE }}>{item.detail}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[12px] font-mono font-black" style={{ color: c }}>{item.pct}%</div>
        {item.daysOfSupply !== undefined && Number.isFinite(item.daysOfSupply) && (
          <div className="text-[8px] font-mono" style={{ color: SLATE }}>{item.daysOfSupply.toFixed(1)}d DOS</div>
        )}
      </div>
    </button>
  );
}

function FleetMicro({ color, icon: Icon, count, label }: { color: string; icon: React.ElementType; count: number; label: string }) {
  return (
    <div className="rounded p-1.5 text-center" style={{ background: `${color}10`, border: `1px solid ${color}33` }}>
      <Icon size={11} color={color} className="mx-auto mb-0.5" />
      <div className="text-[14px] font-mono font-black leading-none" style={{ color }}>{count}</div>
      <div className="text-[7px] font-mono uppercase tracking-wider mt-0.5" style={{ color: SLATE }}>{label}</div>
    </div>
  );
}

function DoctrineRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: "hsl(216 18% 95%)" }}>
      <span className="text-[10px] font-mono" style={{ color: SLATE }}>{label}</span>
      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: `${accent}10`, color: accent }}>{value}</span>
    </div>
  );
}
