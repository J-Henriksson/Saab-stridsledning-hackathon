import { Base, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Clock, CheckCircle, X, Users, Cpu, Shield, AlertTriangle, History } from "lucide-react";
import { useState } from "react";
import { DropZone } from "@/components/game/BaseMap";

// ─── SAAB palette ────────────────────────────────────────────────────────────
const DEEP_BLUE = "#0C234C";
const SILVER    = "#D7DEE1";
const AMBER     = "#D7AB3A";
const RED       = "#D9192E";

// ─── Crew Teams ──────────────────────────────────────────────────────────────
const CREW_TEAMS = [
  {
    id: "alpha", name: "Team Alpha", specialty: "Avionik",
    members: ["Löjtnant J. Svensson", "Flt.Ing. E. Lindqvist", "Flt.Ing. M. Karlsson"],
    color: "#60a5fa",
    expertise: "Snabb på mjukvarufel, radar & IFF. Långsammare på mekanik.",
  },
  {
    id: "beta", name: "Team Beta", specialty: "Motor / RM12",
    members: ["Kapten A. Berg", "Flt.Ing. P. Nilsson", "Flt.Ing. S. Holm"],
    color: "#f59e0b",
    expertise: "Specialister framdrivning. Effektiv på motorbyten & APU.",
  },
  {
    id: "charlie", name: "Team Charlie", specialty: "Struktur & Hydraulik",
    members: ["Löjtnant K. Larsson", "Flt.Ing. T. Eriksson", "Flt.Ing. L. Johansson"],
    color: "#22c55e",
    expertise: "Strukturreparation, hydraulsystem & landställ.",
  },
  {
    id: "delta", name: "Team Delta", specialty: "Vapen & Last",
    members: ["Sergeant R. Magnusson", "Flt.Ing. O. Persson", "Flt.Ing. H. Gustafsson"],
    color: "#a78bfa",
    expertise: "Vapensystem, pyloner och laststationer.",
  },
];

// ─── Work order labels ────────────────────────────────────────────────────────
const MAINT_LABELS: Record<string, { title: string; description: string; estHours: number }> = {
  quick_lru:         { title: "LRU-byte (Snabb)",    description: "Utbyte av Line Replaceable Unit — avionik/dator.", estHours: 2 },
  complex_lru:       { title: "LRU-byte (Komplex)",  description: "Komplex LRU-reparation med kalibrering krävs.", estHours: 6 },
  direct_repair:     { title: "Direktreparation",    description: "Felsökning och reparation av identifierat fel.", estHours: 4 },
  troubleshooting:   { title: "Felsökning",          description: "Avancerad diagnostik — felkälla ej identifierad.", estHours: 8 },
  scheduled_service: { title: "Schemalagt underhåll",description: "100h-inspektion, smörjning & systemcheck.", estHours: 4 },
};
const DEFAULT_LABEL = { title: "Underhåll", description: "Pågående arbete.", estHours: 4 };

// ─── Bay history ─────────────────────────────────────────────────────────────
const BAY_HISTORY: Record<number, { time: string; text: string }[]> = {
  1: [
    { time: "Dag 1 04:00", text: "GE01 genomgick 100h-inspektion. Utförd av Team Alpha. Tid: 14h." },
    { time: "Dag 1 02:30", text: "Incident: Hydraulläckage sanerat. Inga följdskador." },
  ],
  2: [
    { time: "Dag 1 03:15", text: "GE05 — LRU-byte PS-05/A radar. Utförd av Team Beta. Tid: 3h." },
    { time: "Dag 1 01:00", text: "Byte av RM12 turbinblad. S/N 99821-B. Tid: 8.5h." },
  ],
  3: [
    { time: "Dag 1 02:00", text: "GE09 — Hydraulreparation. Ventil P/N HV-4412 bytt. Tid: 5h." },
    { time: "Dag 1 00:00", text: "Rutinsmörjning och systemdiagnostik. OK." },
  ],
  4: [
    { time: "Dag 1 01:45", text: "GE11 — Strukturinspektion efter hård landning. Godkänd." },
    { time: "Dag 1 00:30", text: "EW-suite firmware uppgradering v2.3.1. Tid: 2h." },
  ],
};
function getBayHistory(bayId: number) {
  return BAY_HISTORY[bayId] ?? [
    { time: "Dag 1 00:00", text: `UHplats ${bayId} — Inga tidigare händelser.` },
  ];
}

// ─── Activity feed steps ──────────────────────────────────────────────────────
interface ActivityStep { pctMin: number; pctMax: number; template: string; isWarning?: boolean }

const ACTIVITY_STEPS: Record<string, ActivityStep[]> = {
  quick_lru: [
    { pctMin: 0,  pctMax: 20,  template: "{m0} påbörjar demontering av skadat LRU." },
    { pctMin: 20, pctMax: 45,  template: "{m1} kör BIT-diagnostik på delsystem." },
    { pctMin: 45, pctMax: 65,  template: "Nytt LRU installerat. Kalibrering pågår." },
    { pctMin: 65, pctMax: 85,  template: "{m2} verifierar systemintegration — OK." },
    { pctMin: 85, pctMax: 100, template: "Slutkontroll. Plan förbereds för uppställning." },
  ],
  complex_lru: [
    { pctMin: 0,  pctMax: 15,  template: "{m0} initierar komplex LRU-analys." },
    { pctMin: 15, pctMax: 35,  template: "{m1} demonterar avionikkabinett." },
    { pctMin: 35, pctMax: 55,  template: "Varning: Slitage på {part} högre än förväntat.", isWarning: true },
    { pctMin: 55, pctMax: 80,  template: "{m0} installerar ersättnings-LRU och kalibrerar." },
    { pctMin: 80, pctMax: 100, template: "{m2} genomför full systemverifiering." },
  ],
  direct_repair: [
    { pctMin: 0,  pctMax: 20,  template: "{m0} identifierar och isolerar felet." },
    { pctMin: 20, pctMax: 45,  template: "{m1} påbörjar direktreparation av komponent." },
    { pctMin: 45, pctMax: 65,  template: "Reparation 60% klar. Testprocedur inleds." },
    { pctMin: 65, pctMax: 85,  template: "{m2} utför systemtest — inga avvikelser." },
    { pctMin: 85, pctMax: 100, template: "Direktreparation färdig. Slutinspektion OK." },
  ],
  troubleshooting: [
    { pctMin: 0,  pctMax: 15,  template: "{m0} initierar avancerad systemdiagnostik." },
    { pctMin: 15, pctMax: 35,  template: "{m1} analyserar felloggar — felkälla ej identifierad.", isWarning: true },
    { pctMin: 35, pctMax: 55,  template: "Varning: Slitage på {part} högre än förväntat.", isWarning: true },
    { pctMin: 55, pctMax: 75,  template: "{m0} isolerar felsegment. Kräver specialverktyg." },
    { pctMin: 75, pctMax: 100, template: "{m2} genomför slutlig verifiering och sign-off." },
  ],
  scheduled_service: [
    { pctMin: 0,  pctMax: 20,  template: "{m0} påbörjar 100h-inspektion enligt checklista." },
    { pctMin: 20, pctMax: 40,  template: "{m1} smörjer mekaniska komponenter och landställ." },
    { pctMin: 40, pctMax: 60,  template: "Systemdiagnostik: motor, hydraul & avionik." },
    { pctMin: 60, pctMax: 80,  template: "{m2} uppdaterar servicejournalen och loggar." },
    { pctMin: 80, pctMax: 100, template: "Schemalagt underhåll slutfört. Godkänt för flyg." },
  ],
};

function resolveActivity(template: string, crew: typeof CREW_TEAMS[0], partName: string): string {
  return template
    .replace("{m0}", crew.members[0])
    .replace("{m1}", crew.members[1])
    .replace("{m2}", crew.members[2])
    .replace("{part}", partName);
}

function getVisibleSteps(maintenanceType: string | undefined, remaining: number, estHours: number, crew: typeof CREW_TEAMS[0], partName: string) {
  const key = maintenanceType ?? "quick_lru";
  const steps = ACTIVITY_STEPS[key] ?? ACTIVITY_STEPS.quick_lru;
  const progressPct = Math.max(0, Math.min(100, (1 - remaining / estHours) * 100));
  return steps
    .filter(s => progressPct >= s.pctMin)
    .reverse() // newest first
    .map((s, i) => ({ text: resolveActivity(s.template, crew, partName), isWarning: !!s.isWarning, isLatest: i === 0 }));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MaintenanceBaysProps {
  base: Base;
  onDropAircraft?: (aircraftId: string, zone: DropZone) => void;
}

interface BayInfo {
  id: number;
  label: string;
  type: string;
  aircraft: Aircraft | null;
}

const BAY_LABELS = [
  { label: "UHplats 1", type: "Bakre underhåll — Stol, motor" },
  { label: "UHplats 2", type: "Främre underhåll — Avionik" },
  { label: "UHplats 3", type: "Främre underhåll — System" },
  { label: "UHplats 4", type: "Bakre underhåll — Struktur" },
  { label: "UHplats 5", type: "Vapen & laststationer" },
  { label: "UHplats 6", type: "Motor & framdrivning" },
  { label: "UHplats 7", type: "Hydraulik & landställ" },
  { label: "UHplats 8", type: "Allmänt underhåll" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export function MaintenanceBays({ base, onDropAircraft }: MaintenanceBaysProps) {
  const [dragOverId, setDragOverId]       = useState<number | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<number | null>(null);

  const maintAircraft = base.aircraft.filter((a) => a.status === "under_maintenance");
  const bays: BayInfo[] = Array.from({ length: base.maintenanceBays.total }, (_, i) => ({
    id: i + 1,
    label: BAY_LABELS[i]?.label || `UHplats ${i + 1}`,
    type:  BAY_LABELS[i]?.type  || "Underhåll",
    aircraft: maintAircraft[i] || null,
  }));

  const mechAvailable = base.personnel.find(p => p.id === "mech")?.available ?? 1;
  const noMech = mechAvailable === 0;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, bayId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(bayId);
  };
  const handleDragLeave = () => setDragOverId(null);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverId(null);
    const aircraftId = e.dataTransfer.getData("aircraftId");
    if (aircraftId && onDropAircraft) onDropAircraft(aircraftId, "hangar");
  };

  const selectedBay = selectedBayId != null ? bays.find(b => b.id === selectedBayId) ?? null : null;
  const panelOpen = selectedBay != null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-status-amber" />
          <h3 className="font-sans font-bold text-sm text-foreground">UNDERHÅLLSPLATSER</h3>
        </div>
        <span className="text-xs font-mono">
          <span className={base.maintenanceBays.occupied >= base.maintenanceBays.total ? "text-status-red" : "text-status-amber"}>
            {base.maintenanceBays.occupied}
          </span>
          <span className="text-muted-foreground">/{base.maintenanceBays.total} upptagna</span>
        </span>
      </div>

      {/* ── Body: grid + optional detail panel ── */}
      <div className="flex" style={{ minHeight: panelOpen ? 420 : undefined }}>
        {/* Bay grid */}
        <div className={`p-4 grid grid-cols-2 gap-3 transition-all duration-300 ${panelOpen ? "w-[55%]" : "w-full"}`}>
          {bays.map((bay, bayIndex) => {
            const isSelected  = bay.id === selectedBayId;
            const isDragOver  = dragOverId === bay.id;
            const ac          = bay.aircraft;
            const sparePart   = ac?.requiredSparePart ? base.spareParts.find(p => p.id === ac.requiredSparePart) : undefined;
            const stalled     = !!sparePart && sparePart.quantity === 0;
            const waitPersonnel = !!ac && noMech;

            return (
              <div
                key={bay.id}
                onDragOver={(e) => handleDragOver(e, bay.id)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => setSelectedBayId(bay.id === selectedBayId ? null : bay.id)}
                className="relative rounded-lg border-2 p-3 transition-all min-h-[130px] flex flex-col cursor-pointer select-none"
                style={{
                  borderColor: isDragOver ? "#22c55e"
                    : isSelected ? AMBER
                    : ac ? "rgba(215,171,58,0.4)"
                    : "rgba(100,116,139,0.25)",
                  background: isDragOver ? "rgba(34,197,94,0.12)"
                    : isSelected ? `rgba(215,171,58,0.08)`
                    : ac ? "rgba(215,171,58,0.04)"
                    : "rgba(100,116,139,0.04)",
                  boxShadow: isSelected ? `0 0 0 2px ${AMBER}44` : undefined,
                  borderStyle: ac ? "solid" : "dashed",
                }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-foreground uppercase">{bay.label}</span>
                  {ac ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: "rgba(215,171,58,0.18)", color: AMBER }}>AKTIV</span>
                  ) : isDragOver ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: "rgba(34,197,94,0.18)", color: "#22c55e" }}>DROP HERE</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-muted-foreground bg-muted">LEDIG</span>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground mb-2">{bay.type}</div>

                {ac ? (
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">{ac.tailNumber}</span>
                      <span className="text-[9px] text-muted-foreground">{ac.type.replace("_", "/")}</span>
                    </div>
                    {ac.maintenanceType && (
                      <div className="text-[9px] font-mono" style={{ color: AMBER }}>
                        {MAINT_LABELS[ac.maintenanceType]?.title ?? ac.maintenanceType}
                      </div>
                    )}
                    {ac.maintenanceTimeRemaining != null && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" style={{ color: AMBER }} />
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                          <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${Math.max(5, (1 - ac.maintenanceTimeRemaining / 16) * 100)}%` }}
                            transition={{ duration: 0.5 }}
                            style={{ background: AMBER }}
                          />
                        </div>
                        <span className="text-[9px] font-mono" style={{ color: AMBER }}>{ac.maintenanceTimeRemaining}h</span>
                      </div>
                    )}
                    {/* Bottleneck pills */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {waitPersonnel && (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(217,25,46,0.18)", color: RED }}>VÄNTAR PÅ PERSONAL</span>
                      )}
                      {stalled && (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(217,25,46,0.18)", color: RED }}>STALLAD</span>
                      )}
                    </div>
                  </div>
                ) : isDragOver ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <CheckCircle className="h-7 w-7 mx-auto mb-1" style={{ color: "#22c55e" }} />
                      <span className="text-[9px] font-mono" style={{ color: "#22c55e" }}>Release to assign</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 gap-1">
                    <CheckCircle className="h-5 w-5 text-muted-foreground/30" />
                    <span className="text-[8px] font-mono text-muted-foreground/40">
                      {CREW_TEAMS[bayIndex % 4].name}
                    </span>
                  </div>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Detail panel ── */}
        <AnimatePresence>
          {panelOpen && selectedBay && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="flex-1 overflow-y-auto"
              style={{
                background: "rgba(12,35,76,0.97)",
                backdropFilter: "blur(16px)",
                borderLeft: "1px solid rgba(215,222,225,0.1)",
              }}
            >
              <DetailPanel
                bay={selectedBay}
                bayIndex={bays.findIndex(b => b.id === selectedBay.id)}
                base={base}
                noMech={noMech}
                onClose={() => setSelectedBayId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  bay, bayIndex, base, noMech, onClose,
}: {
  bay: BayInfo;
  bayIndex: number;
  base: Base;
  noMech: boolean;
  onClose: () => void;
}) {
  const ac      = bay.aircraft;
  const crew    = CREW_TEAMS[bayIndex % 4];
  const label   = ac?.maintenanceType ? (MAINT_LABELS[ac.maintenanceType] ?? DEFAULT_LABEL) : DEFAULT_LABEL;
  const estHours = label.estHours;
  const remaining = ac?.maintenanceTimeRemaining ?? 0;
  const progress  = ac ? Math.max(0, Math.min(1, 1 - remaining / estHours)) : 0;
  const progressPct = Math.round(progress * 100);

  const sparePart = ac?.requiredSparePart ? base.spareParts.find(p => p.id === ac.requiredSparePart) : undefined;
  const stalled   = !!sparePart && sparePart.quantity === 0;
  const partName  = sparePart?.name ?? "okänd komponent";

  const activitySteps = ac
    ? getVisibleSteps(ac.maintenanceType, remaining, estHours, crew, partName)
    : [];

  const history = getBayHistory(bay.id);

  const progressColor = progress < 0.8 ? "#22c55e" : progress < 0.95 ? AMBER : RED;
  const healthColor   = ac
    ? (ac.health < 30 ? RED : ac.health < 60 ? AMBER : "#22c55e")
    : "#22c55e";

  const sec = (label: string) => (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[9px] font-mono font-bold tracking-widest uppercase"
        style={{ color: "rgba(215,222,225,0.4)" }}>
        {label}
      </span>
    </div>
  );
  const divider = <div className="mx-4" style={{ height: 1, background: "rgba(215,222,225,0.07)" }} />;

  return (
    <div className="pb-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: "1px solid rgba(215,222,225,0.08)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: AMBER }}>{bay.label}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
            style={{
              background: ac ? "rgba(215,171,58,0.18)" : "rgba(100,116,139,0.18)",
              color: ac ? AMBER : "rgba(215,222,225,0.5)",
            }}>
            {ac ? "AKTIV" : "LEDIG"}
          </span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-white/10 transition-colors">
          <X className="h-3.5 w-3.5" style={{ color: "rgba(215,222,225,0.5)" }} />
        </button>
      </div>

      {ac ? (
        <>
          {/* ── Aircraft info ── */}
          {sec("Plan i bays")}
          <div className="px-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-base font-mono font-black" style={{ color: SILVER }}>{ac.tailNumber}</span>
              <span className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.55)" }}>
                {ac.type.replace("_", "/")}
              </span>
            </div>
            {/* Health bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.45)" }}>Hälsa</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: healthColor }}>{ac.health ?? "—"}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${ac.health ?? 0}%`, background: healthColor }} />
              </div>
            </div>
            {/* Work order */}
            <div className="rounded-lg p-3" style={{ background: "rgba(215,171,58,0.08)", border: "1px solid rgba(215,171,58,0.18)" }}>
              <div className="text-[10px] font-mono font-bold mb-0.5" style={{ color: AMBER }}>{label.title}</div>
              <div className="text-[10px] leading-relaxed" style={{ color: "rgba(215,222,225,0.7)" }}>{label.description}</div>
            </div>
          </div>

          {divider}

          {/* ── Progress ── */}
          {sec("Framsteg")}
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span style={{ color: "rgba(215,222,225,0.55)" }}>Återstår: <span style={{ color: progressColor }}>{remaining}h</span></span>
              <span style={{ color: progressColor, fontWeight: 700 }}>{progressPct}%</span>
              <span style={{ color: "rgba(215,222,225,0.55)" }}>Totalt: ~{estHours}h</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ background: progressColor }}
              />
            </div>
          </div>

          {divider}

          {/* ── Bottleneck warnings ── */}
          {(noMech || stalled) && (
            <>
              {sec("Flaskhalsar")}
              <div className="px-4 space-y-2">
                {noMech && (
                  <div className="rounded-lg p-3 flex items-start gap-2"
                    style={{ background: "rgba(217,25,46,0.1)", border: `1px solid rgba(217,25,46,0.3)` }}>
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: RED }} />
                    <div>
                      <div className="text-[9px] font-mono font-bold mb-0.5" style={{ color: RED }}>VÄNTAR PÅ PERSONAL</div>
                      <div className="text-[9px] leading-relaxed" style={{ color: "rgba(215,222,225,0.65)" }}>
                        Inga tillgängliga flygmekaniker. Arbetet är pausat tills personal frigörs.
                      </div>
                    </div>
                  </div>
                )}
                {stalled && (
                  <div className="rounded-lg p-3 flex items-start gap-2"
                    style={{ background: "rgba(217,25,46,0.1)", border: `1px solid rgba(217,25,46,0.3)` }}>
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: RED }} />
                    <div>
                      <div className="text-[9px] font-mono font-bold mb-0.5" style={{ color: RED }}>STALLAD — VÄNTAR PÅ RESERVDEL</div>
                      <div className="text-[9px] leading-relaxed" style={{ color: "rgba(215,222,225,0.65)" }}>
                        <span className="font-bold" style={{ color: SILVER }}>{partName}</span> saknas i lager.
                        Beräknad leverans: okänd.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {divider}
            </>
          )}

          {/* ── Live activity feed ── */}
          {sec("Live aktivitet")}
          <div className="px-4 space-y-2">
            {activitySteps.length === 0 ? (
              <div className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.4)" }}>
                Initierar arbetsorder…
              </div>
            ) : activitySteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {step.isLatest ? (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: step.isWarning ? RED : "#22c55e" }}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: step.isWarning ? "rgba(217,25,46,0.4)" : "rgba(34,197,94,0.3)" }} />
                )}
                <span className="text-[10px] leading-relaxed font-mono"
                  style={{ color: step.isWarning ? RED : step.isLatest ? SILVER : "rgba(215,222,225,0.55)" }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Empty bay ── */
        <div className="px-4 pt-4 space-y-3">
          <div className="rounded-lg p-3 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(215,222,225,0.15)" }}>
            <div className="text-[10px] font-mono font-bold mb-1" style={{ color: "rgba(215,222,225,0.6)" }}>
              LEDIG — Redo att ta emot plan
            </div>
            <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.35)" }}>
              Dra ett plan till denna plats för att påbörja underhåll
            </div>
          </div>
        </div>
      )}

      {/* ── Crew assignment (always shown) ── */}
      {divider}
      {sec("Tilldelat team")}
      <div className="px-4">
        <div className="rounded-lg p-3 space-y-2"
          style={{
            background: `${crew.color}0d`,
            borderLeft: `3px solid ${crew.color}`,
            border: `1px solid ${crew.color}22`,
            borderLeftWidth: 3,
          }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono font-bold" style={{ color: crew.color }}>{crew.name}</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.5)" }}>{crew.specialty}</div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
              style={{
                background: noMech ? "rgba(217,25,46,0.18)" : ac ? `${crew.color}22` : "rgba(255,255,255,0.07)",
                color: noMech ? RED : ac ? crew.color : "rgba(215,222,225,0.5)",
              }}>
              {noMech ? "VÄNTAR PÅ PERSONAL" : ac ? "AKTIV" : "TILLGÄNGLIG"}
            </span>
          </div>
          <div className="text-[9px] italic" style={{ color: "rgba(215,222,225,0.45)" }}>{crew.expertise}</div>
          <div className="space-y-1 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {crew.members.map((m, i) => {
              const Icon = i === 0 ? Wrench : i === 1 ? Cpu : Shield;
              return (
                <div key={m} className="flex items-center gap-2">
                  <Icon className="h-2.5 w-2.5 flex-shrink-0" style={{ color: `${crew.color}88` }} />
                  <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.7)" }}>{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Hangar history ── */}
      {divider}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <History className="h-3 w-3" style={{ color: "rgba(215,222,225,0.35)" }} />
        <span className="text-[9px] font-mono font-bold tracking-widest uppercase"
          style={{ color: "rgba(215,222,225,0.35)" }}>
          Tidigare i {bay.label}
        </span>
      </div>
      <div className="px-4 space-y-2">
        {history.map((h, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-1 flex-shrink-0 rounded-full mt-1" style={{ height: 20, background: "rgba(215,222,225,0.1)" }} />
            <div>
              <div className="text-[8px] font-mono mb-0.5" style={{ color: "rgba(215,222,225,0.3)" }}>{h.time}</div>
              <div className="text-[9px] font-mono leading-relaxed" style={{ color: "rgba(215,222,225,0.45)" }}>{h.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
