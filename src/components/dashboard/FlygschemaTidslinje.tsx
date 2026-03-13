import { Base, Aircraft } from "@/types/game";
import { motion } from "framer-motion";

interface FlygschemaTidslinjeProps {
  base: Base;
  hour: number;
}

interface FlightSlot {
  aircraft: Aircraft;
  startHour: number;
  endHour: number;
  type: string;
}

function generateFlightSlots(base: Base, hour: number): FlightSlot[] {
  const slots: FlightSlot[] = [];
  base.aircraft.forEach((ac) => {
    if (ac.status === "on_mission" && ac.currentMission) {
      slots.push({ aircraft: ac, startHour: Math.max(6, hour - 2), endHour: Math.min(23, hour + 2), type: ac.currentMission });
    }
    // Simulated scheduled flights based on hours to service
    if (ac.status === "mission_capable" && ac.hoursToService < 30) {
      const sHour = 6 + (parseInt(ac.id.replace(/\D/g, "")) % 12);
      if (sHour <= 20) {
        slots.push({ aircraft: ac, startHour: sHour, endHour: sHour + 3, type: "SERVICE" });
      }
    }
  });
  return slots.slice(0, 12);
}

export function FlygschemaTidslinje({ base, hour }: FlygschemaTidslinjeProps) {
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);
  const flights = generateFlightSlots(base, hour);

  return (
    <div className="space-y-2">
      {/* Time header */}
      <div className="flex">
        <div className="w-20 shrink-0" />
        <div className="flex-1 flex">
          {timeSlots.map((t) => (
            <div
              key={t}
              className={`flex-1 text-center text-[8px] font-mono ${t === hour ? "text-primary font-bold" : "text-muted-foreground"}`}
            >
              {String(t).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div className="w-16 shrink-0 text-[8px] text-muted-foreground text-center">Till 100h</div>
      </div>

      {/* Now line + rows */}
      <div className="space-y-1">
        {flights.map((flight, i) => {
          const startPct = ((flight.startHour - 6) / 17) * 100;
          const widthPct = ((flight.endHour - flight.startHour) / 17) * 100;
          const isActive = hour >= flight.startHour && hour < flight.endHour;
          const isService = flight.type === "SERVICE";

          return (
            <motion.div
              key={`${flight.aircraft.id}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center"
            >
              <div className="w-20 shrink-0 text-[10px] font-mono text-foreground truncate pr-1">
                {flight.aircraft.tailNumber}
              </div>
              <div className="flex-1 relative h-6">
                <div className="absolute inset-0 bg-muted/20 rounded" />
                {/* Current time marker */}
                {hour >= 6 && hour <= 22 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/40"
                    style={{ left: `${((hour - 6) / 17) * 100}%` }}
                  />
                )}
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded text-[8px] font-mono flex items-center px-1 ${
                    isService
                      ? "bg-status-amber/20 border border-status-amber/30 text-status-amber"
                      : isActive
                      ? "bg-status-green/20 border border-status-green/40 text-status-green"
                      : "bg-status-blue/15 border border-status-blue/30 text-status-blue"
                  }`}
                  style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 4)}%` }}
                >
                  <span className="truncate">{flight.type}</span>
                </div>
              </div>
              <div className="w-16 shrink-0 text-center">
                <span className={`text-[10px] font-mono font-bold ${
                  flight.aircraft.hoursToService < 20 ? "text-status-red" : 
                  flight.aircraft.hoursToService < 40 ? "text-status-amber" : "text-foreground"
                }`}>
                  {flight.aircraft.hoursToService}h
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {flights.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          Inga schemalagda flygpass
        </div>
      )}
    </div>
  );
}
