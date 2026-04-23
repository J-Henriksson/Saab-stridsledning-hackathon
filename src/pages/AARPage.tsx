import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGame } from "../context/GameContext";
import type { AARActionType, RiskLevel } from "../types/game";

// ─── Color helpers ────────────────────────────────────────────────────────────

const DEEP_BLUE  = "#0C234C";
const SILVER     = "#D7DEE1";
const RED        = "#D9192E";
const AMBER      = "#D7AB3A";

function borderColorForRisk(risk?: RiskLevel): string {
  if (risk === "catastrophic" || risk === "high") return RED;
  if (risk === "medium") return "#f59e0b";
  return "#22c55e";
}

function dotColorForRisk(risk?: RiskLevel): string {
  if (risk === "catastrophic" || risk === "high") return RED;
  if (risk === "medium") return "#f59e0b";
  return "#22c55e";
}

const ACTION_BADGES: Record<AARActionType, { label: string; color: string; bg: string }> = {
  MISSION_DISPATCH:  { label: "UPPDRAG",    color: "#60a5fa", bg: "rgba(59,130,246,0.18)" },
  MAINTENANCE_START: { label: "UNDERHÅLL",  color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
  MAINTENANCE_PAUSE: { label: "PAUSE",      color: AMBER,     bg: "rgba(215,171,58,0.18)" },
  UTFALL_APPLIED:    { label: "UTFALL",     color: "#fb923c", bg: "rgba(249,115,22,0.18)" },
  FAULT_NMC:         { label: "NMC",        color: RED,       bg: "rgba(217,25,46,0.18)"  },
  LANDING_RECEIVED:  { label: "LANDNING",   color: "#22c55e", bg: "rgba(34,197,94,0.18)"  },
  SPARE_PART_USED:   { label: "RESERVDEL",  color: "#22d3ee", bg: "rgba(34,211,238,0.18)" },
  HANGAR_CONFIRM:    { label: "HANGAR",     color: "#a78bfa", bg: "rgba(139,92,246,0.18)" },
};

const RISK_FILTER_MAP: Record<string, RiskLevel> = {
  "Låg":          "low",
  "Medium":       "medium",
  "Hög":          "high",
  "Katastrofalt": "catastrophic",
};

const TYPE_FILTER_MAP: Record<string, AARActionType> = {
  "Uppdrag":   "MISSION_DISPATCH",
  "Underhåll": "MAINTENANCE_START",
  "Pause":     "MAINTENANCE_PAUSE",
  "Utfall":    "UTFALL_APPLIED",
  "NMC":       "FAULT_NMC",
  "Landning":  "LANDING_RECEIVED",
  "Reservdel": "SPARE_PART_USED",
};

// ─── Time range helpers ───────────────────────────────────────────────────────

function parseEventDay(timestamp: string): number {
  const match = timestamp.match(/^Dag (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function isWithinTimeRange(timestamp: string, range: "all" | "today" | "yesterday" | "last7" | "last30" | "custom", custom: { from?: Date; to?: Date }, currentDay: number): boolean {
  if (range === "all") return true;
  const eventDay = parseEventDay(timestamp);
  if (range === "today") return eventDay === currentDay;
  if (range === "yesterday") return eventDay === currentDay - 1;
  if (range === "last7") return eventDay >= currentDay - 6 && eventDay <= currentDay;
  if (range === "last30") return eventDay >= currentDay - 29 && eventDay <= currentDay;
  if (range === "custom" && custom.from && custom.to) {
    return eventDay >= custom.from.getDate() && eventDay <= custom.to.getDate();
  }
  return true;
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all"
      style={{
        background: active ? AMBER : "rgba(255,255,255,0.05)",
        color:      active ? DEEP_BLUE : SILVER,
        borderColor: active ? AMBER : "rgba(215,222,225,0.15)",
      }}
    >
      {label}
    </button>
  );
}

// ─── HealthBar ────────────────────────────────────────────────────────────────

function HealthBar({ value }: { value: number }) {
  const color = value < 30 ? RED : value < 60 ? "#f59e0b" : "#22c55e";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(215,222,225,0.45)" }}>
          Hälsa vid beslut
        </span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: ReturnType<typeof useGame>["state"]["events"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = borderColorForRisk(event.riskLevel);
  const isCatastrophic = event.riskLevel === "catastrophic";
  const badge = event.actionType ? ACTION_BADGES[event.actionType] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl overflow-hidden cursor-pointer transition-colors"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        background: expanded ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
      }}
      onClick={() => setExpanded((v) => !v)}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="p-4 space-y-2">
        {/* Catastrophic badge */}
        {isCatastrophic && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-black"
            style={{ background: "rgba(217,25,46,0.22)", color: RED, border: `1px solid ${RED}` }}
          >
            KATASTROFALT FEL
          </motion.div>
        )}

        {/* Row 1 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.45)", fontFamily: "monospace" }}>
            {event.timestamp}
          </span>
          {event.aircraftId && (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
              style={{ background: DEEP_BLUE, color: AMBER, border: `1px solid rgba(215,171,58,0.3)` }}>
              {event.aircraftId}
            </span>
          )}
          {badge && (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
              style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Row 2 — message */}
        <p className="text-[11px] font-mono leading-relaxed" style={{ color: SILVER }}>
          {event.message}
        </p>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-2 border-t space-y-3" style={{ borderColor: "rgba(215,222,225,0.08)" }}>
                {event.healthAtDecision != null && (
                  <HealthBar value={event.healthAtDecision} />
                )}
                {event.resourceImpact && (
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest"
                      style={{ color: "rgba(215,222,225,0.45)" }}>Resursåtgång — </span>
                    <span className="text-[10px] font-mono" style={{ color: SILVER }}>{event.resourceImpact}</span>
                  </div>
                )}
                {event.decisionContext && (
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest"
                      style={{ color: "rgba(215,222,225,0.45)" }}>Beslutskontext — </span>
                    <span className="text-[10px] font-mono italic" style={{ color: "rgba(215,222,225,0.75)" }}>{event.decisionContext}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── GeminiIcon ───────────────────────────────────────────────────────────────

function GeminiIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gemini-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      {/* Gemini star shape: 4-pointed star */}
      <path
        d="M14 2 C14 2 15.6 9.4 20 14 C15.6 18.6 14 26 14 26 C14 26 12.4 18.6 8 14 C12.4 9.4 14 2 14 2Z"
        fill="url(#gemini-grad)"
      />
    </svg>
  );
}

// ─── AIRecommendations ────────────────────────────────────────────────────────

function AIRecommendations({
  riskScore,
  catastrophicCount,
  pauseCount,
  missionEvents,
  total,
  highCount,
  mediumCount,
  lowCount,
  maintEvents,
  otherEvents,
  profile,
}: {
  riskScore: number;
  catastrophicCount: number;
  pauseCount: number;
  missionEvents: number;
  total: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  maintEvents: number;
  otherEvents: number;
  profile: string;
}) {
  type Priority = "KRITISK" | "HÖG" | "MEDIUM" | "LÅG";
  type Category = "Säkerhet" | "Underhåll" | "Operativ" | "Planering" | "Resurs";

  const recs: { priority: Priority; category: Category; title: string; text: string }[] = [];

  if (catastrophicCount > 0) {
    recs.push({
      priority: "KRITISK",
      category: "Säkerhet",
      title: "Katastrofala händelser kräver omedelbar åtgärd",
      text: `${catastrophicCount} katastrofal${catastrophicCount > 1 ? "a händelser" : " händelse"} registrerades. Genomför omedelbar orsaksanalys och stärk varningssystemets svarströsklar för att förhindra upprepning.`,
    });
  }

  if (riskScore > 1.5) {
    recs.push({
      priority: "HÖG",
      category: "Säkerhet",
      title: "Aggressiv riskprofil — förstärk säkerhetsmarginaler",
      text: `Operatörsprofil klassificeras som "${profile}". Högriskbeslut förekommer systematiskt. Rekommenderar kortare underhållsintervall, obligatoriska pausperioder och tydligare eskaleringsgränser.`,
    });
  }

  if (pauseCount > 1) {
    recs.push({
      priority: pauseCount > 3 ? "HÖG" : "MEDIUM",
      category: "Resurs",
      title: "Upprepade underhållsavbrott tyder på resursbrist",
      text: `Underhåll avbröts ${pauseCount} gånger under perioden. Detta indikerar otillräcklig personalkapacitet eller reservdelslager. Öka underhållsbuffert och planera schemalagda underhållsfönster proaktivt.`,
    });
  }

  if (total > 0 && missionEvents / total > 0.55) {
    const pct = Math.round((missionEvents / total) * 100);
    recs.push({
      priority: "MEDIUM",
      category: "Operativ",
      title: "Uppdragsintensitet överstiger rekommenderad nivå",
      text: `${pct}% av alla händelser är uppdragsrelaterade. Hög driftstakt accelererar systemförslitning. Balansera insatskvoten mot underhållskapaciteten för att förlänga systemlivslängden.`,
    });
  }

  if (highCount > mediumCount && highCount > 2) {
    recs.push({
      priority: "MEDIUM",
      category: "Planering",
      title: "Högriskbeslut dominerar — inför operativa gränsvärden",
      text: `${highCount} högriskbeslut mot ${mediumCount} mediumriskhändelser. Mönstret tyder på systematisk underrapportering av risknivå eller otillräckliga operativa stoppregler. Revidera beslutsprotokoll.`,
    });
  }

  if (total > 0 && maintEvents / total < 0.15 && total > 5) {
    recs.push({
      priority: "MEDIUM",
      category: "Underhåll",
      title: "Underhållsfrekvens under rekommenderad miniminivå",
      text: `Underhållshändelser utgör ${Math.round((maintEvents / total) * 100)}% av aktiviteterna. Systemets livslängd och driftsäkerhet kräver minst 20–25% underhållsaktivitet i förhållande till total händelsevolym.`,
    });
  }

  if (lowCount / Math.max(total, 1) > 0.7) {
    recs.push({
      priority: "LÅG",
      category: "Operativ",
      title: "God riskdisciplin — upprätthåll nuvarande protokoll",
      text: `${Math.round((lowCount / total) * 100)}% av besluten klassificeras som lågrisk. Operatören visar konsekvent säkerhetsfokus. Dokumentera nuvarande beslutsrutiner som referens för träning och standardisering.`,
    });
  }

  recs.push({
    priority: "LÅG",
    category: "Planering",
    title: "Utöka datainsamling för prediktiv analys",
    text: "Fortsätt logga händelser konsekvent. Med ≥50 händelser aktiveras prediktiva underhållsmodeller som kan förutse NMC-risk 6–12 timmar i förväg med upp till 78% precision.",
  });

  const priorityColor: Record<Priority, string> = {
    KRITISK: "#FF2E47",
    HÖG: "#FF5C47",
    MEDIUM: "#FFCA2D",
    LÅG: "rgba(140,195,255,0.9)",
  };
  const priorityBg: Record<Priority, string> = {
    KRITISK: "rgba(255,46,71,0.28)",
    HÖG: "rgba(255,92,71,0.22)",
    MEDIUM: "rgba(255,202,45,0.22)",
    LÅG: "rgba(100,170,255,0.15)",
  };
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: DEEP_BLUE,
        border: `1px solid rgba(215,171,58,0.5)`,
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          background: "rgba(215,171,58,0.18)",
          borderBottom: `1px solid rgba(215,171,58,0.4)`,
        }}
      >
        <div className="flex items-center gap-3">
          <GeminiIcon size={18} />
          <span className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: AMBER }}>
            Gemini
          </span>
          <div className="w-px h-3.5" style={{ background: "rgba(215,171,58,0.3)" }} />
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(215,222,225,0.75)" }}>
            AI-Rekommendationer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: AMBER }}
          />
          <span className="text-[9px] font-mono" style={{ color: "rgba(215,171,58,0.9)" }}>
            Analyserar {total} händelser
          </span>
        </div>
      </div>

      {/* Recommendations grid */}
      <div className="p-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {recs.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, ease: "easeOut" }}
            className="rounded-lg p-3 space-y-2 flex flex-col"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: `1px solid rgba(215,171,58,0.28)`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[8px] font-mono font-black px-2 py-0.5 rounded"
                style={{
                  background: priorityBg[rec.priority],
                  color: priorityColor[rec.priority],
                  border: `1px solid ${priorityColor[rec.priority]}44`,
                }}
              >
                {rec.priority}
              </span>
              <span
                className="text-[8px] font-mono px-2 py-0.5 rounded"
                style={{ background: "rgba(215,171,58,0.2)", color: "rgba(215,171,58,0.95)" }}
              >
                {rec.category}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold leading-tight" style={{ color: SILVER }}>
              {rec.title}
            </div>
            <p className="text-[9px] font-mono leading-relaxed flex-1" style={{ color: "rgba(215,222,225,0.78)" }}>
              {rec.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2 flex items-center gap-2"
        style={{ borderTop: `1px solid rgba(215,171,58,0.25)` }}
      >
        <GeminiIcon size={10} />
        <span className="text-[8px] font-mono" style={{ color: "rgba(215,222,225,0.5)" }}>
          Genererat av Gemini · Baserat på loggad händelsedata · Inte ett operativt beslutsstöd
        </span>
      </div>
    </div>
  );
}

// ─── BarRow ───────────────────────────────────────────────────────────────────

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.6)" }}>{label}</span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main AARPage ─────────────────────────────────────────────────────────────

export default function AARPage({ embedded = false }: { embedded?: boolean }) {
  const { state } = useGame();
  const navigate  = useNavigate();

  const [acFilter,   setAcFilter]   = useState<string>("Alla");
  const [riskFilter, setRiskFilter] = useState<string>("Alla");
  const [typeFilter, setTypeFilter] = useState<string>("Alla");
  const [timeRange,  setTimeRange]  = useState<"all" | "today" | "yesterday" | "last7" | "last30" | "custom">("today");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  // Unique aircraft IDs
  const uniqueAcIds = Array.from(
    new Set(state.events.map((e) => e.aircraftId).filter(Boolean) as string[])
  ).sort();

  // Filter
  const filteredEvents = state.events.filter((e) => {
    if (acFilter !== "Alla" && e.aircraftId !== acFilter) return false;
    if (riskFilter !== "Alla") {
      if (e.riskLevel !== RISK_FILTER_MAP[riskFilter]) return false;
    }
    if (typeFilter !== "Alla") {
      if (e.actionType !== TYPE_FILTER_MAP[typeFilter]) return false;
    }
    return true;
  }).reverse(); // newest first

  // Summary stats (filtered by time range)
  const timeFiltered = state.events.filter((e) => isWithinTimeRange(e.timestamp, timeRange, customRange, state.day));
  const total         = timeFiltered.length;
  const missionEvents = timeFiltered.filter((e) => e.actionType === "MISSION_DISPATCH").length;
  const maintEvents   = timeFiltered.filter((e) =>
    e.actionType === "MAINTENANCE_START" || e.actionType === "HANGAR_CONFIRM"
  ).length;
  const otherEvents   = total - missionEvents - maintEvents;

  const lowCount          = timeFiltered.filter((e) => e.riskLevel === "low").length;
  const mediumCount       = timeFiltered.filter((e) => e.riskLevel === "medium").length;
  const highCount         = timeFiltered.filter((e) => e.riskLevel === "high").length;
  const catastrophicCount = timeFiltered.filter((e) => e.riskLevel === "catastrophic").length;

  const riskScore = (mediumCount + highCount * 2 + catastrophicCount * 4) / Math.max(total, 1);
  const profile =
    riskScore > 1.5 ? "Aggressiv / Riskvillig"
    : riskScore > 0.5 ? "Balanserad"
    : "Konservativ / Säkerhetsfokuserad";

  const pauseCount = state.events.filter((e) => e.actionType === "MAINTENANCE_PAUSE").length;

  const currentBase = state.bases[0];
  const headerTimestamp = `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00Z`;

  return (
    <div className={embedded ? "font-mono flex flex-col h-fit" : "min-h-screen font-mono flex flex-col"} style={{ background: embedded ? "hsl(0 0% 100%)" : DEEP_BLUE, color: embedded ? DEEP_BLUE : SILVER }}>

      {/* ── HEADER — only in standalone mode ── */}
      {!embedded && (
        <header className="px-6 py-5 border-b" style={{ borderColor: "rgba(215,222,225,0.1)", background: "rgba(0,0,0,0.25)" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: "rgba(215,222,225,0.4)" }}>
                Historik — Händelselog
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: SILVER }}>
                HISTORIK — UPPDRAGSANALYS
              </h1>
              <div className="text-[11px] font-mono mt-1" style={{ color: "rgba(215,222,225,0.5)" }}>
                {currentBase?.name ?? "MOB"} · {headerTimestamp}
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="text-[10px] font-mono font-bold px-4 py-2 rounded-lg border transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(215,222,225,0.18)", color: SILVER }}
            >
              TILLBAKA →
            </button>
          </div>
        </header>
      )}

      {/* ── FILTER BAR ── */}
      <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(215,222,225,0.08)", background: embedded ? "rgba(12,35,76,0.92)" : "rgba(0,0,0,0.15)" }}>
        <div className="max-w-7xl mx-auto space-y-2.5">
          {/* Row 1 — Aircraft filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest mr-1" style={{ color: "rgba(215,222,225,0.35)" }}>Plan:</span>
            <FilterPill label="Alla" active={acFilter === "Alla"} onClick={() => setAcFilter("Alla")} />
            {uniqueAcIds.map((id) => (
              <FilterPill key={id} label={id} active={acFilter === id} onClick={() => setAcFilter(id)} />
            ))}
          </div>

          {/* Row 2 — Risk filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest mr-1" style={{ color: "rgba(215,222,225,0.35)" }}>Risk:</span>
            {["Alla", "Låg", "Medium", "Hög", "Katastrofalt"].map((r) => (
              <FilterPill key={r} label={r} active={riskFilter === r} onClick={() => setRiskFilter(r)} />
            ))}
          </div>

          {/* Row 3 — Type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest mr-1" style={{ color: "rgba(215,222,225,0.35)" }}>Typ:</span>
            {["Alla", "Uppdrag", "Underhåll", "Pause", "Utfall", "NMC", "Landning", "Reservdel"].map((t) => (
              <FilterPill key={t} label={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── GEMINI AI RECOMMENDATIONS ── */}
      <div className="px-6 py-4 max-w-7xl mx-auto w-full">
        <AIRecommendations
          riskScore={riskScore}
          catastrophicCount={catastrophicCount}
          pauseCount={pauseCount}
          missionEvents={missionEvents}
          total={total}
          highCount={highCount}
          mediumCount={mediumCount}
          lowCount={lowCount}
          maintEvents={maintEvents}
          otherEvents={otherEvents}
          profile={profile}
        />
      </div>

      {/* ── BODY — 60/40 split ── */}
      <div className="flex max-w-7xl mx-auto w-full px-6 py-6 gap-6">

        {/* ── LEFT — Timeline (60%) ── */}
        <div className="w-3/5 space-y-3 pr-2 rounded-xl p-4" style={{ alignSelf: "flex-start", background: embedded ? "rgba(12,35,76,0.92)" : undefined }}>
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </AnimatePresence>
          {filteredEvents.length === 0 && (
            <div className="text-center py-16 text-[11px] font-mono" style={{ color: "rgba(215,222,225,0.3)" }}>
              Inga händelser matchar valt filter.
            </div>
          )}

          {/* Event count */}
          <div className="text-center pt-4 text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.3)" }}>
            Visar {filteredEvents.length} av {total} händelser
          </div>
        </div>

        {/* ── RIGHT — Summary (40%) — sticky ── */}
        <div className="w-2/5 space-y-4 rounded-xl p-4" style={{ alignSelf: "flex-start", position: "sticky", top: 16, background: embedded ? "rgba(12,35,76,0.92)" : undefined }}>

        {/* ── TIME RANGE FILTER ── */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "rgba(215,222,225,0.45)" }}>
              TIDSRANGE
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "today", "yesterday", "last7", "last30"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setTimeRange(r); setCustomRange({}); }}
                  className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    background: timeRange === r ? AMBER : "rgba(255,255,255,0.05)",
                    color: timeRange === r ? DEEP_BLUE : SILVER,
                    borderColor: timeRange === r ? AMBER : "rgba(215,222,225,0.15)",
                  }}
                >
                  {r === "all" ? "Alla" : r === "today" ? "Idag" : r === "yesterday" ? "Igår" : r === "last7" ? "7 dgr" : "30 dgr"}
                </button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      background: timeRange === "custom" ? AMBER : "rgba(255,255,255,0.05)",
                      color: timeRange === "custom" ? DEEP_BLUE : SILVER,
                      borderColor: timeRange === "custom" ? AMBER : "rgba(215,222,225,0.15)",
                    }}
                  >
                    Datum
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0" style={{ background: DEEP_BLUE, border: `1px solid rgba(215,222,225,0.1)` }}>
                  <Calendar
                    mode="range"
                    selected={{ from: customRange.from, to: customRange.to }}
                    onSelect={(range) => {
                      setCustomRange({ from: range?.from, to: range?.to });
                      setTimeRange("custom");
                    }}
                    numberOfMonths={1}
                    disabled={{ before: new Date(0) }}
                    classNames={{
                      root: "bg-[#0C234C] text-[#D7DEE1]",
                      day_selected: "bg-[#D7AB3A] text-[#0C234C] hover:bg-[#D7AB3A] hover:text-[#0C234C] focus:bg-[#D7AB3A] focus:text-[#0C234C]",
                      day_today: "bg-[#D7AB3A] text-[#0C234C] font-bold",
                      day: "text-[#D7DEE1]",
                      head_cell: "text-[#D7AB3A]",
                      caption: "text-[#D7DEE1]",
                      nav_button: "text-[#D7DEE1]",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {timeRange === "custom" && customRange.from && customRange.to && (
              <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.45)" }}>
                Dag {customRange.from.getDate()} – Dag {customRange.to.getDate()}
              </div>
            )}
          </div>

          {/* 1. NYTTJANDEGRAD */}
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "rgba(215,222,225,0.45)" }}>
              NYTTJANDEGRAD
            </div>
            <BarRow label="I luften"   value={missionEvents} max={total} color="#3b82f6" />
            <BarRow label="Underhåll"  value={maintEvents}   max={total} color={AMBER}   />
            <BarRow label="Övrigt"     value={otherEvents}   max={total} color="rgba(215,222,225,0.4)" />
          </div>

          {/* 2. RISKPROFIL */}
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "rgba(215,222,225,0.45)" }}>
              RISKPROFIL
            </div>
            <div className="text-[12px] font-mono font-bold" style={{
              color: riskScore > 1.5 ? RED : riskScore > 0.5 ? AMBER : "#22c55e"
            }}>
              {profile}
            </div>
            <div className="space-y-2">
              {[
                { label: "Låg risk",          count: lowCount,          color: "#22c55e" },
                { label: "Medium risk",        count: mediumCount,       color: "#f59e0b" },
                { label: "Hög risk",           count: highCount,         color: RED       },
                { label: "Katastrofalt",        count: catastrophicCount, color: "#9f1239" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.6)" }}>{label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. RESURSEFFEKTIVITET */}
          <div className="rounded-xl p-5 space-y-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
            <div className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "rgba(215,222,225,0.45)" }}>
              RESURSEFFEKTIVITET
            </div>
            <div className="space-y-2">
              {pauseCount > 0 && (
                <div className="text-[10px] font-mono flex items-start gap-2" style={{ color: AMBER }}>
                  <span className="flex-shrink-0">•</span>
                  Underhåll avbröts {pauseCount} {pauseCount === 1 ? "gång" : "gånger"} — kapacitetsbrist
                </div>
              )}
              {catastrophicCount > 0 && (
                <div className="text-[10px] font-mono flex items-start gap-2" style={{ color: RED }}>
                  <span className="flex-shrink-0">•</span>
                  {catastrophicCount} katastrofala {catastrophicCount === 1 ? "händelse" : "händelser"} — varningar ignorerades
                </div>
              )}
              {pauseCount === 0 && catastrophicCount === 0 && (
                <div className="text-[10px] font-mono flex items-start gap-2" style={{ color: "#22c55e" }}>
                  <span className="flex-shrink-0">•</span>
                  Effektiv resursanvändning — inga kritiska incidenter
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
