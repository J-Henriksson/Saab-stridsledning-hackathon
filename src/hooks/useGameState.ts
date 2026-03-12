import { useState, useCallback } from "react";
import { GameState, GameEvent, ScenarioPhase, Aircraft } from "@/types/game";
import { initialGameState } from "@/data/initialGameState";

const phaseForDay = (day: number): ScenarioPhase => {
  if (day <= 1) return "FRED";
  if (day <= 4) return "KRIS";
  return "KRIG";
};

const rollDice = (sides = 6) => Math.floor(Math.random() * sides) + 1;

export function useGameState() {
  const [state, setState] = useState<GameState>(initialGameState);

  const addEvent = useCallback((event: Omit<GameEvent, "id" | "timestamp">) => {
    setState((prev) => ({
      ...prev,
      events: [
        {
          ...event,
          id: crypto.randomUUID(),
          timestamp: `Dag ${prev.day} ${String(prev.hour).padStart(2, "0")}:00`,
        },
        ...prev.events,
      ].slice(0, 50),
    }));
  }, []);

  const advanceTurn = useCallback(() => {
    setState((prev) => {
      const newHour = prev.hour + 1;
      const dayRollover = newHour >= 24;
      const nextDay = dayRollover ? prev.day + 1 : prev.day;
      const nextHour = dayRollover ? 6 : newHour;
      const nextPhase = phaseForDay(nextDay);

      const newEvents: GameEvent[] = [];

      // Process maintenance progress
      const updatedBases = prev.bases.map((base) => {
        const updatedAircraft = base.aircraft.map((ac) => {
          if (ac.status === "maintenance" && ac.maintenanceTimeRemaining) {
            const remaining = ac.maintenanceTimeRemaining - 1;
            if (remaining <= 0) {
              newEvents.push({
                id: crypto.randomUUID(),
                timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
                type: "success",
                message: `${ac.tailNumber} underhåll klart - nu operativ`,
                base: base.id,
              });
              return { ...ac, status: "mission_capable" as const, maintenanceTimeRemaining: undefined, maintenanceType: undefined };
            }
            return { ...ac, maintenanceTimeRemaining: remaining };
          }
          // Random failure on mission-capable aircraft
          if (ac.status === "mission_capable" && rollDice(20) === 1) {
            const failTypes = ["quick_lru", "complex_lru", "direct_repair", "troubleshooting"] as const;
            const failTimes = [2, 6, 16, 4];
            const idx = rollDice(4) - 1;
            newEvents.push({
              id: crypto.randomUUID(),
              timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
              type: "warning",
              message: `${ac.tailNumber} rapporterar fel - kräver ${failTypes[idx]}`,
              base: base.id,
            });
            return {
              ...ac,
              status: "not_mission_capable" as const,
              maintenanceType: failTypes[idx],
              maintenanceTimeRemaining: failTimes[idx],
            };
          }
          return ac;
        });

        // Fuel consumption
        const fuelDrain = nextPhase === "KRIG" ? 3 : nextPhase === "KRIS" ? 1.5 : 0.5;
        
        return {
          ...base,
          aircraft: updatedAircraft,
          fuel: Math.max(0, base.fuel - fuelDrain),
        };
      });

      if (nextPhase !== prev.phase) {
        newEvents.push({
          id: crypto.randomUUID(),
          timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
          type: "critical",
          message: `Fas ändrad till ${nextPhase}`,
        });
      }

      return {
        ...prev,
        day: nextDay,
        hour: nextHour,
        phase: nextPhase,
        bases: updatedBases,
        events: [...newEvents, ...prev.events].slice(0, 50),
      };
    });
  }, []);

  const startMaintenance = useCallback((baseId: string, aircraftId: string) => {
    setState((prev) => {
      const bases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        const aircraft = base.aircraft.map((ac) => {
          if (ac.id !== aircraftId || ac.status !== "not_mission_capable") return ac;
          return { ...ac, status: "maintenance" as const };
        });
        return { ...base, aircraft, maintenanceBays: { ...base.maintenanceBays, occupied: base.maintenanceBays.occupied + 1 } };
      });
      return { ...prev, bases };
    });
    addEvent({ type: "info", message: `Underhåll påbörjat på ${aircraftId}`, base: baseId as any });
  }, [addEvent]);

  const sendOnMission = useCallback((baseId: string, aircraftId: string, mission: string) => {
    setState((prev) => {
      const bases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        const aircraft = base.aircraft.map((ac) => {
          if (ac.id !== aircraftId || ac.status !== "mission_capable") return ac;
          return { ...ac, status: "on_mission" as const, currentMission: mission as any };
        });
        return { ...base, aircraft };
      });
      return { ...prev, bases };
    });
    addEvent({ type: "success", message: `${aircraftId} skickad på ${mission}-uppdrag`, base: baseId as any });
  }, [addEvent]);

  const getResourceSummary = useCallback((): string => {
    const lines: string[] = [];
    lines.push(`=== RESURSLÄGE DAG ${state.day} ${String(state.hour).padStart(2, "0")}:00 - FAS: ${state.phase} ===\n`);
    
    state.bases.forEach((base) => {
      const mc = base.aircraft.filter((a) => a.status === "mission_capable").length;
      const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable").length;
      const maint = base.aircraft.filter((a) => a.status === "maintenance").length;
      const onMission = base.aircraft.filter((a) => a.status === "on_mission").length;
      
      lines.push(`\n--- ${base.name} (${base.id}) ---`);
      lines.push(`Flygplan: ${base.aircraft.length} totalt | ${mc} MC | ${nmc} NMC | ${maint} i UH | ${onMission} på uppdrag`);
      lines.push(`Bränsle: ${base.fuel.toFixed(0)}%`);
      lines.push(`Underhållsplatser: ${base.maintenanceBays.occupied}/${base.maintenanceBays.total} upptagna`);
      lines.push(`Personal tillgänglig: ${base.personnel.map((p) => `${p.role}: ${p.available}/${p.total}`).join(", ")}`);
      lines.push(`Reservdelar: ${base.spareParts.map((p) => `${p.name}: ${p.quantity}/${p.maxQuantity}`).join(", ")}`);
      lines.push(`Ammunition: ${base.ammunition.map((a) => `${a.type}: ${a.quantity}/${a.max}`).join(", ")}`);
      
      const nmcAircraft = base.aircraft.filter((a) => a.status === "not_mission_capable" || a.status === "maintenance");
      if (nmcAircraft.length > 0) {
        lines.push(`\nFlygplan med problem:`);
        nmcAircraft.forEach((ac) => {
          lines.push(`  ${ac.tailNumber} (${ac.type}): ${ac.status} - ${ac.maintenanceType || "okänt"} - ${ac.maintenanceTimeRemaining || "?"}h kvar`);
        });
      }
    });

    lines.push(`\nUppdrag: ${state.successfulMissions} lyckade, ${state.failedMissions} misslyckade`);
    lines.push(`\nSenaste händelser:`);
    state.events.slice(0, 5).forEach((e) => {
      lines.push(`  [${e.timestamp}] ${e.type.toUpperCase()}: ${e.message}`);
    });

    return lines.join("\n");
  }, [state]);

  const resetGame = useCallback(() => {
    setState(initialGameState);
  }, []);

  return { state, advanceTurn, startMaintenance, sendOnMission, addEvent, getResourceSummary, resetGame };
}
