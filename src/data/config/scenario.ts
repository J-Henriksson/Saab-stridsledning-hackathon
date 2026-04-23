import type { ScenarioDay, ScenarioPhase } from "@/types/game";

/** 7-day campaign scenario based on the SAAB simulation deck */
export const SCENARIO_DAYS: ScenarioDay[] = [
  { dayNumber: 1, phase: "FRED",  threats: [],      policyRestrictions: [] },
  { dayNumber: 2, phase: "KRIS",  threats: [],      policyRestrictions: [] },
  { dayNumber: 3, phase: "KRIS",  threats: [],      policyRestrictions: [] },
  { dayNumber: 4, phase: "KRIS",  threats: ["CM"],  policyRestrictions: [] },
  { dayNumber: 5, phase: "KRIG",  threats: ["TBM"], policyRestrictions: [] },
  { dayNumber: 6, phase: "KRIG",  threats: [],      policyRestrictions: [] },
  { dayNumber: 7, phase: "KRIG",  threats: [],      policyRestrictions: ["Plundring får ej ske"] },
];

export function getScenarioDay(dayNumber: number): ScenarioDay {
  return SCENARIO_DAYS.find((d) => d.dayNumber === dayNumber)
    ?? { dayNumber, phase: "KRIG" as ScenarioPhase, threats: [], policyRestrictions: [] };
}

export function getPhaseForDay(day: number): ScenarioPhase {
  return getScenarioDay(day).phase;
}

export function hasThreat(day: number, threat: "CM" | "TBM"): boolean {
  return getScenarioDay(day).threats.includes(threat);
}

export function canCannibalize(day: number): boolean {
  return !getScenarioDay(day).policyRestrictions.includes("Plundring får ej ske");
}
