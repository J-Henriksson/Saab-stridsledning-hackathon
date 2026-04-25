import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, AlertOctagon, Radio, Satellite, Brain, Target } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { absoluteGameSec } from "@/core/engine";
import { computeFriendlySensorCoverage, isInsideAnyDisc } from "@/core/intel/visibility";
import { DEMO_RADAR_UNITS } from "@/data/radarUnits";
import { SHIP_SPAWNS } from "./geo";

interface Contact {
  id: string;
  designator: string;
  className: string;
}

const CONTACTS: Contact[] = [
  { id: "scn-baltic-ship-01", designator: "M01", className: "Karakurt — korvett" },
  { id: "scn-baltic-ship-02", designator: "M02", className: "Steregushchiy — fregatt" },
  { id: "scn-baltic-ship-03", designator: "M03", className: "Ropucha — amfibie" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectContact?: (id: string) => void;
  onHoverContact?: (id: string | null) => void;
}

export function ScenarioBrief({
  open,
  onClose,
  onSelectContact,
  onHoverContact,
}: Props) {
  const { state } = useGame();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const sc = state.scenario;
  const stage1At = sc?.stage1AtSec ?? sc?.startedAtSec ?? 0;
  const elapsed = sc ? Math.max(0, absoluteGameSec(state) - stage1At) : 0;
  const tPlus = `T+${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

  const radarRows = (() => {
    const discs = computeFriendlySensorCoverage(state);
    const radarIds = new Set(DEMO_RADAR_UNITS.map((r) => r.id));
    const ships = SHIP_SPAWNS
      .map((s) => state.navalUnits.find((nu) => nu.id === s.id))
      .filter(Boolean) as { position: { lat: number; lng: number } }[];

    return DEMO_RADAR_UNITS
      .filter((r) => discs.some((d) => d.id === r.id && radarIds.has(d.id)))
      .map((r) => {
        const disc = discs.find((d) => d.id === r.id)!;
        const covering = ships.filter((sh) => isInsideAnyDisc(sh.position, [disc])).length;
        return { id: r.id, name: r.name, range: Math.round(disc.radiusKm), covering };
      })
      .filter((row) => row.covering > 0)
      .sort((a, b) => b.covering - a.covering);
  })();

  const satEtaSec = sc ? Math.max(0, sc.satelliteEtaSec - elapsed) : 4 * 60 + 12;
  const satMin = Math.floor(satEtaSec / 60);
  const satSec = Math.floor(satEtaSec % 60);
  const satLabel = `${String(satMin).padStart(2, "0")}:${String(satSec).padStart(2, "0")}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          /* Right-side vertical list, sits immediately to the left of the
           * HÄNDELSER sidebar (380px). Same width / visual rhythm so it
           * reads like a sibling event-list rather than a separate panel. */
          className="absolute z-[60] right-[396px] top-20 w-[340px] max-h-[calc(100vh-110px)] overflow-y-auto rounded-md border border-amber-500/40 bg-card shadow-2xl flex flex-col"
        >
          {/* Header — situation + T+ */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-amber-500/30 bg-amber-500/[0.08] sticky top-0 backdrop-blur z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertOctagon className="h-3 w-3 text-amber-400 flex-shrink-0" />
              <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-amber-300">
                ÖSTERSJÖN SE
              </span>
              <span className="text-[9px] font-mono text-amber-300/60 ml-1">·</span>
              <span className="text-[9px] font-mono text-amber-300/80 tracking-wider">
                INTRÅNG
              </span>
            </div>
            <span className="text-[9px] font-mono text-amber-300/90 tabular-nums tracking-[0.15em] flex-shrink-0">
              {tPlus}
            </span>
          </div>

          {/* Vertical list — each section is a card row, like an event in HÄNDELSER */}
          <div className="flex flex-col">

            {/* AI BEDÖMNING */}
            <ListCard accentClass="border-l-cyan-500" iconColor="text-cyan-400" label="AI · BEDÖMNING" Icon={Brain}>
              <p className="text-[10.5px] leading-snug text-foreground/90 mb-2">
                Anti-ytstridsgrupp i kurs 320° mot svensk kustlinje. Sammansättningen
                ger Kalibr-räckvidd och egen luftvärnsbubbla.
              </p>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-red-500/40 bg-red-500/[0.08]">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <span className="text-[9px] font-mono font-bold tracking-[0.18em] text-red-300">
                  HOT · HÖG
                </span>
              </div>
            </ListCard>

            {/* SENSOR */}
            <ListCard accentClass="border-l-cyan-500" iconColor="text-cyan-400" label="SENSORTÄCKNING" Icon={Radio}>
              {radarRows.length === 0 ? (
                <div className="text-[10px] font-mono text-muted-foreground">
                  Ingen aktiv täckning — målen ej spårbara.
                </div>
              ) : (
                <ul className="space-y-1">
                  {radarRows.map((r, idx) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {idx === 0 && (
                          <span className="text-[7.5px] font-mono font-bold tracking-wider px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 flex-shrink-0">
                            UPP
                          </span>
                        )}
                        <span className="text-foreground truncate">{r.name}</span>
                      </div>
                      <span className="text-muted-foreground/80 tabular-nums flex-shrink-0">
                        {r.covering}/3 · {r.range} km
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ListCard>

            {/* SATELLIT */}
            <ListCard accentClass="border-l-violet-500" iconColor="text-violet-400" label="SATELLITFÖNSTER" Icon={Satellite}>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-mono text-foreground/85">Ej över mål</span>
                <span className="text-[10px] font-mono text-muted-foreground">·</span>
                <span className="text-[11px] font-mono font-bold text-violet-300 tabular-nums">
                  {satLabel}
                </span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">
                till nästa pass
              </span>
            </ListCard>

            {/* KONTAKTER */}
            <ListCard accentClass="border-l-red-500" iconColor="text-red-400" label="KONTAKTER" Icon={Target}>
              <div className="space-y-0.5 -mx-2" onMouseLeave={() => onHoverContact?.(null)}>
                {CONTACTS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectContact?.(c.id)}
                    onMouseEnter={() => onHoverContact?.(c.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-muted/30 transition-colors group"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-[10px] font-mono font-bold text-foreground tracking-wider w-7 flex-shrink-0">
                      {c.designator}
                    </span>
                    <span className="text-[10px] font-mono text-foreground/80 truncate flex-1">
                      {c.className}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </ListCard>

            {/* NYCKELDATA */}
            <ListCard accentClass="border-l-slate-500" iconColor="text-slate-400" label="NYCKELDATA" Icon={undefined}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <Fact label="Bäring" value="130°" />
                <Fact label="Avstånd" value="240 NM" />
                <Fact label="Hastighet" value="18 kn" />
                <Fact label="ETA 200 NM" value="~6h" />
              </div>
            </ListCard>

          </div>

          <div className="px-3 py-2 border-t border-border/40 bg-muted/[0.03]">
            <span className="text-[9px] font-mono text-muted-foreground/70">
              Klicka utanför för att dölja
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ListCardProps {
  accentClass: string;
  iconColor: string;
  label: string;
  Icon?: React.ElementType;
  children: React.ReactNode;
}

function ListCard({ accentClass, iconColor, label, Icon, children }: ListCardProps) {
  return (
    <div className={`px-3 py-2.5 border-b border-border/30 border-l-2 ${accentClass}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className={`h-2.5 w-2.5 ${iconColor}`} />}
        <span className={`text-[8px] font-mono ${iconColor} tracking-[0.2em]`}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[10px] font-mono">
      <span className="text-muted-foreground/70">{label}</span>{" "}
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}
