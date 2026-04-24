import { useMemo, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { isAirDefense } from "@/types/units";
import type { AirDefenseUnit } from "@/types/units";

export function useTacticalMap() {
  const { state, dispatch } = useGame();

  const adUnits = useMemo((): AirDefenseUnit[] => {
    const fromBases = state.bases.flatMap((b) => b.units.filter(isAirDefense));
    const fromField = state.deployedUnits.filter(isAirDefense);
    return [...fromBases, ...fromField] as AirDefenseUnit[];
  }, [state.bases, state.deployedUnits]);

  const deployedAdUnits = useMemo(
    () => state.deployedUnits.filter(isAirDefense) as AirDefenseUnit[],
    [state.deployedUnits]
  );

  const assignTarget = useCallback(
    (unitId: string, targetId: string | null) =>
      dispatch({ type: "ASSIGN_TARGET", unitId, targetId }),
    [dispatch]
  );

  const toggleDeployState = useCallback(
    (unit: AirDefenseUnit) =>
      dispatch({
        type: "SET_AD_STATE",
        unitId: unit.id,
        deployedState: unit.deployedState === "emplaced" ? "stowed" : "emplaced",
      }),
    [dispatch]
  );

  return { adUnits, deployedAdUnits, assignTarget, toggleDeployState };
}
