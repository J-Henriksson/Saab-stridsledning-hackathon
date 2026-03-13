import { Base } from "@/types/game";
import { motion } from "framer-motion";
import { ClipboardList, Wrench, Plane, ArrowRight, CheckCircle } from "lucide-react";

interface SpelprocessFlodeProps {
  base: Base;
}

interface FlowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

export function SpelprocessFlode({ base }: SpelprocessFlodeProps) {
  const mc = base.aircraft.filter((a) => a.status === "mission_capable").length;
  const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable").length;
  const maint = base.aircraft.filter((a) => a.status === "maintenance").length;
  const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;

  const steps: FlowStep[] = [
    { id: "ato", label: "ATO", sublabel: "Uppdragstilldelning", icon: <ClipboardList className="h-5 w-5" />, count: mc + onMission, color: "text-status-blue" },
    { id: "klarg", label: "KLARGÖRING", sublabel: "Beväpning & tankning", icon: <Wrench className="h-5 w-5" />, count: mc, color: "text-status-green" },
    { id: "uppdrag", label: "UPPDRAG", sublabel: "I luften", icon: <Plane className="h-5 w-5" />, count: onMission, color: "text-primary" },
    { id: "mottag", label: "MOTTAGNING", sublabel: "Post-flight", icon: <CheckCircle className="h-5 w-5" />, count: nmc, color: "text-status-amber" },
    { id: "uh", label: "UNDERHÅLL", sublabel: `${maint} i UH-bay`, icon: <Wrench className="h-5 w-5" />, count: maint, color: "text-status-red" },
  ];

  return (
    <div className="flex items-center justify-between gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex-1 bg-muted/30 border border-border rounded-lg p-3 text-center hover:border-primary/30 transition-colors"
          >
            <div className={`flex justify-center mb-2 ${step.color}`}>{step.icon}</div>
            <div className="text-xs font-bold text-foreground">{step.label}</div>
            <div className="text-[9px] text-muted-foreground">{step.sublabel}</div>
            <div className={`text-lg font-mono font-bold mt-1 ${step.color}`}>{step.count}</div>
          </motion.div>
          {i < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
