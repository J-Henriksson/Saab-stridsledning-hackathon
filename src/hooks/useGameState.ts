import { useState, useCallback } from "react";
import { GameState, GameEvent, ScenarioPhase } from "@/types/game";
import type { AircraftUnit } from "@/types/units";
import { initialGameState, generateATOOrders } from "@/data/initialGameState";
import { getAircraft } from "@/core/units/helpers";

const phaseForDay = (day: number): ScenarioPhase => {
  if (day <= 1) return "FRED";
  if (day <= 4) return "KRIS";
  return "KRIG";
};

const rollDice = (sides = 6) => Math.floor(Math.random() * sides) + 1;

/** Map a transform over every aircraft unit in a base, preserving non-aircraft units. */
function mapAircraft(
  base: GameState["bases"][number],
  fn: (ac: AircraftUnit) => AircraftUnit,
): GameState["bases"][number] {
  return {
    ...base,
    units: base.units.map((u) => (u.category === "aircraft" ? fn(u as AircraftUnit) : u)),
  };
}

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
        const updated = mapAircraft(base, (ac) => {
          if (ac.status === "under_maintenance" && ac.maintenanceTimeRemaining) {
            const remaining = ac.maintenanceTimeRemaining - 1;
            if (remaining <= 0) {
              newEvents.push({
                id: crypto.randomUUID(),
                timestamp: `Dag ${nextDay} ${String(nextHour).padStart(2, "0")}:00`,
                type: "success",
                message: `${ac.tailNumber} underhåll klart - nu operativ`,
                base: base.id,
              });
              return { ...ac, status: "ready" as const, maintenanceTimeRemaining: undefined, maintenanceType: undefined };
            }
            return { ...ac, maintenanceTimeRemaining: remaining };
          }
          // Random failure on mission-capable aircraft
          if (ac.status === "ready" && rollDice(20) === 1) {
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
              status: "unavailable" as const,
              maintenanceType: failTypes[idx],
              maintenanceTimeRemaining: failTimes[idx],
            };
          }
          return ac;
        });

        // Fuel consumption
        const fuelDrain = nextPhase === "KRIG" ? 3 : nextPhase === "KRIS" ? 1.5 : 0.5;

        return {
          ...updated,
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

      // Generate new ATO orders on day rollover
      const newATOOrders = dayRollover
        ? generateATOOrders(nextDay, nextPhase)
        : prev.atoOrders;

      // Mark dispatched orders as completed if their window has passed
      const updatedATOOrders = newATOOrders.map((o) =>
        o.status === "dispatched" && nextHour >= o.endHour
          ? { ...o, status: "completed" as const }
          : o
      );

      return {
        ...prev,
        day: nextDay,
        hour: nextHour,
        phase: nextPhase,
        bases: updatedBases,
        atoOrders: updatedATOOrders,
        events: [...newEvents, ...prev.events].slice(0, 50),
      };
    });
  }, []);

  const startMaintenance = useCallback((baseId: string, aircraftId: string) => {
    setState((prev) => {
      const bases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        const updated = mapAircraft(base, (ac) => {
          if (ac.id !== aircraftId || ac.status !== "unavailable") return ac;
          return { ...ac, status: "under_maintenance" as const };
        });
        return { ...updated, maintenanceBays: { ...base.maintenanceBays, occupied: base.maintenanceBays.occupied + 1 } };
      });
      return { ...prev, bases };
    });
    addEvent({ type: "info", message: `Underhåll påbörjat på ${aircraftId}`, base: baseId as any });
  }, [addEvent]);

  const sendOnMission = useCallback((baseId: string, aircraftId: string, mission: string) => {
    setState((prev) => {
      const bases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        return mapAircraft(base, (ac) => {
          if (ac.id !== aircraftId || ac.status !== "ready") return ac;
          return { ...ac, status: "on_mission" as const, currentMission: mission as any };
        });
      });
      return { ...prev, bases };
    });
    addEvent({ type: "success", message: `${aircraftId} skickad på ${mission}-uppdrag`, base: baseId as any });
  }, [addEvent]);

  const assignAircraftToOrder = useCallback((orderId: string, aircraftIds: string[]) => {
    setState((prev) => ({
      ...prev,
      atoOrders: prev.atoOrders.map((o) =>
        o.id === orderId
          ? { ...o, assignedAircraft: aircraftIds, status: "assigned" as const }
          : o
      ),
    }));
  }, []);

  const dispatchOrder = useCallback((orderId: string) => {
    setState((prev) => {
      const order = prev.atoOrders.find((o) => o.id === orderId);
      if (!order || order.assignedAircraft.length === 0) return prev;

      const updatedBases = prev.bases.map((base) => {
        if (base.id !== order.launchBase) return base;
        return mapAircraft(base, (ac) =>
          order.assignedAircraft.includes(ac.id) && ac.status === "ready"
            ? { ...ac, status: "on_mission" as const, currentMission: order.missionType }
            : ac
        );
      });

      const newEvent: GameEvent = {
        id: crypto.randomUUID(),
        timestamp: `Dag ${prev.day} ${String(prev.hour).padStart(2, "0")}:00`,
        type: "success",
        message: `ATO-order ${order.missionType} (${order.label}): ${order.assignedAircraft.length} fpl skickade från ${order.launchBase}`,
        base: order.launchBase,
      };

      return {
        ...prev,
        bases: updatedBases,
        successfulMissions: prev.successfulMissions + 1,
        atoOrders: prev.atoOrders.map((o) =>
          o.id === orderId ? { ...o, status: "dispatched" as const } : o
        ),
        events: [newEvent, ...prev.events].slice(0, 50),
      };
    });
  }, []);

  const moveAircraftToMaintenance = useCallback((baseId: string, aircraftId: string) => {
    setState((prev) => {
      const updatedBases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;

        const updated = mapAircraft(base, (ac) => {
          if (ac.id !== aircraftId) return ac;
          // Aircraft can only go to maintenance if it's NMC
          if (ac.status === "unavailable") {
            return { ...ac, status: "under_maintenance" as const };
          }
          return ac;
        });

        // Check if we exceeded maintenance bays
        const maintenanceCount = getAircraft(updated).filter((a) => a.status === "under_maintenance").length;
        const nextOccupied = Math.min(maintenanceCount, base.maintenanceBays.total);

        return {
          ...updated,
          maintenanceBays: { ...base.maintenanceBays, occupied: nextOccupied },
        };
      });

      return { ...prev, bases: updatedBases };
    });
  }, []);

  const sendMissionDrop = useCallback((baseId: string, aircraftId: string, missionType: string = "DCA") => {
    setState((prev) => {
      const updatedBases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        return mapAircraft(base, (ac) => {
          if (ac.id !== aircraftId || ac.status !== "ready") return ac;
          return { ...ac, status: "on_mission" as const, currentMission: missionType as any };
        });
      });
      return { ...prev, bases: updatedBases };
    });
    addEvent({ type: "success", message: `${aircraftId} skickad på ${missionType}-uppdrag via drag-drop`, base: baseId as any });
  }, [addEvent]);

  const getResourceSummary = useCallback((): string => {
    const lines: string[] = [];
    lines.push(`=== RESURSLÄGE DAG ${state.day} ${String(state.hour).padStart(2, "0")}:00 - FAS: ${state.phase} ===\n`);

    state.bases.forEach((base) => {
      const acs = getAircraft(base);
      const mc = acs.filter((a) => a.status === "ready").length;
      const nmc = acs.filter((a) => a.status === "unavailable").length;
      const maint = acs.filter((a) => a.status === "under_maintenance").length;
      const onMission = acs.filter((a) => a.status === "on_mission").length;

      lines.push(`\n--- ${base.name} (${base.id}) ---`);
      lines.push(`Flygplan: ${acs.length} totalt | ${mc} MC | ${nmc} NMC | ${maint} i UH | ${onMission} på uppdrag`);
      lines.push(`Bränsle: ${base.fuel.toFixed(0)}%`);
      lines.push(`Underhållsplatser: ${base.maintenanceBays.occupied}/${base.maintenanceBays.total} upptagna`);
      lines.push(`Personal tillgänglig: ${base.personnel.map((p) => `${p.role}: ${p.available}/${p.total}`).join(", ")}`);
      lines.push(`Reservdelar: ${base.spareParts.map((p) => `${p.name}: ${p.quantity}/${p.maxQuantity}`).join(", ")}`);
      lines.push(`Ammunition: ${base.ammunition.map((a) => `${a.type}: ${a.quantity}/${a.max}`).join(", ")}`);

      const nmcAircraft = acs.filter((a) => a.status === "unavailable" || a.status === "under_maintenance");
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

  const applyUtfallOutcome = useCallback((
    baseId: string,
    aircraftId: string,
    repairTime: number,
    maintenanceTypeKey: string,
    weaponLoss: number,
    actionLabel: string,
  ) => {
    setState((prev) => {
      const bases = prev.bases.map((base) => {
        if (base.id !== baseId) return base;
        const updated = mapAircraft(base, (ac) => {
          if (ac.id !== aircraftId) return ac;
          if (repairTime === 0) {
            return { ...ac, status: "unavailable" as const };
          }
          return {
            ...ac,
            status: "under_maintenance" as const,
            maintenanceType: maintenanceTypeKey as any,
            maintenanceTimeRemaining: repairTime,
          };
        });
        const maintCount = getAircraft(updated).filter((a) => a.status === "under_maintenance").length;
        return {
          ...updated,
          maintenanceBays: { ...base.maintenanceBays, occupied: Math.min(maintCount, base.maintenanceBays.total) },
        };
      });
      return { ...prev, bases };
    });
    addEvent({
      type: "warning",
      message: `UTFALL: ${aircraftId} — ${actionLabel} — ${repairTime}h underhåll (Vapensystemsförlust ${weaponLoss}%)`,
      base: baseId as any,
    });
  }, [addEvent]);

  const resetGame = useCallback(() => {
    setState(initialGameState);
  }, []);

  return { state, advanceTurn, startMaintenance, sendOnMission, addEvent, getResourceSummary, resetGame, assignAircraftToOrder, dispatchOrder, moveAircraftToMaintenance, sendMissionDrop, applyUtfallOutcome };
}
