import {
  UTFALL_TABLE_A,
  UTFALL_TABLE_B,
  WEAPON_LOSS_BY_ROLL,
  EXTRA_MAINTENANCE_TIME_BY_ROLL,
  BASE_FAILURE_RATE,
  FAILURE_TYPE_WEIGHTS,
  QUICK_FAILURE_TYPE_WEIGHTS,
  MTBF_GRACE_HOURS,
  YELLOW_FAILURE_RATE,
  RED_FAILURE_RATE,
  type UtfallOutcome,
} from "@/data/config/probabilities";
import type { MaintenanceType } from "@/types/game";

/** Seeded random number generator for deterministic replay */
export function createRng(seed: number) {
  let s = seed;
  return {
    /** Returns a float in [0, 1) */
    next(): number {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0x100000000;
    },
    /** Returns an integer in [1, sides] */
    roll(sides: number): number {
      return Math.floor(this.next() * sides) + 1;
    },
    /** Returns true with given probability */
    chance(probability: number): boolean {
      return this.next() < probability;
    },
  };
}

/** Non-deterministic roll (for production use) */
export function rollDice(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Check if a random failure occurs for an MC aircraft.
 *  Returns false unconditionally if flightHours < MTBF_GRACE_HOURS. */
export function rollRandomFailure(flightHours: number): boolean {
  if (flightHours < MTBF_GRACE_HOURS) return false;
  return Math.random() < (YELLOW_FAILURE_RATE + RED_FAILURE_RATE);
}

/** After rollRandomFailure returns true, determine if the failure is critical (red).
 *  ~17% of failures are critical → unavailable; ~83% are yellow → under_maintenance. */
export function rollIsCriticalFailure(): boolean {
  return Math.random() < RED_FAILURE_RATE / (YELLOW_FAILURE_RATE + RED_FAILURE_RATE);
}

/** Get random failure type and repair time (any severity) */
export function rollFailureType(): { type: MaintenanceType; time: number } {
  const totalWeight = FAILURE_TYPE_WEIGHTS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * totalWeight;
  for (const f of FAILURE_TYPE_WEIGHTS) {
    r -= f.weight;
    if (r <= 0) return { type: f.type, time: f.time };
  }
  return { type: "quick_lru", time: 2 };
}

/** Get a quick (2–4h) failure type for yellow non-critical failures */
export function rollQuickFailureType(): { type: MaintenanceType; time: number } {
  const totalWeight = QUICK_FAILURE_TYPE_WEIGHTS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * totalWeight;
  for (const f of QUICK_FAILURE_TYPE_WEIGHTS) {
    r -= f.weight;
    if (r <= 0) return { type: f.type, time: f.time };
  }
  return { type: "quick_lru", time: 2 };
}

/** Roll on Utfall Table A (prep/startup BIT) */
export function rollUtfallA(): UtfallOutcome {
  return UTFALL_TABLE_A[rollDice(6) - 1];
}

/** Roll on Utfall Table B (reception/post-mission) */
export function rollUtfallB(): UtfallOutcome {
  return UTFALL_TABLE_B[rollDice(6) - 1];
}

/** Get weapon loss percentage for a given roll */
export function getWeaponLoss(roll: number): number {
  return WEAPON_LOSS_BY_ROLL[Math.min(Math.max(roll - 1, 0), 5)];
}

/** Get extra maintenance time percentage for a given roll */
export function getExtraMaintenanceTime(roll: number): number {
  return EXTRA_MAINTENANCE_TIME_BY_ROLL[Math.min(Math.max(roll - 1, 0), 5)];
}

/** Apply stochastic delay to a nominal repair time */
export function applyStochasticDelay(nominalTime: number): { totalTime: number; delay: number } {
  const roll = rollDice(6);
  const extraPercent = getExtraMaintenanceTime(roll);
  const delay = Math.ceil(nominalTime * (extraPercent / 100));
  return { totalTime: nominalTime + delay, delay };
}
