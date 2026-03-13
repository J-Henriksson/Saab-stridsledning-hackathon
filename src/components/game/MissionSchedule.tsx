import { Base, Aircraft, MissionType } from "@/types/game";
import { motion } from "framer-motion";
import { Clock, Plane, Target, Eye, Shield, Radio } from "lucide-react";

interface MissionScheduleProps {
  base: Base;
  day: number;
  hour: number;
  phase: string;
}

interface ScheduledMission {
  id: string;
  type: MissionType;
  startHour: number;
  endHour: number;
  aircraftNeeded: number;
  assignedAircraft: string[];
  status: "planned" | "active" | "completed";
  priority: "high" | "medium" | "low";
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-3.5 w-3.5" />,
  QRA: <Target className="h-3.5 w-3.5" />,
  RECCE: <Eye className="h-3.5 w-3.5" />,
  AEW: <Radio className="h-3.5 w-3.5" />,
};

const missionLabels: Partial<Record<MissionType, string>> = {
  DCA: "Defensivt luftförsvar",
  QRA: "Snabbinsats (QRA)",
  RECCE: "Spaning",
  AEW: "Luftövervakning",
  AI_DT: "Attack dagljus",
  AI_ST: "Attack mörker",
  ESCORT: "Eskort",
  TRANSPORT: "Transport",
};

function generateDayMissions(day: number, hour: number, phase: string, base: Base): ScheduledMission[] {
  const mcAircraft = base.aircraft.filter((a) => a.status === "mission_capable" || a.status === "on_mission");
  const missions: ScheduledMission[] = [];

  // QRA is always active
  missions.push({
    id: "qra-1",
    type: "QRA",
    startHour: 0,
    endHour: 24,
    aircraftNeeded: 2,
    assignedAircraft: mcAircraft.slice(0, 2).map((a) => a.tailNumber),
    status: "active",
    priority: "high",
  });

  if (phase === "FRED") {
    missions.push({
      id: "recce-1",
      type: "RECCE",
      startHour: 8,
      endHour: 12,
      aircraftNeeded: 2,
      assignedAircraft: mcAircraft.slice(2, 4).map((a) => a.tailNumber),
      status: hour >= 12 ? "completed" : hour >= 8 ? "active" : "planned",
      priority: "medium",
    });
  } else if (phase === "KRIS") {
    missions.push(
      {
        id: "dca-1",
        type: "DCA",
        startHour: 6,
        endHour: 14,
        aircraftNeeded: 4,
        assignedAircraft: mcAircraft.slice(2, 6).map((a) => a.tailNumber),
        status: hour >= 14 ? "completed" : hour >= 6 ? "active" : "planned",
        priority: "high",
      },
      {
        id: "recce-2",
        type: "RECCE",
        startHour: 10,
        endHour: 14,
        aircraftNeeded: 2,
        assignedAircraft: mcAircraft.slice(6, 8).map((a) => a.tailNumber),
        status: hour >= 14 ? "completed" : hour >= 10 ? "active" : "planned",
        priority: "medium",
      },
      {
        id: "aew-1",
        type: "AEW",
        startHour: 6,
        endHour: 18,
        aircraftNeeded: 1,
        assignedAircraft: base.aircraft.filter((a) => a.type === "GlobalEye").slice(0, 1).map((a) => a.tailNumber),
        status: hour >= 18 ? "completed" : hour >= 6 ? "active" : "planned",
        priority: "high",
      }
    );
  } else {
    missions.push(
      {
        id: "dca-1",
        type: "DCA",
        startHour: 6,
        endHour: 12,
        aircraftNeeded: 6,
        assignedAircraft: mcAircraft.slice(2, 8).map((a) => a.tailNumber),
        status: hour >= 12 ? "completed" : hour >= 6 ? "active" : "planned",
        priority: "high",
      },
      {
        id: "dca-2",
        type: "DCA",
        startHour: 12,
        endHour: 18,
        aircraftNeeded: 6,
        assignedAircraft: mcAircraft.slice(8, 14).map((a) => a.tailNumber),
        status: hour >= 18 ? "completed" : hour >= 12 ? "active" : "planned",
        priority: "high",
      },
      {
        id: "ai-1",
        type: "AI_DT",
        startHour: 8,
        endHour: 11,
        aircraftNeeded: 4,
        assignedAircraft: mcAircraft.slice(14, 18).map((a) => a.tailNumber),
        status: hour >= 11 ? "completed" : hour >= 8 ? "active" : "planned",
        priority: "high",
      },
      {
        id: "recce-3",
        type: "RECCE",
        startHour: 7,
        endHour: 15,
        aircraftNeeded: 2,
        assignedAircraft: mcAircraft.slice(18, 20).map((a) => a.tailNumber),
        status: hour >= 15 ? "completed" : hour >= 7 ? "active" : "planned",
        priority: "medium",
      }
    );
  }

  return missions;
}

export function MissionSchedule({ base, day, hour, phase }: MissionScheduleProps) {
  const missions = generateDayMissions(day, hour, phase, base);
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <h3 className="font-sans font-bold text-sm text-foreground">UPPDRAGSSCHEMA — DAG {day}</h3>
        </div>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-green" /> Aktiv
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary/30" /> Planerad
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Klar
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Timeline header */}
        <div className="flex mb-1">
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex">
            {timeSlots.map((t) => (
              <div
                key={t}
                className={`flex-1 text-center text-[9px] font-mono ${t === hour ? "text-primary font-bold" : "text-muted-foreground"}`}
              >
                {String(t).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        {/* Current time indicator */}
        <div className="flex mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex-1 relative h-px bg-border">
            {hour >= 6 && hour <= 23 && (
              <div
                className="absolute top-0 w-px h-3 bg-primary"
                style={{ left: `${((hour - 6) / 18) * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Mission rows */}
        <div className="space-y-2">
          {missions.map((mission) => {
            const startOffset = Math.max(0, ((mission.startHour - 6) / 18) * 100);
            const width = ((mission.endHour - mission.startHour) / 18) * 100;

            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center"
              >
                {/* Mission label */}
                <div className="w-32 shrink-0 flex items-center gap-2 pr-2">
                  <span className={`${mission.status === "active" ? "text-status-green" : "text-muted-foreground"}`}>
                    {missionIcons[mission.type] || <Target className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-foreground">{mission.type}</div>
                    <div className="text-[9px] text-muted-foreground">{mission.aircraftNeeded} fpl</div>
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 relative h-8">
                  <div className="absolute inset-0 bg-muted/30 rounded" />
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded flex items-center px-2 text-[9px] font-mono ${
                      mission.status === "active"
                        ? "bg-status-green/20 border border-status-green/40 text-status-green"
                        : mission.status === "completed"
                        ? "bg-muted-foreground/10 border border-muted-foreground/20 text-muted-foreground"
                        : "bg-primary/10 border border-primary/30 text-primary/80"
                    }`}
                    style={{ left: `${startOffset}%`, width: `${width}%` }}
                  >
                    <span className="truncate">
                      {mission.assignedAircraft.slice(0, 3).join(", ")}
                      {mission.assignedAircraft.length > 3 && ` +${mission.assignedAircraft.length - 3}`}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
