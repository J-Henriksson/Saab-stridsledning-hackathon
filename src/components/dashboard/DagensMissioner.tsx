import { Base, MissionType, ScenarioPhase } from "@/types/game";
import { Shield, Target, Eye, Radio, Plane, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface DagensMissionerProps {
  base: Base;
  hour: number;
  phase: ScenarioPhase;
}

interface MissionSummary {
  type: MissionType;
  label: string;
  status: "active" | "planned" | "completed";
  aircraft: number;
  time: string;
  priority: "high" | "medium" | "low";
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-4 w-4" />,
  QRA: <Target className="h-4 w-4" />,
  RECCE: <Eye className="h-4 w-4" />,
  AEW: <Radio className="h-4 w-4" />,
  AI_DT: <Zap className="h-4 w-4" />,
};

const statusStyle = {
  active: "bg-status-green/10 border-status-green/30 text-status-green",
  planned: "bg-primary/10 border-primary/30 text-primary",
  completed: "bg-muted border-border text-muted-foreground",
};

function getMissions(base: Base, hour: number, phase: ScenarioPhase): MissionSummary[] {
  const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;
  const missions: MissionSummary[] = [
    { type: "QRA", label: "Snabbinsats QRA", status: "active", aircraft: 2, time: "00:00–24:00", priority: "high" },
  ];

  if (phase === "FRED") {
    missions.push({
      type: "RECCE", label: "Spaning", status: hour >= 12 ? "completed" : hour >= 8 ? "active" : "planned",
      aircraft: 2, time: "08:00–12:00", priority: "medium",
    });
  } else if (phase === "KRIS") {
    missions.push(
      { type: "DCA", label: "Luftförsvar", status: hour >= 14 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 4, time: "06:00–14:00", priority: "high" },
      { type: "AEW", label: "Luftövervakning", status: hour >= 18 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 1, time: "06:00–18:00", priority: "high" },
      { type: "RECCE", label: "Spaning", status: hour >= 14 ? "completed" : hour >= 10 ? "active" : "planned", aircraft: 2, time: "10:00–14:00", priority: "medium" },
    );
  } else {
    missions.push(
      { type: "DCA", label: "Luftförsvar Omg 1", status: hour >= 12 ? "completed" : hour >= 6 ? "active" : "planned", aircraft: 6, time: "06:00–12:00", priority: "high" },
      { type: "DCA", label: "Luftförsvar Omg 2", status: hour >= 18 ? "completed" : hour >= 12 ? "active" : "planned", aircraft: 6, time: "12:00–18:00", priority: "high" },
      { type: "AI_DT", label: "Attack dagljus", status: hour >= 11 ? "completed" : hour >= 8 ? "active" : "planned", aircraft: 4, time: "08:00–11:00", priority: "high" },
      { type: "RECCE", label: "Spaning", status: hour >= 15 ? "completed" : hour >= 7 ? "active" : "planned", aircraft: 2, time: "07:00–15:00", priority: "medium" },
    );
  }
  return missions;
}

export function DagensMissioner({ base, hour, phase }: DagensMissionerProps) {
  const missions = getMissions(base, hour, phase);
  const aktiva = missions.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">
          {aktiva} aktiva · {missions.length} totalt
        </span>
      </div>
      {missions.map((mission, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-lg border ${statusStyle[mission.status]}`}
        >
          <span>{missionIcons[mission.type] || <Plane className="h-4 w-4" />}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold">{mission.type} — {mission.label}</div>
            <div className="text-[10px] opacity-70 font-mono">{mission.time} · {mission.aircraft} flygplan</div>
          </div>
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
            mission.status === "active" ? "bg-status-green/20" : 
            mission.status === "completed" ? "bg-muted" : "bg-primary/20"
          }`}>
            {mission.status === "active" ? "AKTIV" : mission.status === "completed" ? "KLAR" : "PLANERAD"}
          </span>
          {mission.priority === "high" && (
            <span className="text-[8px] font-mono text-status-red">HÖG</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
