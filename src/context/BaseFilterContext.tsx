import { createContext, useContext, useState } from "react";
import type { BaseType, GameEvent } from "@/types/game";

export type FilterLevel = "global" | "base" | "unit";

interface BaseFilterContextValue {
  focusedBaseId: BaseType | null;
  filterLevel: FilterLevel;
  focusedUnitId: string | null;
  setFocusedBase: (id: BaseType | null) => void;
  setFilterLevel: (level: FilterLevel) => void;
  setFocusedUnit: (id: string | null) => void;
  clearFilter: () => void;
  filterEvents: (events: GameEvent[]) => GameEvent[];
}

const BaseFilterContext = createContext<BaseFilterContextValue | null>(null);

export function BaseFilterProvider({ children }: { children: React.ReactNode }) {
  const [focusedBaseId, setFocusedBaseId] = useState<BaseType | null>(null);
  const [filterLevel, setFilterLevelState] = useState<FilterLevel>("global");
  const [focusedUnitId, setFocusedUnit] = useState<string | null>(null);

  const setFocusedBase = (id: BaseType | null) => {
    setFocusedBaseId(id);
    setFilterLevelState(id ? "base" : "global");
    setFocusedUnit(null);
  };

  const setFilterLevel = (level: FilterLevel) => {
    setFilterLevelState(level);
    if (level === "global") {
      setFocusedBaseId(null);
      setFocusedUnit(null);
    }
  };

  const clearFilter = () => {
    setFocusedBaseId(null);
    setFilterLevelState("global");
    setFocusedUnit(null);
  };

  const filterEvents = (events: GameEvent[]): GameEvent[] => {
    if (filterLevel === "global" || !focusedBaseId) return events;
    if (filterLevel === "unit" && focusedUnitId) {
      return events.filter((e) => e.unitId === focusedUnitId || e.base === focusedBaseId);
    }
    // base level — show events tagged to this base, plus untagged global events
    const baseEvents = events.filter((e) => e.base === focusedBaseId);
    const globalEvents = events.filter((e) => !e.base);
    return [...baseEvents, ...globalEvents].sort((a, b) => b.id.localeCompare(a.id));
  };

  return (
    <BaseFilterContext.Provider
      value={{
        focusedBaseId,
        filterLevel,
        focusedUnitId,
        setFocusedBase,
        setFilterLevel,
        setFocusedUnit,
        clearFilter,
        filterEvents,
      }}
    >
      {children}
    </BaseFilterContext.Provider>
  );
}

export function useBaseFilter(): BaseFilterContextValue {
  const ctx = useContext(BaseFilterContext);
  if (!ctx) throw new Error("useBaseFilter must be used within <BaseFilterProvider>");
  return ctx;
}
