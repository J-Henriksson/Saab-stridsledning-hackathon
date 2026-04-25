import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Info, AlertOctagon,
  ChevronRight, ChevronLeft, Radio, Globe, Building2, Crosshair,
  ChevronDown, X,
} from "lucide-react";
import type { GameEvent } from "@/types/game";
import { useBaseFilter } from "@/context/BaseFilterContext";

// ── types ────────────────────────────────────────────────────────────────────

type EventTypeFilter = "all" | "critical" | "warning" | "info" | "success";
type ScopeFilter     = "all" | "global" | "base" | "entity";

function eventScope(e: GameEvent): "global" | "base" | "entity" {
  if (e.unitId) return "entity";
  if (e.base)   return "base";
  return "global";
}

// ── visual config ─────────────────────────────────────────────────────────────

const TYPE_META: Record<string, {
  icon: React.ElementType;
  label: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  critical: {
    icon: AlertOctagon,
    label: "KRITISK",
    textColor: "text-red-400",
    borderColor: "border-l-red-500",
    bgColor: "bg-red-500/5",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "VARNING",
    textColor: "text-amber-400",
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-500/5",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
  },
  info: {
    icon: Info,
    label: "INFO",
    textColor: "text-blue-400",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-500/5",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
  },
  success: {
    icon: CheckCircle2,
    label: "OK",
    textColor: "text-emerald-400",
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-500/5",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
  },
};

const SCOPE_META = {
  global: { icon: Globe,      label: "GLOBAL", color: "text-cyan-400",   bg: "bg-cyan-500/15",    border: "border-cyan-500/30"   },
  base:   { icon: Building2,  label: "BAS",    color: "text-violet-400", bg: "bg-violet-500/15",  border: "border-violet-500/30" },
  entity: { icon: Crosshair,  label: "ENHET",  color: "text-orange-400", bg: "bg-orange-500/15",  border: "border-orange-500/30" },
};

const TYPE_TABS: { key: EventTypeFilter; label: string; color: string }[] = [
  { key: "all",      label: "ALLA",  color: "text-foreground" },
  { key: "critical", label: "KRIT",  color: "text-red-400"    },
  { key: "warning",  label: "VARN",  color: "text-amber-400"  },
  { key: "info",     label: "INFO",  color: "text-blue-400"   },
  { key: "success",  label: "OK",    color: "text-emerald-400"},
];

const SCOPE_TABS: { key: ScopeFilter; label: string }[] = [
  { key: "all",    label: "ALLA"   },
  { key: "global", label: "GLOBAL" },
  { key: "base",   label: "BAS"    },
  { key: "entity", label: "ENHET"  },
];

// ── base picker ───────────────────────────────────────────────────────────────

interface BaseOption { id: string; name: string }

function BasePicker({ bases, events }: { bases: BaseOption[]; events: GameEvent[] }) {
  const { focusedBaseId, setFocusedBase, clearFilter } = useBaseFilter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = bases.find((b) => b.id === focusedBaseId);
  const countFor = (id: string | null) =>
    id ? events.filter((e) => e.base === id).length : events.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-border bg-background hover:border-primary/40 transition-colors text-[10px] font-mono"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className={`truncate font-bold ${selected ? "text-blue-300" : "text-muted-foreground"}`}>
            {selected ? selected.name : "ALLA BASER"}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-muted-foreground/60">{countFor(focusedBaseId ?? null)}</span>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 rounded border border-border bg-card shadow-xl overflow-hidden"
          >
            {/* All bases option */}
            <button
              onClick={() => { clearFilter(); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-mono hover:bg-muted/40 transition-colors ${!focusedBaseId ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <span className="font-bold">ALLA BASER</span>
              <span className="text-muted-foreground/60">{events.length}</span>
            </button>
            <div className="border-t border-border/50" />
            {bases.map((b) => {
              const cnt = events.filter((e) => e.base === b.id).length;
              const isActive = focusedBaseId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => { setFocusedBase(b.id as any); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-mono hover:bg-muted/40 transition-colors ${isActive ? "bg-blue-500/10 text-blue-300" : "text-foreground"}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground/50 font-mono text-[8px] flex-shrink-0">{b.id}</span>
                    <span className="truncate font-bold">{b.name}</span>
                  </div>
                  <span className={cnt > 0 ? "text-foreground/70" : "text-muted-foreground/40"}>{cnt}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  events: GameEvent[];
  allEvents: GameEvent[];
  bases: BaseOption[];
  onEventClick?: (event: GameEvent) => void;
}

export function EventsSidebar({ events, allEvents, bases, onEventClick }: Props) {
  const { focusedBaseId, filterLevel, clearFilter } = useBaseFilter();
  const [open, setOpen]           = useState(true);
  const [typeTab, setTypeTab]     = useState<EventTypeFilter>("all");
  const [scopeTab, setScopeTab]   = useState<ScopeFilter>("all");
  const listRef = useRef<HTMLDivElement>(null);

  // derive the active filter name for the badge
  const focusedBaseName = bases.find((b) => b.id === focusedBaseId)?.name ?? null;

  // apply local filters on top of whatever comes in
  const visible = events.filter((e) => {
    if (typeTab !== "all" && e.type !== typeTab) return false;
    if (scopeTab !== "all" && eventScope(e) !== scopeTab) return false;
    return true;
  });

  // count per type for tab badges
  const countFor = (t: EventTypeFilter) =>
    t === "all" ? events.length : events.filter((e) => e.type === t).length;
  const scopeCountFor = (s: ScopeFilter) =>
    s === "all" ? events.length : events.filter((e) => eventScope(e) === s).length;

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [events.length]);

  return (
    <div className="flex flex-shrink-0 h-full" style={{ width: open ? 380 : 36, transition: "width 0.25s ease" }}>

      {/* ── Toggle strip ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center border-l border-border bg-card cursor-pointer select-none z-10"
        style={{ width: 36, flexShrink: 0 }}
        onClick={() => setOpen((v) => !v)}
        title={open ? "Minimera sidopanel" : "Öppna sidopanel"}
      >
        <div className="flex flex-col items-center gap-2 pt-3 pb-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          {!open && (
            <span
              className="text-[9px] font-mono font-bold text-muted-foreground tracking-widest mt-1"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.15em" }}
            >
              HÄNDELSER
            </span>
          )}
          {!open && focusedBaseName && (
            <span
              className="text-[8px] font-mono text-blue-400 tracking-widest"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {focusedBaseName}
            </span>
          )}
        </div>
        <div className="mt-auto mb-3">
          {open
            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronLeft  className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {/* ── Expanded panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="events-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 344, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="flex flex-col overflow-hidden border-l border-border bg-card"
          >

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0 space-y-2.5">

              {/* Title row */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-foreground tracking-wider">
                  HÄNDELSER & RAPPORTER
                </span>
                <span className="text-[9px] font-mono text-muted-foreground tabular-nums">
                  {visible.length} / {allEvents.length}
                </span>
              </div>

              {/* Base picker */}
              <BasePicker bases={bases} events={allEvents} />

              {/* Active filter badge */}
              <AnimatePresence>
                {focusedBaseName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30"
                  >
                    <Building2 className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                    <span className="text-[9px] font-mono text-blue-300 flex-1 truncate font-bold">
                      {focusedBaseName}
                    </span>
                    <span className="text-[8px] font-mono text-blue-400/60 capitalize">
                      {filterLevel}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFilter(); }}
                      className="text-blue-400/50 hover:text-blue-200 transition-colors ml-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Type tabs */}
              <div className="flex gap-0.5">
                {TYPE_TABS.map(({ key, label, color }) => {
                  const cnt = countFor(key);
                  const active = typeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); setTypeTab(key); }}
                      className={`flex-1 text-[9px] font-mono font-bold py-1 rounded transition-all relative ${
                        active
                          ? `bg-card border border-border ${color}`
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                      {cnt > 0 && (
                        <span className={`ml-0.5 ${active ? "opacity-80" : "opacity-50"}`}>
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scope tabs */}
              <div className="flex gap-0.5">
                {SCOPE_TABS.map(({ key, label }) => {
                  const cnt = scopeCountFor(key);
                  const active = scopeTab === key;
                  const meta = key !== "all" ? SCOPE_META[key as keyof typeof SCOPE_META] : null;
                  return (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); setScopeTab(key); }}
                      className={`flex-1 text-[8px] font-mono font-bold py-0.5 rounded transition-all ${
                        active && meta
                          ? `${meta.bg} border ${meta.border} ${meta.color}`
                          : active
                          ? "bg-muted/40 text-foreground border border-border"
                          : "text-muted-foreground/60 hover:text-muted-foreground"
                      }`}
                    >
                      {label}
                      {cnt > 0 && <span className="ml-0.5 opacity-60">({cnt})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Event list ──────────────────────────────────────────────── */}
            <div ref={listRef} className="flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-4 py-10 text-center text-[10px] font-mono text-muted-foreground">
                  Inga händelser matchar filter
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visible.map((event) => {
                    const meta  = TYPE_META[event.type];
                    const scope = eventScope(event);
                    const scopeM = SCOPE_META[scope];
                    const Icon  = meta.icon;
                    const ScopeIcon = scopeM.icon;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onEventClick ? () => onEventClick(event) : undefined}
                        className={`px-3 py-2.5 border-b border-border/30 border-l-2 ${meta.borderColor} ${meta.bgColor} ${onEventClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : ""}`}
                      >
                        {/* Top row: icon + type badge + scope badge + time */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Icon className={`h-3 w-3 flex-shrink-0 ${meta.textColor}`} />

                          {/* Type badge */}
                          <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.label}
                          </span>

                          {/* Scope badge */}
                          <span className={`flex items-center gap-0.5 text-[8px] font-mono px-1 py-0.5 rounded border ${scopeM.bg} ${scopeM.border} ${scopeM.color}`}>
                            <ScopeIcon className="h-2 w-2" />
                            {scopeM.label}
                          </span>

                          <span className="ml-auto text-[8px] font-mono text-muted-foreground/60 flex-shrink-0 truncate">
                            {event.timestamp}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="text-[10px] text-foreground leading-snug">
                          {event.message}
                        </p>

                        {/* Footer: base + unit tags */}
                        {(event.base || event.unitId || event.actionType) && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {event.base && (
                              <span className="text-[8px] font-mono text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                                {event.base}
                              </span>
                            )}
                            {event.unitId && (
                              <span className="text-[8px] font-mono text-orange-400/80 bg-orange-500/10 px-1.5 py-0.5 rounded">
                                {event.unitId}
                              </span>
                            )}
                            {event.actionType && (
                              <span className="text-[8px] font-mono text-muted-foreground/50">
                                {event.actionType.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
