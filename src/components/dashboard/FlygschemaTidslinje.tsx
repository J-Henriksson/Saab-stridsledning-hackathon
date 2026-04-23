import { useState } from "react";
import { ATOOrder, Base, Aircraft } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FlygschemaTidslinjeProps {
  base: Base;
  hour: number;
  atoOrders?: ATOOrder[];
}

interface Slot {
  label: string;
  start: number;
  end: number;
  color: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const MISSION_TYPES = ["QRA", "DCA", "RECCE", "AI_DT", "ESCORT", "AEW"];
const MISSION_LABELS = new Set(["MISSION", ...MISSION_TYPES]);
const SERVICE_LABELS = new Set(["Service", "Major Maintenance", "forebyggande"]);
const MAINT_WAIT_LABELS = new Set(["avhjalpande", "NMC"]);

type ActivityType = "MISSION" | "GROUND" | "SERVICE" | "MAINT_WAIT";

type ActivityBlock = {
  type: ActivityType;
  start_time: number;
  end_time: number;
  label: string;
};

type FlygschemaEntry = {
  aircraftId: string;
  currentLife: number;
  status: Aircraft["status"];
  blocks: ActivityBlock[];
};

type LifeSeriesPoint = { t: number; [key: string]: number };

function mapScheduleToSeries(
  flygschema: FlygschemaEntry[],
  maxLife = 100,
  resolutionMinutes = 60,
  visualWearMultiplier = 10,
  offsetByAircraft: Record<string, number> = {},
): LifeSeriesPoint[] {
  const step = resolutionMinutes / 60;
  const times: number[] = [];
  for (let t = 0; t <= 168 + 1e-6; t += step) times.push(Number(t.toFixed(4)));

  const series: LifeSeriesPoint[] = times.map((t) => ({ t }));

  flygschema.forEach((ac) => {
    let life = clamp(ac.currentLife, 0, maxLife);
    const offset = offsetByAircraft[ac.aircraftId] ?? 0;
    const blocks = [...ac.blocks].sort((a, b) => a.start_time - b.start_time);
    let blockIdx = 0;
    let current: ActivityBlock | undefined = blocks[blockIdx];

    for (let i = 0; i < times.length; i += 1) {
      const t = times[i];

      while (current && t >= current.end_time - 1e-6) {
        if (current.type === "SERVICE") {
          life = maxLife;
        }
        blockIdx += 1;
        current = blocks[blockIdx];
      }

      if (current && t >= current.start_time - 1e-6) {
        if (current.type === "MISSION") {
          life = clamp(life - step * visualWearMultiplier, 0, maxLife);
        }
      }

      series[i][ac.aircraftId] = Number(clamp(life + offset, 0, maxLife).toFixed(3));
    }
  });

  return series;
}

function getSlots(ac: Aircraft, hour: number, atoOrders?: ATOOrder[]): Slot[] {
  const hash = parseInt(ac.id.replace(/\D/g, "")) || 1;

  const assignedOrder = atoOrders?.find(
    (o) => o.assignedAircraft.includes(ac.id) && (o.status === "assigned" || o.status === "dispatched")
  );

  if (assignedOrder && (ac.status === "ready" || ac.status === "on_mission")) {
    return [
      { label: "Pre", start: Math.max(6, assignedOrder.startHour - 1), end: assignedOrder.startHour, color: "#7c3aed" },
      { label: assignedOrder.missionType, start: assignedOrder.startHour, end: assignedOrder.endHour, color: "#2563eb" },
      { label: "Post-flt", start: assignedOrder.endHour, end: Math.min(22, assignedOrder.endHour + 1), color: "#ea580c" },
    ];
  }

  if (ac.status === "on_mission") {
    const mStart = Math.max(6, hour - 2);
    const mEnd = Math.min(22, hour + 3);
    return [
      { label: "Pre", start: Math.max(6, mStart - 1), end: mStart, color: "#7c3aed" },
      { label: ac.currentMission || "MISSION", start: mStart, end: mEnd, color: "#2563eb" },
      { label: "Post-flt", start: mEnd, end: Math.min(22, mEnd + 1), color: "#ea580c" },
    ];
  }

  if (ac.status === "ready") {
    const mStart = 6 + (hash % 9);
    const mLen = 2 + (hash % 3);
    const mEnd = Math.min(21, mStart + mLen);
    if (mStart >= 20) return [];
    const preStart = Math.max(6, mStart - 1);
    const postEnd = Math.min(22, mEnd + 1);
    return [
      { label: "Pre", start: preStart, end: mStart, color: "#7c3aed" },
      { label: MISSION_TYPES[hash % MISSION_TYPES.length], start: mStart, end: mEnd, color: "#2563eb" },
      { label: "Post-flt", start: mEnd, end: postEnd, color: "#ea580c" },
    ];
  }

  if (ac.status === "under_maintenance") {
    const isCorrective = (ac.maintenanceType || "").includes("corrective") || ac.hoursToService < 15;
    return [{
      label: isCorrective ? "avhjalpande" : "forebyggande",
      start: 6, end: 22,
      color: isCorrective ? "#dc2626" : "#d97706",
    }];
  }

  if (ac.status === "unavailable") {
    return [{ label: "NMC", start: 6, end: 22, color: "#dc2626" }];
  }

  return [];
}

const WEEK_DAY_NAMES = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function buildWeekBlocks(ac: Aircraft, hour: number, atoOrders?: ATOOrder[]): ActivityBlock[] {
  const hash = parseInt(ac.id.replace(/\D/g, "")) || 1;
  const allBlocks: ActivityBlock[] = [];

  for (let d = 0; d < 7; d++) {
    const offset = d * 24;

    // Insert a scheduled service mid-week for some aircraft
    if (d === (hash % 4) + 2 && ac.status !== "unavailable") {
      allBlocks.push({ type: "SERVICE", start_time: 7 + offset, end_time: 16 + offset, label: "forebyggande" });
      continue;
    }

    // No flying on one rest day per aircraft (varies)
    if (d === (hash % 6) && ac.status === "ready") continue;

    // Get slots for this day (use a varied hour to spread missions across the day)
    const dayHour = d === 0 ? hour : 8 + ((hash + d * 3) % 8);
    const slots = getSlots(ac, dayHour, d === 0 ? atoOrders : undefined);

    slots.forEach((slot) => {
      const raw = slot.label?.trim();
      const start = slot.start + offset;
      const end = slot.end + offset;
      let type: ActivityType = "GROUND";
      if (MISSION_LABELS.has(raw) || MISSION_TYPES.includes(raw)) type = "MISSION";
      else if (SERVICE_LABELS.has(raw)) type = "SERVICE";
      else if (MAINT_WAIT_LABELS.has(raw)) type = "MAINT_WAIT";
      allBlocks.push({ type, start_time: start, end_time: end, label: raw });
    });
  }

  return allBlocks;
}

export function FlygschemaTidslinje({ base, hour, atoOrders }: FlygschemaTidslinjeProps) {
  const [selectedAc, setSelectedAc] = useState<string | null>(null);
  const [hoveredAc, setHoveredAc] = useState<string | null>(null);
  const [crosshair, setCrosshair] = useState<{ svgX: number; t: number } | null>(null);
  const effectiveAc = selectedAc ?? hoveredAc;

  const START = 6, END = 22, SPAN = 16;
  const hourMarks = [6, 8, 10, 12, 14, 16, 18, 20, 22];

  const pct = (h: number) => `${((Math.max(START, Math.min(END, h)) - START) / SPAN) * 100}%`;
  const wPct = (s: number, e: number) =>
    `${((Math.min(e, END) - Math.max(s, START)) / SPAN) * 100}%`;

  const freeSlots = base.maintenanceBays.total - base.maintenanceBays.occupied;

  const flygschema: FlygschemaEntry[] = base.aircraft.map((ac) => {
    const blocks = buildWeekBlocks(ac, hour, atoOrders);
    return {
      aircraftId: ac.tailNumber,
      currentLife: ac.hoursToService,
      status: ac.status,
      blocks,
    };
  });

  const offsets: Record<string, number> = {};
  flygschema.forEach((ac, i) => {
    offsets[ac.aircraftId] = (i % 2 === 0 ? 1 : -1) * (1 + (i % 3));
  });

  const chartW = 800;
  const chartH = 280;
  const m = { l: 56, r: 60, t: 18, b: 32 };

  const AC_LINE_COLORS = [
    "#2563EB",
    "#059669",
    "#D97706",
    "#DC2626",
    "#7C3AED",
    "#0891B2",
    "#EA580C",
    "#DB2777",
  ];
  const xScale = (v: number) => m.l + ((v - 0) / 168) * (chartW - m.l - m.r);
  const yScale = (v: number) => m.t + (1 - (v - 0) / 100) * (chartH - m.t - m.b);

  const xTicks = [0, 24, 48, 72, 96, 120, 144, 168];
  const yTicks = [0, 25, 50, 75, 100];

  const lifeSeries = mapScheduleToSeries(flygschema, 100, 60, 10, offsets);

  const labelTargets = flygschema.map((ac, i) => {
    const lastPoint = lifeSeries[lifeSeries.length - 1];
    const value = lastPoint?.[ac.aircraftId] ?? ac.currentLife;
    const desiredY = yScale(value);
    return { id: ac.aircraftId, desiredY, value, idx: i };
  });

  const sortedLabels = [...labelTargets].sort((a, b) => a.desiredY - b.desiredY);
  const minGap = 8;
  const labelYMap: Record<string, number> = {};
  const labelValueMap: Record<string, number> = {};
  let lastY = -Infinity;
  sortedLabels.forEach((lbl) => {
    const y = Math.max(lbl.desiredY, lastY + minGap);
    labelYMap[lbl.id] = clamp(y, m.t + 6, chartH - m.b - 6);
    labelValueMap[lbl.id] = lbl.value;
    lastY = labelYMap[lbl.id];
  });

  return (
    <div className="space-y-2">
      {/* Service capacity banner */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200/70 rounded-lg text-[10px] font-mono">
        <span className="text-blue-800 font-bold">Servicekapacitet:</span>
        <span className="text-blue-700">
          {base.maintenanceBays.occupied}/{base.maintenanceBays.total} platser upptagna
        </span>
        <span className={`flex items-center gap-1 font-bold ${freeSlots > 0 ? "text-green-700" : "text-red-700"}`}>
          {freeSlots > 0
            ? `✓ ${freeSlots} ledig serviceplats – kan ta in fler!`
            : "⚠ Alla serviceplatser fulla"}
        </span>
        <span className="ml-auto text-muted-foreground">Nästa föreslagna: —</span>
      </div>

      {/* Hour-axis header */}
      <div className="flex items-end">
        <div className="w-[100px] shrink-0" />
        <div className="flex-1 relative h-5">
          {hourMarks.map((h) => (
            <div
              key={h}
              className={`absolute text-[8px] font-mono -translate-x-1/2 ${
                h === hour ? "text-primary font-bold" : "text-muted-foreground"
              }`}
              style={{ left: pct(h) }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="w-14 shrink-0 text-[8px] font-mono text-right text-muted-foreground pr-1">
          Till 100h
        </div>
      </div>

      {/* Aircraft rows */}
      <div className="space-y-0.5">
        {base.aircraft.map((ac, i) => {
          const slots = getSlots(ac, hour, atoOrders);
          const isCritical = ac.hoursToService < 20;
          const isLow = ac.hoursToService < 40;
          const isSelected = selectedAc === ac.id;

          return (
            <motion.div
              key={ac.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              {/* Row */}
              <div
                className={`flex items-center rounded cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                }`}
                onClick={() => setSelectedAc(isSelected ? null : ac.id)}
                onMouseEnter={() => setHoveredAc(ac.tailNumber)}
                onMouseLeave={() => setHoveredAc(null)}
              >
                {/* Aircraft label */}
                <div className="w-[100px] shrink-0 px-1.5 py-0.5 flex items-center gap-1">
                  {isCritical || ac.status === "unavailable" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  ) : isLow ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold text-foreground leading-tight truncate">
                      {ac.tailNumber}
                    </div>
                    <div className="text-[7px] text-muted-foreground truncate">{ac.type}</div>
                  </div>
                  {isSelected ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto shrink-0" />
                  )}
                </div>

                {/* Timeline track */}
                <div className="flex-1 relative h-6">
                  <div className="absolute inset-0 bg-muted/30 rounded" />

                  {/* Hour grid lines */}
                  {hourMarks.slice(1, -1).map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-border/50"
                      style={{ left: pct(h) }}
                    />
                  ))}

                  {/* Current-time marker */}
                  {hour >= START && hour <= END && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10"
                      style={{ left: pct(hour) }}
                    />
                  )}

                  {/* Mission slots */}
                  {slots.map((slot, j) => (
                    <div
                      key={j}
                      className="absolute top-0.5 bottom-0.5 rounded flex items-center justify-center overflow-hidden"
                      style={{
                        left: pct(slot.start),
                        width: wPct(slot.start, slot.end),
                        backgroundColor: slot.color,
                        minWidth: 4,
                      }}
                    >
                      <span className="text-[7px] font-bold text-white truncate px-1">
                        {slot.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hours to service */}
                <div className="w-14 shrink-0 text-right px-1">
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isCritical
                        ? "text-red-600"
                        : isLow
                        ? "text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {ac.hoursToService}h
                  </span>
                </div>
              </div>

              {/* Expanded detail row */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-[100px] mr-14 bg-blue-50 border border-blue-200/60 rounded p-2.5 mb-0.5 space-y-2">
                      {/* Status row */}
                      <div className="flex flex-wrap gap-3 text-[9px] font-mono">
                        <span>
                          <span className="text-muted-foreground">Status: </span>
                          <span className="font-bold uppercase">
                            {ac.status.replace(/_/g, " ")}
                          </span>
                        </span>
                        {ac.currentMission && (
                          <span>
                            <span className="text-muted-foreground">Uppdrag: </span>
                            <span className="font-bold text-blue-700">{ac.currentMission}</span>
                          </span>
                        )}
                        {ac.maintenanceType && (
                          <span>
                            <span className="text-muted-foreground">Underhåll: </span>
                            <span className="font-bold">{ac.maintenanceType.replace(/_/g, " ")}</span>
                          </span>
                        )}
                        {ac.maintenanceTimeRemaining !== undefined && (
                          <span>
                            <span className="text-muted-foreground">Kvar: </span>
                            <span className="font-bold">{ac.maintenanceTimeRemaining}h</span>
                          </span>
                        )}
                        <span>
                          <span className="text-muted-foreground">Total flygtid: </span>
                          <span className="font-bold">{ac.flightHours}h</span>
                        </span>
                      </div>

                      {/* Remaining life bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-muted-foreground font-mono w-20 shrink-0">
                          Remaining life
                        </span>
                        <div className="flex-1 h-2 bg-white border border-border rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isCritical
                                ? "bg-red-500"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (ac.hoursToService / 100) * 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold w-8 text-right ${
                            isCritical
                              ? "text-red-600"
                              : isLow
                              ? "text-amber-600"
                              : "text-foreground"
                          }`}
                        >
                          {ac.hoursToService}h
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-border">
        {[
          { color: "#2563eb", label: "Uppdrag" },
          { color: "#16a34a", label: "Standby" },
          { color: "#d97706", label: "Underhåll" },
          { color: "#dc2626", label: "NMC" },
          { color: "#7c3aed", label: "Pre-flight" },
          { color: "#ea580c", label: "Post-flight" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground">
            <span
              className="w-3 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: item.color, display: "inline-block" }}
            />
            {item.label}
          </span>
        ))}
        <span className="text-[8px] font-mono text-muted-foreground">
          <span className="text-red-500">●</span> &lt;10h till service
          <span className="text-amber-500 ml-2">●</span> &lt;20h till service
        </span>
        <span className="text-[8px] font-mono text-muted-foreground ml-auto">
          Siffra höger = timmar kvar till 100h-service
        </span>
      </div>

      {/* Uptime vs life chart */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono font-bold text-foreground">
            UPTIME — FLYGTID I LUFTEN vs LIVSLÄNGD
          </div>
          <div className="text-[9px] font-mono text-muted-foreground">
            Storlek = flygtid idag · Y = kvarvarande liv · X = kalendertid (total flygtid)
          </div>
        </div>
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-auto"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * chartW;
              const t = ((svgX - m.l) / (chartW - m.l - m.r)) * 168;
              if (t >= 0 && t <= 168) setCrosshair({ svgX, t });
            }}
            onMouseLeave={() => { setHoveredAc(null); setCrosshair(null); }}
            onClick={() => setSelectedAc(null)}
          >
            {/* Grid */}
            {yTicks.map((tick, i) => {
              const y = yScale(tick);
              return (
                <line key={`y-${i}`} x1={m.l} y1={y} x2={chartW - m.r} y2={y} stroke="rgba(100,116,139,0.12)" strokeWidth="1" />
              );
            })}
            {xTicks.map((tick, i) => {
              const x = xScale(tick);
              return (
                <line key={`x-${i}`} x1={x} y1={m.t} x2={x} y2={chartH - m.b} stroke="rgba(100,116,139,0.10)" strokeWidth="1" />
              );
            })}

            {/* Day separator bands (alternating subtle shading) */}
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const x1 = xScale(d * 24);
              const x2 = xScale((d + 1) * 24);
              return d % 2 === 1 ? (
                <rect key={`band-${d}`} x={x1} y={m.t} width={x2 - x1} height={chartH - m.t - m.b} fill="rgba(100,116,139,0.05)" />
              ) : null;
            })}

            {/* Axes */}
            <line x1={m.l} y1={m.t} x2={m.l} y2={chartH - m.b} stroke="rgba(30,41,59,0.45)" strokeWidth="1.2" />
            <line x1={m.l} y1={chartH - m.b} x2={chartW - m.r} y2={chartH - m.b} stroke="rgba(30,41,59,0.45)" strokeWidth="1.2" />

            {/* Y ticks */}
            {yTicks.map((tick, i) => {
              const y = yScale(tick);
              return (
                <text key={`yt-${i}`} x={m.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="rgba(51,65,85,0.8)" fontFamily="monospace">
                  {Math.round(tick)}
                </text>
              );
            })}

            {/* X ticks — day names */}
            {xTicks.map((tick, i) => {
              const x = xScale(tick);
              const dayLabel = tick < 168 ? WEEK_DAY_NAMES[tick / 24] : "";
              return (
                <text key={`xt-${i}`} x={x} y={chartH - m.b + 14} textAnchor="middle" fontSize="9" fill="rgba(51,65,85,0.8)" fontFamily="monospace" fontWeight={dayLabel ? "600" : "400"}>
                  {dayLabel}
                </text>
              );
            })}

            {/* Axis labels */}
            <text x={chartW / 2} y={chartH - 4} textAnchor="middle" fontSize="9" fill="rgba(51,65,85,0.6)" fontFamily="monospace">
              Veckodag (Mån–Sön)
            </text>
            <text
              x={12}
              y={chartH / 2}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(51,65,85,0.8)"
              fontFamily="monospace"
              transform={`rotate(-90 12 ${chartH / 2})`}
            >
              Kvarvarande liv (h)
            </text>

            {/* Lines — non-active first so active renders on top */}
            {[...flygschema]
              .sort((a, b) => (a.aircraftId === effectiveAc ? 1 : b.aircraftId === effectiveAc ? -1 : 0))
              .map((ac) => {
                const i = flygschema.findIndex((f) => f.aircraftId === ac.aircraftId);
                const stroke = AC_LINE_COLORS[i % AC_LINE_COLORS.length];
                const isActive = effectiveAc === ac.aircraftId;
                const isLocked = selectedAc === ac.aircraftId;
                const points = lifeSeries
                  .map((d) => `${xScale(d.t)},${yScale(d[ac.aircraftId] ?? ac.currentLife)}`)
                  .join(" ");
                const labelY = labelYMap[ac.aircraftId] ?? yScale(ac.currentLife);
                const labelValue = Math.round(labelValueMap[ac.aircraftId] ?? ac.currentLife);
                return (
                  <g
                    key={`life-${ac.aircraftId}`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredAc(ac.aircraftId)}
                    onMouseLeave={() => setHoveredAc(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAc((prev) => (prev === ac.aircraftId ? null : ac.aircraftId));
                    }}
                  >
                    {/* Wide transparent hit area */}
                    <polyline points={points} fill="none" stroke="transparent" strokeWidth="18" />
                    {/* Visible line */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isActive ? 3.5 : 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isActive ? 1 : effectiveAc ? 0.07 : 0.7}
                    />
                    {/* Label pill — shown when active */}
                    {isActive && (
                      <g>
                        <rect x={chartW - m.r + 3} y={labelY - 9} width={m.r - 6} height={18} rx="3" fill={stroke} opacity={isLocked ? 0.3 : 0.15} />
                        <text x={chartW - m.r + (m.r - 6) / 2 + 3} y={labelY - 1} textAnchor="middle" fontSize="8" fill={stroke} fontFamily="monospace" fontWeight="700">
                          {ac.aircraftId}
                        </text>
                        <text x={chartW - m.r + (m.r - 6) / 2 + 3} y={labelY + 8} textAnchor="middle" fontSize="7" fill="rgba(30,41,59,0.65)" fontFamily="monospace">
                          {labelValue}h
                        </text>
                        {/* Lock indicator dot at end of line */}
                        <circle cx={xScale(168)} cy={yScale(labelValue)} r={isLocked ? 5 : 3.5} fill={stroke} opacity="0.9" />
                        {isLocked && <circle cx={xScale(168)} cy={yScale(labelValue)} r="8" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.4" />}
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Crosshair + tooltip */}
            {crosshair && (() => {
              const { svgX, t } = crosshair;
              const clampedT = Math.max(0, Math.min(168, t));
              const dayIndex = Math.min(6, Math.floor(clampedT / 24));
              const hourOfDay = clampedT % 24;
              const dayName = WEEK_DAY_NAMES[dayIndex];
              const timeLabel = `${dayName} ${String(Math.floor(hourOfDay)).padStart(2, "0")}:${String(Math.round((hourOfDay % 1) * 60)).padStart(2, "0")}`;

              const closest = lifeSeries.reduce((prev, cur) =>
                Math.abs(cur.t - clampedT) < Math.abs(prev.t - clampedT) ? cur : prev
              );

              const activeIdx = effectiveAc ? flygschema.findIndex((f) => f.aircraftId === effectiveAc) : -1;
              const activeStroke = activeIdx >= 0 ? AC_LINE_COLORS[activeIdx % AC_LINE_COLORS.length] : null;
              const lifeVal = effectiveAc ? Math.round(closest[effectiveAc] ?? 0) : null;
              const dotY = effectiveAc ? yScale(closest[effectiveAc] ?? 0) : null;

              const isLocked = selectedAc !== null;
              const tipW = effectiveAc ? 110 : 80;
              const tipH = effectiveAc ? 42 : 24;
              const tipX = svgX + 8 + tipW > chartW - m.r ? svgX - tipW - 8 : svgX + 8;
              const tipY = m.t + 4;

              return (
                <g pointerEvents="none">
                  {/* Crosshair line */}
                  <line
                    x1={svgX} y1={m.t} x2={svgX} y2={chartH - m.b}
                    stroke={isLocked ? "rgba(30,41,59,0.5)" : "rgba(30,41,59,0.25)"}
                    strokeWidth={isLocked ? 1.5 : 1}
                    strokeDasharray={isLocked ? "4 2" : "3 3"}
                  />

                  {/* Dot on active line at cursor position */}
                  {dotY !== null && activeStroke && (
                    <>
                      <circle cx={svgX} cy={dotY} r="5" fill={activeStroke} opacity="0.9" />
                      <circle cx={svgX} cy={dotY} r="9" fill="none" stroke={activeStroke} strokeWidth="1.5" opacity="0.35" />
                    </>
                  )}

                  {/* Tooltip */}
                  <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="4" fill="white" stroke={isLocked ? "rgba(30,41,59,0.3)" : "rgba(100,116,139,0.3)"} strokeWidth={isLocked ? 1.5 : 1} />
                  {isLocked && (
                    <rect x={tipX} y={tipY} width={tipW} height={4} rx="2" fill="rgba(30,41,59,0.15)" />
                  )}
                  <text x={tipX + tipW / 2} y={tipY + 16} textAnchor="middle" fontSize="9" fill="rgba(30,41,59,0.85)" fontFamily="monospace" fontWeight="600">
                    {isLocked ? `⬤ ${timeLabel}` : timeLabel}
                  </text>
                  {lifeVal !== null && effectiveAc && activeStroke && (
                    <>
                      <circle cx={tipX + 10} cy={tipY + 30} r="3" fill={activeStroke} />
                      <text x={tipX + 18} y={tipY + 34} fontSize="8" fill="rgba(30,41,59,0.75)" fontFamily="monospace">
                        {effectiveAc}: {lifeVal}h kvar
                      </text>
                    </>
                  )}
                </g>
              );
            })()}
          </svg>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[8px] font-mono text-muted-foreground">
          {flygschema.map((ac, i) => {
            const isSelected = selectedAc === ac.aircraftId;
            const isActive = effectiveAc === ac.aircraftId;
            return (
              <span
                key={ac.aircraftId}
                style={{
                  color: AC_LINE_COLORS[i % AC_LINE_COLORS.length],
                  opacity: effectiveAc && !isActive ? 0.3 : 1,
                  fontWeight: isActive ? "700" : "400",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                  outline: isSelected ? `1.5px solid ${AC_LINE_COLORS[i % AC_LINE_COLORS.length]}` : "none",
                  borderRadius: "3px",
                  padding: "1px 3px",
                }}
                onMouseEnter={() => setHoveredAc(ac.aircraftId)}
                onMouseLeave={() => setHoveredAc(null)}
                onClick={() => setSelectedAc((prev) => (prev === ac.aircraftId ? null : ac.aircraftId))}
                title={isSelected ? "Klicka för att låsa upp" : "Klicka för att låsa"}
              >
                {isSelected ? "⬤" : "●"} {ac.aircraftId}
              </span>
            );
          })}
          <span className="ml-2 text-muted-foreground/60">| Klicka linje/legend för att låsa · Mission = nedåt · Service = hopp till 100</span>
        </div>
      </div>
    </div>
  );
}
