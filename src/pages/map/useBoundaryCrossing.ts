import { useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import type { Unit } from "@/types/units";
import { useGame } from "@/context/GameContext";
import { SWEDEN_EEZ_RING, SWEDEN_FIR_RING } from "@/data/geoBoundaries";

const EEZ_POLY = turf.polygon([SWEDEN_EEZ_RING]);
const FIR_POLY = turf.polygon([SWEDEN_FIR_RING]);

function fmtTimestamp(): string {
  const now = new Date();
  const months = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
  const d = now.getDate();
  const m = months[now.getMonth()];
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${d} ${m} ${hh}:${mm}`;
}

export function useBoundaryCrossing(units: Unit[]) {
  const { dispatch } = useGame();
  const eezStatus = useRef<Map<string, boolean>>(new Map());
  const firStatus = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    for (const unit of units) {
      if (!unit.position || typeof unit.position.lng !== "number" || typeof unit.position.lat !== "number") continue;
      const pt = turf.point([unit.position.lng, unit.position.lat]);

      // EEZ check
      const inEEZ = turf.booleanPointInPolygon(pt, EEZ_POLY);
      const prevEEZ = eezStatus.current.get(unit.id);
      if (prevEEZ !== undefined && prevEEZ !== inEEZ) {
        dispatch({
          type: "ADD_EVENT",
          event: {
            type: inEEZ ? "info" : "warning",
            message: inEEZ
              ? `${unit.name} har passerat in i svensk EEZ`
              : `${unit.name} har lämnat svensk EEZ — utanför ekonomisk zon`,
            unitId: unit.id,
            unitCategory: unit.category,
          },
        });
      }
      eezStatus.current.set(unit.id, inEEZ);

      // FIR check
      const inFIR = turf.booleanPointInPolygon(pt, FIR_POLY);
      const prevFIR = firStatus.current.get(unit.id);
      if (prevFIR !== undefined && prevFIR !== inFIR) {
        dispatch({
          type: "ADD_EVENT",
          event: {
            type: inFIR ? "info" : "warning",
            message: inFIR
              ? `${unit.name} har passerat in i svensk FIR (ESOS)`
              : `${unit.name} har lämnat svensk FIR — utanför ansvarsområde`,
            unitId: unit.id,
            unitCategory: unit.category,
          },
        });
      }
      firStatus.current.set(unit.id, inFIR);
    }
  }, [units, dispatch]);
}
