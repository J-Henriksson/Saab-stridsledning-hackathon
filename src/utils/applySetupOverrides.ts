import type { GameState } from "@/types/game";
import type { SetupOverrides } from "@/types/setup";

export function applySetupOverrides(
  initialState: GameState,
  overrides: SetupOverrides,
): GameState {
  const mergedBases = initialState.bases.map((base) => {
    const override = overrides.bases.find((o) => o.baseId === base.id);
    if (!override) return base;

    return {
      ...base,
      fuel: override.fuel,
      aircraft: base.aircraft.slice(0, override.aircraftCount),
      ammunition: base.ammunition.map((ammo) => {
        const o = override.ammunition.find((a) => a.type === ammo.type);
        return o ? { ...ammo, quantity: o.quantity } : ammo;
      }),
      spareParts: base.spareParts.map((part) => {
        const o = override.spareParts.find((p) => p.id === part.id);
        return o ? { ...part, quantity: o.quantity } : part;
      }),
    };
  });

  return { ...initialState, bases: mergedBases };
}

export function deriveDefaultOverrides(state: GameState): SetupOverrides {
  return {
    bases: state.bases.map((base) => ({
      baseId: base.id,
      fuel: base.fuel,
      aircraftCount: base.aircraft.length,
      ammunition: base.ammunition.map((a) => ({ type: a.type, quantity: a.quantity })),
      spareParts: base.spareParts.map((p) => ({ id: p.id, quantity: p.quantity })),
    })),
  };
}
