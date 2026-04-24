import type { AirDefenseUnit } from "@/types/units";

const STATUS_FACTOR: Record<AirDefenseUnit["operationalStatus"], number> = {
  ready: 1,
  standby: 0.88,
  firing: 0.94,
  relocating: 0.45,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export interface AirDefenseRangeProfile {
  capacityFactor: number;
  healthFactor: number;
  fuelFactor: number;
  statusFactor: number;
  deploymentFactor: number;
  readinessPercent: number;
  effectiveEngagementRange: number;
  effectiveDetectionRange: number;
}

export function getAirDefenseRangeProfile(unit: AirDefenseUnit): AirDefenseRangeProfile {
  const capacityFactor = unit.missileStock.max > 0
    ? clamp01(unit.missileStock.loaded / unit.missileStock.max)
    : 0;
  const healthFactor = clamp01(unit.health / 100);
  const fuelFactor = clamp01(unit.fuel / 100);
  const statusFactor = STATUS_FACTOR[unit.operationalStatus] ?? 0.75;
  const deploymentFactor = unit.deployedState === "emplaced" ? 1 : 0.35;

  const readiness =
    capacityFactor * 0.5 +
    healthFactor * 0.25 +
    fuelFactor * 0.15 +
    statusFactor * 0.1;
  const readinessPercent = Math.round(clamp01(readiness * deploymentFactor) * 100);

  const engagementMultiplier = capacityFactor === 0
    ? 0
    : clamp01(
        (capacityFactor * 0.65 + healthFactor * 0.2 + fuelFactor * 0.05 + statusFactor * 0.1) * deploymentFactor
      );
  const detectionMultiplier = clamp01(
    (healthFactor * 0.5 + fuelFactor * 0.15 + statusFactor * 0.2 + 0.15) * Math.max(0.5, deploymentFactor)
  );

  return {
    capacityFactor,
    healthFactor,
    fuelFactor,
    statusFactor,
    deploymentFactor,
    readinessPercent,
    effectiveEngagementRange: Math.round(unit.engagementRange * engagementMultiplier),
    effectiveDetectionRange: Math.round(unit.detectionRange * detectionMultiplier),
  };
}
