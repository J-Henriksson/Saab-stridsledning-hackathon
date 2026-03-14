import { Base, ScenarioPhase } from "@/types/game";
import { motion } from "framer-motion";
import { Sparkles, Wrench, PlaneTakeoff } from "lucide-react";

interface RemainingLifeGrafProps {
  bases: Base[];
  phase: ScenarioPhase;
}

const typeAbbr = (type: string) => {
  if (type === "GripenE") return "E";
  if (type === "GripenF_EA") return "F";
  if (type === "GlobalEye") return "GE";
  if (type === "VLO_UCAV") return "UC";
  return "LO";
};

export function RemainingLifeGraf({ bases, phase }: RemainingLifeGrafProps) {
  // Fleet-wide aircraft data
  const allAircraft = bases.flatMap((b) =>
    b.aircraft.map((ac) => ({ ...ac, baseName: b.id }))
  );

  // Best for missions: ready, health >= 70, hoursToService >= 20
  const bestForMission = allAircraft
    .filter((ac) => ac.status === "ready" && (ac.health ?? 100) >= 70 && ac.hoursToService >= 20)
    .sort((a, b) => {
      const hDiff = (b.health ?? 100) - (a.health ?? 100);
      return hDiff !== 0 ? hDiff : b.hoursToService - a.hoursToService;
    })
    .slice(0, 4);

  // Needs service soon: ready, < 20h to service
  const needsService = allAircraft
    .filter((ac) => ac.status === "ready" && ac.hoursToService < 20)
    .sort((a, b) => a.hoursToService - b.hoursToService)
    .slice(0, 4);

  // Bars section: all aircraft sorted by hoursToService asc, grouped by base
  const sorted = [...allAircraft].sort((a, b) => a.hoursToService - b.hoursToService);

  return (
    <div className="space-y-4">

      {/* ── Optimization Panels ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">

        {/* Best for missions */}
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(152 60% 38% / 0.06)", border: "1px solid hsl(152 60% 38% / 0.2)" }}>
          <div className="flex items-center gap-1.5">
            <PlaneTakeoff className="h-3.5 w-3.5" style={{ color: "hsl(152 60% 38%)" }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: "hsl(152 60% 32%)" }}>
              BÄST FÖR UPPDRAG
            </span>
          </div>
          {bestForMission.length === 0 ? (
            <p className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>Inga optimala flygplan tillgängliga</p>
          ) : (
            bestForMission.map((ac) => (
              <div key={ac.id} className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono font-bold" style={{ color: "hsl(220 63% 18%)" }}>{ac.tailNumber}</span>
                  <span className="text-[8px] px-1 rounded font-mono"
                    style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}>{typeAbbr(ac.type)}</span>
                  <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 60%)" }}>{ac.baseName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold">
                  <span style={{ color: "hsl(152 60% 38%)" }}>{ac.health ?? 100}%</span>
                  <span style={{ color: "hsl(218 15% 55%)" }}>·</span>
                  <span style={{ color: "hsl(220 63% 32%)" }}>{ac.hoursToService}h</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Needs service */}
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(42 64% 53% / 0.06)", border: "1px solid hsl(42 64% 53% / 0.2)" }}>
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" style={{ color: "hsl(42 64% 36%)" }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: "hsl(42 64% 32%)" }}>
              PLANERA SERVICE SNART
            </span>
          </div>
          {needsService.length === 0 ? (
            <p className="text-[9px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>Inga flygplan nära service-intervall</p>
          ) : (
            needsService.map((ac) => (
              <div key={ac.id} className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono font-bold" style={{ color: "hsl(220 63% 18%)" }}>{ac.tailNumber}</span>
                  <span className="text-[8px] px-1 rounded font-mono"
                    style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}>{typeAbbr(ac.type)}</span>
                  <span className="text-[8px] font-mono" style={{ color: "hsl(218 15% 60%)" }}>{ac.baseName}</span>
                </div>
                <span className="text-[9px] font-mono font-bold" style={{ color: ac.hoursToService < 5 ? "hsl(353 74% 42%)" : "hsl(42 64% 36%)" }}>
                  {ac.hoursToService}h
                </span>
              </div>
            ))
          )}
        </div>

        {/* Bay balance per base */}
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: "hsl(220 63% 18% / 0.04)", border: "1px solid hsl(215 14% 84%)" }}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(42 64% 48%)" }} />
            <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: "hsl(220 63% 22%)" }}>
              UNDERHÅLLSHALLAR
            </span>
          </div>
          {bases.map((base) => {
            const pct = base.maintenanceBays.total > 0
              ? base.maintenanceBays.occupied / base.maintenanceBays.total
              : 0;
            const isOver = pct > 0.8;
            const isUnder = pct < 0.2 && base.maintenanceBays.total > 1;
            const color = isOver ? "hsl(353 74% 42%)" : isUnder && phase === "KRIG" ? "hsl(42 64% 36%)" : "hsl(152 60% 38%)";
            const recText = isOver
              ? "Full — prioritera snabba jobb"
              : isUnder && phase === "KRIG"
              ? "Tom under KRIG — schemalng service"
              : isUnder
              ? "Ledig — bra tid för service"
              : "Balanserad kapacitet";
            return (
              <div key={base.id} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold" style={{ color: "hsl(220 63% 18%)" }}>{base.id}</span>
                  <span className="text-[9px] font-mono" style={{ color }}>
                    {base.maintenanceBays.occupied}/{base.maintenanceBays.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(216 18% 90%)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
                </div>
                <p className="text-[8px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>{recText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Aircraft Bars ── */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-[90px_1fr_56px] gap-2 items-center pb-1"
          style={{ borderBottom: "1px solid hsl(215 14% 88%)" }}>
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(218 15% 55%)" }}>FLYGPLAN</span>
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "hsl(218 15% 55%)" }}>REMAINING LIFE</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-right" style={{ color: "hsl(218 15% 55%)" }}>TIMMAR</span>
        </div>
        {sorted.map((ac, i) => {
          const pct = Math.min(100, (ac.hoursToService / 100) * 100);
          const isCritical = ac.hoursToService < 20;
          const isLow = ac.hoursToService < 40;
          const barColor = isCritical ? "hsl(353 74% 47%)" : isLow ? "hsl(42 64% 53%)" : "hsl(152 60% 38%)";
          const textColor = isCritical ? "hsl(353 74% 42%)" : isLow ? "hsl(42 64% 38%)" : "hsl(220 63% 18%)";

          return (
            <motion.div
              key={ac.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.015 }}
              className="grid grid-cols-[90px_1fr_56px] gap-2 items-center group"
            >
              <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: "hsl(220 63% 22%)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: barColor }} />
                <span className="truncate">{ac.tailNumber}</span>
                <span className="text-[7px] font-mono px-0.5 rounded shrink-0"
                  style={{ background: "hsl(216 18% 92%)", color: "hsl(218 15% 55%)" }}>
                  {ac.baseName}
                </span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden"
                style={{ background: "hsl(216 18% 90%)" }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.015, ease: "easeOut" }}
                  style={{ background: barColor }}
                />
              </div>
              <div className="text-[10px] font-mono font-bold text-right" style={{ color: textColor }}>
                {ac.hoursToService}h
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
