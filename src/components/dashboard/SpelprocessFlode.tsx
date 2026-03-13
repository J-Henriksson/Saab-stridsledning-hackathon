import { Base } from "@/types/game";
import { motion } from "framer-motion";
import {
  RadioTower, PlaneTakeoff, PlaneLanding, Hammer,
  ChevronRight, Crosshair, Fuel, Package, Users, Wrench, Dice6,
} from "lucide-react";

interface SpelprocessFlodeProps {
  base: Base;
}

export function SpelprocessFlode({ base }: SpelprocessFlodeProps) {
  const mc = base.aircraft.filter((a) => a.status === "mission_capable").length;
  const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable").length;
  const maint = base.aircraft.filter((a) => a.status === "maintenance").length;
  const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;
  const fuelOk = base.fuel > 30;
  const totalPersonnel = base.personnel.reduce((s, p) => s + p.available, 0);

  const steps = [
    {
      id: "ato", label: "ATO ORDER", sub: "Uppdragstilldelning",
      icon: <RadioTower className="h-5 w-5" />, count: mc + onMission, unit: "fpl tillgängliga",
      accent: "#005AA0", bg: "from-blue-50 to-blue-50/40", border: "border-blue-300/60",
    },
    {
      id: "klarg", label: "KLARGÖRING", sub: "Tankning · Last · BIT",
      icon: <Wrench className="h-5 w-5" />, count: mc, unit: "redo för uppdrag",
      accent: "#FFB81C", bg: "from-amber-50 to-amber-50/40", border: "border-amber-300/60",
    },
    {
      id: "avlamning", label: "AVLÄMNING", sub: "Start · Tärning",
      icon: <PlaneTakeoff className="h-5 w-5" />, count: onMission, unit: "i luften",
      accent: "#0284c7", bg: "from-sky-50 to-sky-50/40", border: "border-sky-300/60",
    },
    {
      id: "mission", label: "MISSION", sub: "Aktiv flygning",
      icon: <Crosshair className="h-5 w-5" />, count: onMission, unit: "på uppdrag",
      accent: "#7c3aed", bg: "from-violet-50 to-violet-50/40", border: "border-violet-300/60",
    },
    {
      id: "mottag", label: "MOTTAGNING", sub: "Landning · Kontroll",
      icon: <PlaneLanding className="h-5 w-5" />, count: nmc, unit: "post-flight",
      accent: "#ea580c", bg: "from-orange-50 to-orange-50/40", border: "border-orange-300/60",
    },
    {
      id: "uh", label: "UNDERHÅLL", sub: `${base.maintenanceBays.occupied}/${base.maintenanceBays.total} UH-platser`,
      icon: <Hammer className="h-5 w-5" />, count: maint, unit: "i underhåll",
      accent: "#dc2626", bg: "from-red-50 to-red-50/40", border: "border-red-300/60",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Main operational flow */}
      <div className="flex items-stretch gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex-1 bg-gradient-to-b ${step.bg} border ${step.border} rounded-lg p-3 relative overflow-hidden`}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg" style={{ backgroundColor: step.accent, opacity: 0.8 }} />
              <div className="flex items-start justify-between mb-2">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: `${step.accent}18`, color: step.accent }}>
                  {step.icon}
                </div>
                <span className="text-2xl font-black font-mono leading-none" style={{ color: step.accent }}>{step.count}</span>
              </div>
              <div className="text-[9px] font-black font-mono text-foreground tracking-widest truncate">{step.label}</div>
              <div className="text-[8px] text-muted-foreground mt-0.5 truncate">{step.sub}</div>
              <div className="text-[8px] font-mono mt-1 truncate" style={{ color: step.accent, opacity: 0.8 }}>{step.unit}</div>
            </motion.div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mx-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Resource status strip */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[8px] font-mono text-muted-foreground/40 tracking-widest shrink-0">RESURSER</span>
        <div className="flex-1 h-px bg-border/30" />
        {[
          { icon: <Fuel className="h-3 w-3" />, label: "BRÄNSLE", ok: fuelOk, val: `${Math.round(base.fuel)}%` },
          { icon: <Package className="h-3 w-3" />, label: "AMMO", ok: base.ammunition.every((a) => a.quantity / a.max > 0.3), val: `${base.ammunition.reduce((s, a) => s + a.quantity, 0)} st` },
          { icon: <Users className="h-3 w-3" />, label: "PERSONAL", ok: totalPersonnel > 10, val: `${totalPersonnel} tillg` },
          { icon: <Dice6 className="h-3 w-3" />, label: "UH-PLATSER", ok: base.maintenanceBays.occupied < base.maintenanceBays.total, val: `${base.maintenanceBays.occupied}/${base.maintenanceBays.total}` },
        ].map((r) => (
          <div key={r.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono ${r.ok ? "border-blue-300/60 bg-blue-50 text-blue-700" : "border-red-300/60 bg-red-50 text-red-700"}`}>
            {r.icon}
            <span className="hidden sm:inline opacity-60">{r.label}</span>
            <span className="font-bold">{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
