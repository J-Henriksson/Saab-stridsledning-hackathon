import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, ChevronRight, Brain, Plane, Target, Check, Radio, Anchor } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { absoluteGameSec } from "@/core/engine";
import { computeFriendlySensorCoverage, isInsideAnyDisc } from "@/core/intel/visibility";
import { DEMO_RADAR_UNITS } from "@/data/radarUnits";
import { haversineDistance } from "@/utils/geoDistance";
import { KARLSKRONA, BOGEY_SPAWNS, BOGEY_TRANSIT_KTS } from "./geo";

const KTS_TO_KM_PER_SEC = 1.852 / 3600;

interface Props {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
  onSelectBogey?: (id: string) => void;
  onHoverBogey?: (id: string | null) => void;
}

const BOGEYS = [
  { id: "scn-bogey-01", designator: "B01", className: "Su-30SM — LEAD" },
  { id: "scn-bogey-02", designator: "B02", className: "Su-30SM — WING" },
];

const ALTERNATIVES = [
  {
    id: "elint",
    Icon: Radio,
    title: "Förhöjd radarstatus + ELINT-blockering",
    stat: "risk: med",
  },
  {
    id: "navy",
    Icon: Anchor,
    title: "Anropa Marinen — HMS Visby till position",
    stat: "ETA: 38 min",
  },
];

type Phase = "idle" | "sending" | "sent";

export function AIActionCard({ open, onAccept, onClose, onSelectBogey, onHoverBogey }: Props) {
  const { state } = useGame();
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // Stable, deterministic-ish tx-id for the order acknowledgement.
  const txId = useMemo(
    () => `OPS-${Math.floor(Math.random() * 0xfff).toString(16).toUpperCase().padStart(3, "0")}-${Math.floor(Math.random() * 0xff).toString(16).toUpperCase().padStart(2, "0")}`,
    [open],
  );

  // Reset phase when card closes/reopens.
  useEffect(() => { if (!open) setPhase("idle"); }, [open]);

  // Click-outside dismiss (only while idle — once order is sending/sent the
  // card auto-closes after the ack animation).
  useEffect(() => {
    if (!open || phase !== "idle") return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    }
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, phase, onClose]);

  const sc = state.scenario;
  // T+ from stage1 (when boats spawned) — keeps continuity with the brief.
  const stage1At = sc?.stage1AtSec ?? sc?.startedAtSec ?? 0;
  const elapsed = sc ? Math.max(0, absoluteGameSec(state) - stage1At) : 0;
  const tPlus = `T+${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

  // Live ETA: lead-bogey → Karlskrona at transit speed (live, ticks with clock).
  const leadBogey = state.enemyEntities.find((e) => e.id === "scn-bogey-01");
  let etaSec = 0;
  if (leadBogey) {
    const distKm = haversineDistance(leadBogey.coords, KARLSKRONA) / 1000;
    const kmPerSec = BOGEY_TRANSIT_KTS * KTS_TO_KM_PER_SEC;
    etaSec = Math.max(0, Math.round(distKm / kmPerSec));
  }
  const etaLabel = `${String(Math.floor(etaSec / 60)).padStart(2, "0")}:${String(etaSec % 60).padStart(2, "0")}`;
  const etaTone =
    etaSec < 30 ? "text-red-300"
    : etaSec < 120 ? "text-amber-300"
    : "text-cyan-300";

  // Sensor that "owns" the lead bogey contact — for the recommendation stats.
  const leadCoveringRadar = useMemo(() => {
    if (!leadBogey) return null;
    const discs = computeFriendlySensorCoverage(state);
    const radarIds = new Set(DEMO_RADAR_UNITS.map((r) => r.id));
    for (const d of discs) {
      if (!radarIds.has(d.id)) continue;
      if (isInsideAnyDisc(leadBogey.coords, [d])) {
        return DEMO_RADAR_UNITS.find((r) => r.id === d.id);
      }
    }
    return null;
  }, [leadBogey, state]);

  const handleAccept = () => {
    if (phase !== "idle") return;
    setPhase("sending");
    // Sending → sent is fast (~400 ms) so it feels live, not theatrical.
    setTimeout(() => setPhase("sent"), 400);
    // Card auto-dismisses ~1.2 s after the order is acknowledged so leadership
    // sees the confirmation without it lingering.
    setTimeout(() => {
      onAccept();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          /* Same geometry as the Stage-1 brief — keeps continuity in the
           * operator's eye-track. Sits immediately left of HÄNDELSER. */
          className="absolute z-[60] right-[396px] top-20 w-[340px] max-h-[calc(100vh-110px)] overflow-y-auto rounded-md border border-red-500/40 bg-card shadow-2xl flex flex-col"
        >
          {/* Header — situation + T+ */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-red-500/40 bg-red-500/[0.12] sticky top-0 backdrop-blur z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertOctagon className="h-3.5 w-3.5 text-red-300 flex-shrink-0" />
              <span className="text-[11px] font-mono font-bold tracking-[0.18em] text-red-200">
                LUFTMÅL
              </span>
              <span className="text-[10px] font-mono text-red-200/80 ml-1">·</span>
              <span className="text-[10px] font-mono text-red-100/95 tracking-wider font-bold">
                2 BOGEYS · KARLSKRONA
              </span>
            </div>
            <span className="text-[10px] font-mono text-red-200 tabular-nums tracking-[0.15em] flex-shrink-0 font-bold">
              {tPlus}
            </span>
          </div>

          <div className="flex flex-col">

            {/* AI BEDÖMNING — short, with live ETA */}
            <div className="px-3 py-2.5 border-b border-border/40 border-l-2 border-l-cyan-500">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain className="h-3 w-3 text-cyan-300" />
                <span className="text-[9px] font-mono font-bold text-cyan-200 tracking-[0.2em]">
                  AI · BEDÖMNING
                </span>
              </div>
              <p className="text-[11px] leading-snug text-foreground mb-2">
                Två Su-30SM, kurs 278° mot Karlskrona. Trolig provokationsflygning.
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[9.5px] font-mono text-foreground/75 tracking-wider uppercase font-bold">
                  ETA kust
                </span>
                <span className={`text-[15px] font-mono font-bold tabular-nums ${etaTone}`}>
                  {etaLabel}
                </span>
              </div>
            </div>

            {/* KONTAKTER */}
            <div className="px-3 py-2.5 border-b border-border/40 border-l-2 border-l-red-500">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3 w-3 text-red-300" />
                <span className="text-[9px] font-mono font-bold text-red-200 tracking-[0.2em]">
                  KONTAKTER
                </span>
              </div>
              <div className="space-y-0.5 -mx-1" onMouseLeave={() => onHoverBogey?.(null)}>
                {BOGEYS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBogey?.(b.id)}
                    onMouseEnter={() => onHoverBogey?.(b.id)}
                    className="w-full flex items-center gap-2 px-1.5 py-1 rounded text-left hover:bg-muted/30 transition-colors group"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-[10.5px] font-mono font-bold text-foreground tracking-wider w-7 flex-shrink-0">
                      {b.designator}
                    </span>
                    <span className="text-[10.5px] font-mono text-foreground/95 truncate flex-1">
                      {b.className}
                    </span>
                    <ChevronRight className="h-3 w-3 text-foreground/60 group-hover:text-cyan-200 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* REKOMMENDERAD ÅTGÄRD — primary call-to-action */}
            <div className="px-3 py-3 border-b border-border/40 bg-emerald-500/[0.06]">
              <div className="text-[9px] font-mono font-bold text-emerald-200 tracking-[0.22em] mb-1.5">
                REKOMMENDERAD ÅTGÄRD
              </div>
              <button
                onClick={handleAccept}
                disabled={phase !== "idle"}
                className={`w-full rounded-md border-2 transition-all overflow-hidden ${
                  phase === "idle"
                    ? "border-emerald-500/70 bg-emerald-500/10 hover:bg-emerald-500/[0.18] hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                    : phase === "sending"
                    ? "border-emerald-500/70 bg-emerald-500/15"
                    : "border-emerald-400 bg-emerald-500/[0.18] shadow-[0_0_24px_rgba(16,185,129,0.5)]"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {phase === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="px-3 py-2.5 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Plane className="h-4 w-4 text-emerald-200" />
                        <span className="text-[11.5px] font-mono font-bold tracking-wider text-foreground">
                          SKICKA 2× JAS · F17 RONNEBY
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-2 text-foreground/80">
                          <span>ETA <span className="text-emerald-200 tabular-nums font-bold">4 min</span></span>
                          <span className="text-foreground/40">·</span>
                          <span>Risk <span className="text-emerald-200 font-bold">LÅG</span></span>
                          <span className="text-foreground/40">·</span>
                          <span>Bränsle <span className="text-emerald-200 tabular-nums font-bold">78%</span></span>
                        </div>
                        <span className="flex items-center gap-0.5 text-emerald-200 font-bold tracking-wider">
                          AKTIVERA <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {phase === "sending" && (
                    <motion.div
                      key="sending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="px-3 py-3 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                        <span className="text-[10.5px] font-mono font-bold tracking-[0.18em] text-emerald-100">
                          SÄNDER ORDER…
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-foreground/85 tabular-nums">
                        {txId} <span className="text-foreground/50">·</span> datalänk {leadCoveringRadar?.name ?? "MOB-radar"}
                      </div>
                      <div className="mt-2 h-0.5 w-full bg-emerald-900/50 rounded overflow-hidden">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.4, ease: "linear" }}
                          className="h-full bg-emerald-300"
                        />
                      </div>
                    </motion.div>
                  )}

                  {phase === "sent" && (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="px-3 py-3 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-4.5 w-4.5 rounded-full bg-emerald-400/30 border border-emerald-300 flex items-center justify-center" style={{ width: 18, height: 18 }}>
                          <Check className="h-3 w-3 text-emerald-200" strokeWidth={3} />
                        </div>
                        <span className="text-[11.5px] font-mono font-bold tracking-[0.18em] text-emerald-100">
                          ORDER MOTTAGEN
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-200 tabular-nums font-bold">
                        {txId}
                      </div>
                      <div className="text-[10.5px] font-mono text-foreground mt-1">
                        JAS-pair F17 mottar koordinater · uppdrag aktivt
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* ALTERNATIV — secondary, click-no-op (still readable) */}
            <div className="px-3 py-2.5">
              <div className="text-[9px] font-mono font-bold text-foreground/70 tracking-[0.2em] mb-1.5">
                ALTERNATIV
              </div>
              <div className="space-y-0">
                {ALTERNATIVES.map((alt) => (
                  <button
                    key={alt.id}
                    className="w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded text-left hover:bg-muted/30 transition-colors"
                    /* No onClick — silent. Operator can read but not act. */
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <alt.Icon className="h-3 w-3 text-foreground/60 flex-shrink-0" />
                      <span className="text-[10.5px] font-mono text-foreground/85 truncate">
                        {alt.title}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-foreground/65 tabular-nums flex-shrink-0">
                      {alt.stat}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="px-3 py-2 border-t border-border/40 bg-muted/[0.05]">
            <span className="text-[9.5px] font-mono text-foreground/65">
              Klicka utanför för att dölja
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
