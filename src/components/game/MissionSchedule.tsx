import { ATOOrder, MissionType } from "@/types/game";
import { motion } from "framer-motion";
import { Plane, Target, Eye, Shield, Radio, Zap } from "lucide-react";

interface MissionScheduleProps {
  atoOrders: ATOOrder[];
  day: number;
  hour: number;
  timelineStart?: number;
  timelineEnd?: number;
  selectedOrderId?: string;
  onSelectOrder?: (order: ATOOrder) => void;
}

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-3.5 w-3.5" />,
  QRA: <Target className="h-3.5 w-3.5" />,
  RECCE: <Eye className="h-3.5 w-3.5" />,
  AEW: <Radio className="h-3.5 w-3.5" />,
  AI_DT: <Zap className="h-3.5 w-3.5" />,
  AI_ST: <Zap className="h-3.5 w-3.5" />,
  ESCORT: <Shield className="h-3.5 w-3.5" />,
  TRANSPORT: <Plane className="h-3.5 w-3.5" />,
};

function getOrderDisplayStatus(order: ATOOrder, hour: number): "planned" | "active" | "completed" {
  if (order.status === "completed") return "completed";
  if (order.status === "dispatched") {
    if (hour >= order.endHour) return "completed";
    return "active";
  }
  if (hour >= order.startHour && hour < order.endHour) return "active";
  if (hour >= order.endHour) return "completed";
  return "planned";
}

export function MissionSchedule({ atoOrders, day, hour, timelineStart = 0, timelineEnd = 24, selectedOrderId, onSelectOrder }: MissionScheduleProps) {
  const todaysOrders = atoOrders.filter((o) => o.day === day);
  const totalSlots = timelineEnd - timelineStart;
  const timeSlots = Array.from({ length: totalSlots }, (_, i) => i + timelineStart);

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
            <span className="w-2 h-2 rounded-full bg-blue-700" /> Klar
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Timeline header */}
        <div className="flex mb-1">
          <div className="w-32 shrink-0" />
          <div className="flex-1 relative">
            <div className="flex">
              {timeSlots.map((t) => (
                <div
                  key={t}
                  className={`flex-1 text-left text-[9px] font-mono py-0.5 ${
                    t === hour ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  {String(t).padStart(2, "0")}
                </div>
              ))}
            </div>
          </div>
          <div className="w-8 shrink-0 text-right text-[9px] font-mono text-status-yellow/80 font-bold py-0.5">
            24
          </div>
        </div>

        {/* Current time indicator */}
        <div className="flex mb-2">
          <div className="w-32 shrink-0" />
          <div className="flex-1 relative h-px bg-border" />
          <div className="w-8 shrink-0" />
        </div>

        {/* Mission rows */}
        <div className="space-y-2">
          {todaysOrders.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-6 font-mono">
              Inga ATO-order för dag {day}
            </div>
          ) : (
            todaysOrders.map((order) => {
              const displayStatus = getOrderDisplayStatus(order, hour);
              const isSelected = order.id === selectedOrderId;
              const startOffset = ((Math.max(order.startHour, timelineStart) - timelineStart) / totalSlots) * 100;
              const width = ((Math.min(order.endHour, timelineEnd) - Math.max(order.startHour, timelineStart)) / totalSlots) * 100;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center"
                >
                  {/* Mission label */}
                  <div className="w-32 shrink-0 flex items-center gap-2 pr-2">
                    <span className={displayStatus === "active" ? "text-status-green" : "text-muted-foreground"}>
                      {missionIcons[order.missionType] || <Target className="h-3.5 w-3.5" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-foreground">{order.missionType}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {order.requiredCount} fpl · {order.launchBase}
                      </div>
                    </div>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative h-8">
                    <div
                      className={`absolute top-0.5 bottom-0.5 rounded flex items-center px-2 text-[9px] font-mono cursor-pointer ${
                        displayStatus === "active"
                          ? "bg-status-green/20 border border-status-green/40 text-status-green"
                          : displayStatus === "completed"
                          ? "bg-blue-900/60 border border-blue-700/50 text-blue-200"
                          : "bg-primary/10 border border-primary/30 text-primary/80"
                      } ${isSelected ? "ring-2 ring-primary/60" : ""}`}
                      style={{ left: `${startOffset}%`, width: `${Math.max(width, 2)}%` }}
                      onClick={() => onSelectOrder?.(order)}
                    >
                      <span className="truncate">
                        {order.assignedAircraft.length > 0
                          ? <>
                              {order.assignedAircraft.slice(0, 3).join(", ")}
                              {order.assignedAircraft.length > 3 && ` +${order.assignedAircraft.length - 3}`}
                            </>
                          : order.label
                        }
                      </span>
                    </div>

                    {/* Deviation marker if order is dispatched but time has passed endHour */}
                    {order.status === "dispatched" && hour > order.endHour && (
                      <div
                        className="absolute top-0 w-2 h-2 rounded-full bg-status-red"
                        style={{ left: `${((Math.min(order.endHour, timelineEnd) - timelineStart) / totalSlots) * 100}%`, top: "-2px" }}
                        title="Avvikelse — överskriden tid"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
