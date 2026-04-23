import { useRef, useState, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/context/GameContext";
import type { ATOOrder, AircraftType, BaseType, MissionType } from "@/types/game";
import {
  FileText, AlertTriangle, CheckCircle2, X,
  ChevronRight, Plane, Target, Eye, Shield, Radio, Zap,
} from "lucide-react";

// ─── SAAB Palette ─────────────────────────────────────────────────────────────
const NAVY   = "#0C234C";
const SILVER = "#D7DEE1";
const RED    = "#D9192E";
const AMBER  = "#D7AB3A";
const GREEN  = "#22c55e";

// ─── Mission type colors for timeline ─────────────────────────────────────────
const MISSION_COLORS: Record<string, string> = {
  QRA:       "#D9192E",   // red — immediate alert
  DCA:       "#0C234C",   // navy — defensive
  RECCE:     "#2563EB",   // blue — reconnaissance
  AEW:       "#7C3AED",   // purple — surveillance
  AI_DT:     "#D7AB3A",   // amber — attack daylight
  AI_ST:     "#EA580C",   // orange — attack strike
  ESCORT:    "#0891B2",   // cyan — escort
  TRANSPORT: "#6B7280",   // gray — transport
};

const MISSION_ICONS: Record<string, React.FC<{ className?: string }>> = {
  QRA: Target, DCA: Shield, RECCE: Eye,
  AEW: Radio, AI_DT: Zap, AI_ST: Zap, ESCORT: Shield, TRANSPORT: Plane,
};

// ─── Valid values ──────────────────────────────────────────────────────────────
const VALID_MISSION_TYPES = new Set(["DCA","QRA","RECCE","AEW","AI_DT","AI_ST","ESCORT","TRANSPORT"]);
const VALID_BASES         = new Set(["MOB","FOB_N","FOB_S","ROB_N","ROB_S","ROB_E"]);
const VALID_AC_TYPES      = new Set(["GripenE","GripenF_EA","GlobalEye","VLO_UCAV","LOTUS"]);

// ─── CSV Parsing ───────────────────────────────────────────────────────────────

export type ParsedRow = {
  raw: string;
  rowNum: number;
  ok: boolean;
  errors: string[];
  risks: string[];                                      // Digital-twin health warnings
  order?: Omit<ATOOrder, "id" | "status" | "assignedAircraft">;
};

/**
 * Expected CSV columns (header row required, case-insensitive):
 *   MissionID, Type, Base, Count, StartTime, EndTime, Priority[, AircraftType][, Payload]
 *
 * StartTime / EndTime = integer hours 0-23 (e.g. 6 or 14)
 */
function parseCSV(csv: string, allAircraft: { tailNumber: string; health: number; base: string }[], day: number): ParsedRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw   = lines[i];
    const cells = lines[i].split(",").map(c => c.trim());
    const errors: string[] = [];
    const risks:  string[] = [];

    const get = (name: string) => cells[col(name)] ?? "";

    const missionId   = get("missionid")  || `M${String(i).padStart(3,"0")}`;
    const typeRaw     = get("type").toUpperCase();
    const baseRaw     = get("base").toUpperCase().replace(/ /g,"_");
    const countRaw    = parseInt(get("count"), 10);
    const startRaw    = parseInt(get("starttime"), 10);
    const endRaw      = parseInt(get("endtime"), 10);
    const priorityRaw = get("priority").toLowerCase() || "medium";
    const acTypeRaw   = get("aircrafttype") || "";
    const payload     = get("payload") || undefined;

    // Validate type
    if (!VALID_MISSION_TYPES.has(typeRaw)) {
      errors.push(`Okänd uppdragstyp: "${typeRaw}"`);
    }
    // Validate base
    if (!VALID_BASES.has(baseRaw)) {
      errors.push(`Okänd bas: "${baseRaw}"`);
    }
    // Validate count
    if (isNaN(countRaw) || countRaw < 1) {
      errors.push("Count måste vara ≥ 1");
    }
    // Validate times
    if (isNaN(startRaw) || startRaw < 0 || startRaw > 23) {
      errors.push("StartTime måste vara 0–23");
    }
    if (isNaN(endRaw) || endRaw <= startRaw || endRaw > 24) {
      errors.push("EndTime måste vara > StartTime och ≤ 24");
    }
    // Validate priority
    const priority = ["high","medium","low"].includes(priorityRaw)
      ? (priorityRaw as "high" | "medium" | "low")
      : "medium";

    // Validate aircraft type (optional)
    const aircraftType = acTypeRaw && VALID_AC_TYPES.has(acTypeRaw)
      ? (acTypeRaw as AircraftType)
      : undefined;

    // ── Digital twin health validation ────────────────────────────────────────
    // If AircraftID column present, check each specified aircraft
    if (col("aircraftid") >= 0) {
      const aircraftIds = get("aircraftid").split("|").map(s => s.trim()).filter(Boolean);
      aircraftIds.forEach(tailNum => {
        const found = allAircraft.find(a => a.tailNumber === tailNum);
        if (!found) {
          risks.push(`${tailNum} hittades inte i flottan`);
        } else if (found.health < 50) {
          risks.push(`RISK: ${tailNum} CHI ${found.health}% < 50% — Maintenance Required`);
        }
      });
    }

    const ok = errors.length === 0;

    rows.push({
      raw,
      rowNum: i,
      ok,
      errors,
      risks,
      order: ok ? {
        day,
        missionType:   typeRaw as MissionType,
        label:         missionId,
        startHour:     startRaw,
        endHour:       endRaw,
        requiredCount: countRaw,
        aircraftType,
        payload,
        launchBase:    baseRaw as BaseType,
        priority,
      } : undefined,
    });
  }

  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SAMPLE_CSV = `MissionID,Type,Base,Count,StartTime,EndTime,Priority,AircraftType,Payload
M001,QRA,MOB,2,6,10,high,GripenE,IRIS-T
M002,RECCE,FOB_N,2,8,12,medium,GripenE,SPANING-POD
M003,DCA,MOB,4,12,18,high,GripenE,IRIS-T + Meteor
M004,AI_DT,FOB_S,4,8,11,high,GripenE,GBU-39`;

export function ATOImporter({ onImportComplete, triggerRef }: { onImportComplete?: () => void; triggerRef?: React.RefObject<{ triggerFileInput: () => void } | null> } = {}) {
  const { state, importATOBatch } = useGame();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [rows,    setRows]    = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [imported, setImported] = useState(false);
  const [dragging, setDragging] = useState(false);

  useImperativeHandle(triggerRef, () => ({
    triggerFileInput: () => fileRef.current?.click(),
  }));

  // Flat aircraft list for digital twin lookup
  const allAircraft = state.bases.flatMap(b =>
    b.aircraft.map(ac => ({ tailNumber: ac.tailNumber, health: ac.health ?? 100, base: b.id }))
  );

  function handleFile(file: File) {
    setFileName(file.name);
    setImported(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? "";
      setRows(parseCSV(text, allAircraft, state.day));
    };
    reader.readAsText(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) handleFile(file);
  }

  function handleConfirm() {
    if (!rows) return;
    const validOrders = rows.filter(r => r.ok && r.order).map(r => r.order!);
    const riskCount   = rows.filter(r => r.risks.length > 0).length;
    importATOBatch(validOrders, fileName || "ato.csv", riskCount);
    setImported(true);
    onImportComplete?.();
  }

  function handleLoadSample() {
    setFileName("sample_ato.csv");
    setImported(false);
    setRows(parseCSV(SAMPLE_CSV, allAircraft, state.day));
  }

  const validRows   = rows?.filter(r => r.ok) ?? [];
  const errorRows   = rows?.filter(r => !r.ok) ?? [];
  const riskRows    = rows?.filter(r => r.risks.length > 0) ?? [];

  return (
    <>
      {/* Hidden file input triggered by CSV button */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* ── Empty state drop zone ── */}
      {!rows && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-8 px-4 text-center transition-all"
          style={{
            borderColor: dragging ? AMBER : `${NAVY}30`,
            background: dragging ? `${AMBER}08` : `${NAVY}04`,
          }}
        >
          <FileText className="h-7 w-7 opacity-40" style={{ color: NAVY }} />
          <p className="text-[10px] font-mono" style={{ color: "hsl(218 15% 50%)" }}>
            Dra och släpp en CSV-fil här, eller klicka på <strong>CSV</strong>-knappen ovan
          </p>
          <p className="text-[8px] font-mono opacity-60" style={{ color: NAVY }}>
            Kolumner: MissionID, Type, Base, Count, StartTime, EndTime, Priority [, AircraftType] [, Payload]
          </p>
          <button
            onClick={handleLoadSample}
            className="text-[9px] font-mono px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
            style={{ background: `${NAVY}12`, color: NAVY, border: `1px solid ${NAVY}25` }}
          >
            Ladda exempeldata
          </button>
        </div>
      )}

      {/* ── Parse result ── */}
      <AnimatePresence>
        {rows && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {/* Summary bar */}
            <div
              className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-mono"
              style={{ background: `${NAVY}07`, border: `1px solid ${NAVY}18` }}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: NAVY }} />
              <span className="font-bold" style={{ color: NAVY }}>{fileName}</span>
              <span style={{ color: GREEN }}>
                <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
                {validRows.length} giltiga
              </span>
              {errorRows.length > 0 && (
                <span style={{ color: RED }}>
                  <X className="inline h-3 w-3 mr-0.5" />
                  {errorRows.length} fel
                </span>
              )}
              {riskRows.length > 0 && (
                <span style={{ color: AMBER }}>
                  <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                  {riskRows.length} RISK
                </span>
              )}
              <span className="ml-auto" style={{ color: "hsl(218 15% 50%)" }}>Dag {state.day}</span>
            </div>

            {/* Row list */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {rows.map((row, i) => {
                const Icon = MISSION_ICONS[row.order?.missionType ?? ""] ?? Plane;
                const color = MISSION_COLORS[row.order?.missionType ?? ""] ?? NAVY;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-lg px-3 py-2 space-y-1"
                    style={{
                      background: row.ok ? `${color}08` : `${RED}07`,
                      border: `1px solid ${row.ok ? (row.risks.length > 0 ? AMBER : color) : RED}30`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {row.ok
                        ? <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                        : <X className="h-3.5 w-3.5 shrink-0" style={{ color: RED }} />
                      }
                      <span className="text-[10px] font-mono font-bold" style={{ color: row.ok ? color : RED }}>
                        {row.order?.label ?? `Rad ${row.rowNum}`}
                      </span>
                      {row.ok && (
                        <>
                          <span
                            className="text-[8px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `${color}18`, color }}
                          >
                            {row.order!.missionType}
                          </span>
                          <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
                            {row.order!.launchBase} · {row.order!.requiredCount} fpl
                          </span>
                          <span className="text-[8px] font-mono ml-auto" style={{ color: "hsl(218 15% 55%)" }}>
                            {String(row.order!.startHour).padStart(2,"0")}:00–{String(row.order!.endHour).padStart(2,"0")}:00
                          </span>
                        </>
                      )}
                      {/* Priority badge */}
                      {row.ok && (
                        <span
                          className="text-[7px] font-mono px-1 py-0.5 rounded"
                          style={{
                            background: row.order!.priority === "high" ? `${RED}15` : row.order!.priority === "medium" ? `${AMBER}15` : `${NAVY}10`,
                            color: row.order!.priority === "high" ? RED : row.order!.priority === "medium" ? AMBER : NAVY,
                          }}
                        >
                          {row.order!.priority.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Risk flags */}
                    {row.risks.map((risk, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[8px] font-mono" style={{ color: AMBER }}>
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                        {risk}
                      </div>
                    ))}

                    {/* Errors */}
                    {row.errors.map((err, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[8px] font-mono" style={{ color: RED }}>
                        <X className="h-2.5 w-2.5 shrink-0" />
                        {err}
                      </div>
                    ))}
                  </motion.div>
                );
              })}
            </div>

            {/* Timeline preview */}
            {validRows.length > 0 && (
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: `${NAVY}05`, border: `1px solid ${NAVY}14` }}
              >
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: NAVY }}>
                  TIDSLINJE FÖRHANDSVISNING — DAG {state.day}
                </div>
                {/* Hour ruler — shared container with rows so labels align */}
                <div className="flex flex-col gap-1">
                  {/* Label row — 0 to 24 */}
                  <div className="flex items-center">
                    <div className="w-[112px] shrink-0" />
                    <div className="flex-1 flex text-[7px] font-mono" style={{ color: "hsl(218 15% 50%)" }}>
                      {Array.from({ length: 25 }, (_, i) => i).map(h => (
                        <div key={h} className="flex-1 text-center">{String(h).padStart(2,"0")}</div>
                      ))}
                    </div>
                  </div>
                  {/* Mission rows */}
                  <div className="space-y-1">
                  {validRows.map((row, i) => {
                    const color = MISSION_COLORS[row.order!.missionType] ?? NAVY;
                    const timelineStart = 0;
                    const timelineEnd = 24;
                    const totalSlots = timelineEnd - timelineStart; // 24
                    const startOffset = row.order!.startHour - timelineStart;
                    const duration = row.order!.endHour - row.order!.startHour;
                    const leftPct = (startOffset / totalSlots) * 100;
                    const widthPct = (duration / totalSlots) * 100;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-[112px] shrink-0 flex items-center gap-1.5">
                          <span
                            className="text-[8px] font-mono font-bold truncate"
                            style={{ color }}
                          >
                            {row.order!.label}
                          </span>
                          {row.risks.length > 0 && (
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" style={{ color: AMBER }} />
                          )}
                        </div>
                        <div className="flex-1 relative h-5 rounded" style={{ background: `${NAVY}0A` }}>
                          {/* Start marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 rounded"
                            style={{ left: `${leftPct}%`, background: color, opacity: 0.6 }}
                          />
                          {/* Mission bar */}
                          <div
                            className="absolute top-0.5 bottom-0.5 rounded flex items-center justify-center text-[7px] font-mono font-bold text-white overflow-hidden"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 4)}%`,
                              background: color,
                              opacity: row.risks.length > 0 ? 0.7 : 1,
                              border: `2px solid ${color}`,
                              boxShadow: `0 0 4px ${color}60`,
                            }}
                          >
                            {row.order!.missionType}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              {imported ? (
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono font-bold"
                  style={{ background: `${GREEN}18`, border: `1px solid ${GREEN}40`, color: GREEN }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {validRows.length} uppdrag importerade till ATO-plan
                </div>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-mono font-bold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: NAVY, color: SILVER }}
                >
                  <ChevronRight className="h-4 w-4" />
                  Importera {validRows.length} uppdrag
                </button>
              )}
              <button
                onClick={() => { setRows(null); setFileName(""); setImported(false); }}
                className="px-3 py-2 rounded-lg text-[10px] font-mono transition-all hover:brightness-110"
                style={{ background: `${NAVY}0E`, color: NAVY, border: `1px solid ${NAVY}20` }}
              >
                Rensa
              </button>
              {riskRows.length > 0 && !imported && (
                <span className="text-[8px] font-mono ml-auto" style={{ color: AMBER }}>
                  ⚠ {riskRows.length} uppdrag med RISK importeras med flagga
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
