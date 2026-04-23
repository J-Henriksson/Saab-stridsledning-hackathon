# Multi-Unit Battle Map — Design Spec

**Date:** 2026-04-23
**Status:** Draft for review
**Scope:** Expand the real-time airbase simulation into a palantir-style battle map that supports multiple unit categories (aircraft, drones, air defense, ground vehicles, ground radar) with NATO-standard APP-6(D) symbology.

---

## 1. Goals

1. Introduce a unified `Unit` model that replaces `Aircraft` as the primary entity. Every battlefield entity — aircraft, drone, SAM battery, ground vehicle, ground radar — is a `Unit`.
2. Render all units on the tactical map using proper NATO APP-6(D) symbology (via the `milsymbol` library). Support full affiliation set: friend / hostile / neutral / unknown / pending.
3. Allow units to be stored at a base (with infrastructure-gated capacity for aircraft-like units, unlimited for ground forces), deployed out to a field position, transferred between bases, and inspected/managed individually.
4. Track the most recent base each unit was assigned to (`lastBase`).
5. Reuse the existing fuel, speed, health, and event-logging systems. No parallel machinery.
6. Log unit lifecycle events into the existing `GameEvent` repository with generalized IDs and a new `unitCategory` field for AAR filtering.
7. Preserve real-time semantics: aircraft must be airborne or on-ground-at-base (never hovering); ground units can be stationary indefinitely; fuel consumption is state-dependent.

---

## 2. Non-Goals (v1)

- No sensor modeling. Ground radars and AWACS render but do not generate contacts or impose fog-of-war.
- No engagement modeling. SAMs do not fire; aircraft do not attack.
- No hostile / neutral / unknown seeded units. The affiliation field is implemented and renders correctly; seeded state is 100% friendly.
- No cargo / logistics payload on ground-vehicle transfers beyond time-based movement.
- No changes to the recommendation engine for new unit types — advisor remains aircraft-focused.
- No ATO support for ground/AD/radar units. ATO remains aviation-only (aircraft + drones).
- `milsymbol` is the sole symbology implementation; no hand-rolled SVG fallback.

---

## 3. Architecture

### 3.1 Unified Unit Type (Discriminated Union)

`Aircraft` is refactored into one variant of a new `Unit` discriminated union, keyed by `category`.

```ts
// src/types/units.ts (new file)

export type UnitCategory =
  | "aircraft"
  | "drone"
  | "air_defense"
  | "ground_vehicle"
  | "radar";

export type Affiliation =
  | "friend"
  | "hostile"
  | "neutral"
  | "unknown"
  | "pending";

export type MovementState = "stationary" | "moving" | "airborne";

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface Movement {
  state: MovementState;
  speed: number;              // current speed in knots (0 when stationary)
  heading?: number;           // degrees, optional
  destination?: GeoPosition | BaseType;  // resolves to coords
  etaHour?: number;           // hour (sim clock) at which destination is reached
}

// Shared across every unit category
export interface UnitBase {
  id: string;
  category: UnitCategory;
  name: string;                 // display name (tail number, callsign, etc.)
  affiliation: Affiliation;
  sidc: string;                 // 20-char APP-6(D) identifier for milsymbol
  health: number;               // 0–100; 0 = destroyed
  position: GeoPosition;        // always present; airborne aircraft update each tick
  movement: Movement;
  currentBase: BaseType | null; // administrative assignment (home base); distinct from physical location
  lastBase: BaseType | null;    // previous currentBase before the most recent reassignment
  deployedAt?: { day: number; hour: number }; // when it most recently left its base physically
}

// IMPORTANT: `currentBase` is the *administrative* assignment, not the physical
// location. An aircraft on a mission still has currentBase = its launch base even
// though it is airborne. Physical location is determined by *which array the unit
// lives in* — base.units (at base) vs state.deployedUnits (in the field). The two
// concerns are intentionally decoupled so that existing aircraft lifecycle
// semantics are preserved.

// --- Variants ---

export interface AircraftUnit extends UnitBase {
  category: "aircraft";
  type: AircraftType;           // existing: GripenE | GripenF_EA | GlobalEye | VLO_UCAV | LOTUS
  role?: "fighter" | "awacs" | "ucav" | "transport";
  status: AircraftStatus;       // existing 9-state lifecycle
  flightHours: number;
  hoursToService: number;
  currentMission?: MissionType;
  missionEndHour?: number;
  rebaseTarget?: BaseType;
  payload?: string;
  maintenanceTimeRemaining?: number;
  maintenanceType?: MaintenanceType;
  maintenanceTask?: MaintenanceTask;
  requiredSparePart?: string;
  fuel: number;                 // 0–100 (% of tank)
}

export interface DroneUnit extends UnitBase {
  category: "drone";
  type: "ISR_DRONE" | "STRIKE_DRONE";
  status: AircraftStatus;       // reuses aircraft lifecycle (ready/allocated/on_mission/...)
  fuel: number;
  enduranceHours: number;       // max loiter
  currentMission?: MissionType;
  missionEndHour?: number;
}

export interface AirDefenseUnit extends UnitBase {
  category: "air_defense";
  type: "SAM_SHORT" | "SAM_MEDIUM" | "SAM_LONG";
  deployedState: "emplaced" | "stowed";  // emplaced = ready to engage, stowed = relocatable
  missileStock: { loaded: number; max: number };
  fuel: number;                 // for the launcher vehicle; drains only when moving
  relocateSpeed: number;        // knots when moving
}

export interface GroundVehicleUnit extends UnitBase {
  category: "ground_vehicle";
  type: "LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER";
  fuel: number;                 // drains only when movement.state === "moving"
  roadSpeed: number;            // knots-equivalent
}

export interface RadarUnit extends UnitBase {
  category: "radar";
  type: "SEARCH_RADAR" | "TRACKING_RADAR";
  deployedState: "emplaced" | "stowed";
  emitting: boolean;            // cosmetic; no sensor fusion in v1
  relocateSpeed: number;
}

export type Unit =
  | AircraftUnit
  | DroneUnit
  | AirDefenseUnit
  | GroundVehicleUnit
  | RadarUnit;
```

### 3.2 Base Changes

```ts
// src/types/game.ts

export interface Base {
  // ...existing fields (id, name, type, spareParts, personnel, fuel, zones, etc.)
  units: Unit[];               // REPLACES aircraft: Aircraft[]
  // Backwards-compat accessor (derived, not stored): aircraft = units.filter(u => u.category === "aircraft")
}
```

The `aircraft` field is removed. Existing code paths that read `base.aircraft` are migrated to either:
- `base.units.filter((u): u is AircraftUnit => u.category === "aircraft")` — type-narrowed to preserve aircraft-specific field access, OR
- a small helper: `getAircraft(base: Base): AircraftUnit[]`.

### 3.3 Capacity Model

Per-category config driven by a new `unitTypeConfig` registry.

```ts
// src/data/config/unitTypes.ts (new file)

export interface UnitTypeConfig {
  category: UnitCategory;
  infrastructureGated: boolean;  // true = must fit in a zone; false = unlimited
  homeZone?: ZoneType;           // e.g. "parking" for aircraft
  slotCost: number;              // default 1; can be >1 for heavy units
  defaultSidc: string;           // template SIDC (affiliation digit is substituted at runtime)
}

export const UNIT_TYPE_CONFIG: Record<UnitCategory, UnitTypeConfig> = {
  aircraft:       { category: "aircraft",       infrastructureGated: true,  homeZone: "parking",      slotCost: 1, defaultSidc: "10031000001103000000" },
  drone:          { category: "drone",          infrastructureGated: true,  homeZone: "parking",      slotCost: 1, defaultSidc: "10031100001105000000" },
  air_defense:    { category: "air_defense",    infrastructureGated: false,                            slotCost: 1, defaultSidc: "10061000001100000000" },
  ground_vehicle: { category: "ground_vehicle", infrastructureGated: false,                            slotCost: 1, defaultSidc: "10061000001200000000" },
  radar:          { category: "radar",          infrastructureGated: false,                            slotCost: 1, defaultSidc: "10062000001300000000" },
};
```

Capacity gate helper (single source of truth):

```ts
// src/core/units/capacity.ts
export function canStoreUnit(base: Base, unit: Unit): { ok: boolean; reason?: string } {
  const cfg = UNIT_TYPE_CONFIG[unit.category];
  if (!cfg.infrastructureGated) return { ok: true };

  const zone = base.zones.find(z => z.type === cfg.homeZone);
  if (!zone) return { ok: false, reason: `No ${cfg.homeZone} zone at ${base.name}` };
  if (zone.occupied + cfg.slotCost > zone.capacity) {
    return { ok: false, reason: `${cfg.homeZone} full at ${base.name}` };
  }
  return { ok: true };
}
```

Every store/recover path (`STORE_UNIT`, `RECOVER_UNIT` actions, landing handlers) calls `canStoreUnit` before mutating state. Zone `occupied` counts are recomputed from `base.units` after any change (pure derivation, not mutation).

### 3.4 NATO Symbology (milsymbol)

- Dependency: `milsymbol` (BSD, ~60KB gzipped). Install: `pnpm add milsymbol`.
- Each unit stores a 20-character SIDC string. The affiliation digit (position 4 in APP-6D) is derived from `unit.affiliation` at store time and kept in sync via a `setAffiliation(unit, aff)` helper that rewrites the SIDC.
- A reusable `<UnitSymbol sidc={...} size={...} />` React component wraps `ms.Symbol(sidc).asSVG()`. Rendered inline in the MapLibre layer and in list/detail UI.
- Default SIDC templates live in `UNIT_TYPE_CONFIG[category].defaultSidc`. A helper `buildSidc(category, affiliation, overrides?)` produces the final string at unit creation.

### 3.5 Affiliation Model

All five states (`friend | hostile | neutral | unknown | pending`) are supported end-to-end:
- `UnitBase.affiliation` field
- SIDC digit rewriting on change
- `milsymbol` renders the correct frame automatically
- A `CONTACT_CLASSIFIED` event is logged when affiliation promotes from `unknown`/`pending` to any resolved value

Seeded data is 100% friendly; other affiliations exist in the type system for future work.

---

## 4. Simulation Behavior

### 4.1 Per-Category Movement & Fuel Rules

Implemented in a new `tickUnit(unit, state)` function called from the existing per-hour advance loop:

| Category | Stationary allowed? | Fuel drain (per hour) | Speed when moving |
|---|---|---|---|
| `aircraft` | Only when at base (ground) | Existing `FUEL_DRAIN_RATE[phase]` while `status === "on_mission"` OR `movement.state === "airborne"` | `cruiseSpeed` per type |
| `drone` | Only at base | Same as aircraft, lower magnitude (0.3× aircraft rate) | slower; per-type |
| `air_defense` | Yes, indefinitely | Zero when `deployedState === "emplaced"`; vehicle-fuel drain while `moving` | `relocateSpeed` |
| `ground_vehicle` | Yes, indefinitely | Zero when stationary; per-km drain when moving | `roadSpeed` |
| `radar` | Yes, indefinitely | Zero (nominal power; not modeled) | `relocateSpeed` when moving |

### 4.2 Invariant Enforcement

Aircraft cannot be `stationary` in the field (physically away from base). Enforced in the reducer:

```ts
function enforceAirborneInvariant(unit: Unit, isAtBase: boolean): Unit {
  if (unit.category === "aircraft" && !isAtBase) {
    // In-field aircraft must be airborne
    if (unit.movement.state === "stationary") {
      return { ...unit, movement: { ...unit.movement, state: "airborne" } };
    }
  }
  return unit;
}
```

`isAtBase` is computed by checking whether the unit is in any `base.units` array (vs. `state.deployedUnits`). The invariant is applied after every unit mutation in `gameReducer`. The validator also rejects actions that would violate it.

### 4.3 Movement Tick

Per hour, for each unit with `movement.state === "moving"` or `"airborne"`:
1. Compute distance traveled = `speed × 1h`.
2. Advance `position` along the great-circle line toward `destination`.
3. If arrived:
   - If destination is a `BaseType`: run capacity check; if pass, `STORE_UNIT`; if fail, log `UNIT_FUEL_LOW`/divert event.
   - If destination is a `GeoPosition`: set `movement.state = "stationary"` (or `"airborne"` for aircraft — which is a violation that triggers a return-to-base).
4. Deduct fuel per category rule.
5. If `fuel <= 0`: log `UNIT_FUEL_LOW`; aircraft crash (health → 0, `UNIT_DESTROYED`); ground units stall in place.

### 4.4 Aircraft Lifecycle Integration

The existing 9-state `AircraftStatus` machine is preserved for `AircraftUnit` and `DroneUnit`. New movement fields sit *alongside* status:
- `on_mission` implies `movement.state === "airborne"`
- `ready`/`in_preparation`/`under_maintenance` implies stationary on ground, `currentBase !== null`
- A sync helper ensures status transitions update movement (and vice versa) consistently.

---

## 5. Actions (GameAction additions)

```ts
type GameAction =
  // ...existing actions
  | { type: "DEPLOY_UNIT"; unitId: string; destination: GeoPosition; speed?: number }
  | { type: "TRANSFER_UNIT"; unitId: string; toBaseId: BaseType }
  | { type: "RECALL_UNIT"; unitId: string; toBaseId?: BaseType } // default: lastBase
  | { type: "RELOCATE_UNIT"; unitId: string; destination: GeoPosition } // field-to-field move
  | { type: "CLASSIFY_CONTACT"; unitId: string; affiliation: Affiliation }
  | { type: "STORE_UNIT"; unitId: string; baseId: BaseType } // internal, on arrival
  | { type: "SET_AD_STATE"; unitId: string; deployedState: "emplaced" | "stowed" }
  | { type: "SET_RADAR_EMITTING"; unitId: string; emitting: boolean };
```

Each action:
- Runs through the existing `validators.ts` pipeline (extended with per-category checks).
- Logs one or more `GameEvent` entries with the new action types.
- Updates `lastBase` on deploy/transfer (`lastBase = currentBase`, then `currentBase = null` or `toBaseId`).

---

## 6. Event Logging Extensions

### 6.1 `GameEvent` Schema Changes

```ts
export interface GameEvent {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  base?: BaseType;

  // Generalized unit reference (replaces aircraftId)
  unitId?: string;
  unitCategory?: UnitCategory;

  // Backwards-compat alias during migration — AAR filters can read either
  aircraftId?: string;          // DEPRECATED: mirrors unitId when unitCategory === "aircraft"

  actionType?: AARActionType;
  riskLevel?: RiskLevel;
  healthAtDecision?: number;
  resourceImpact?: string;
  decisionContext?: string;
}
```

### 6.2 New `AARActionType` Values

- `UNIT_DEPLOYED` — unit left base to a field position
- `UNIT_RECALLED` — unit returned to a base (generalizes `LANDING_RECEIVED`; aircraft still fire both for compat)
- `UNIT_TRANSFERRED` — moved from base A to base B
- `UNIT_DESTROYED` — health reached 0 or explicit removal
- `CONTACT_CLASSIFIED` — affiliation resolved from `unknown`/`pending`
- `UNIT_RELOCATED` — moved between two field positions (no base change)
- `UNIT_FUEL_LOW` — generalization of existing aircraft low-fuel warning

### 6.3 AAR Page

- Existing risk-level and time-range filters unchanged.
- Add a **Unit Category** multi-select filter (all categories default on).
- Existing action-type filter gains the 7 new entries.

---

## 7. Initial Seed

Replaces `src/data/initialGameState.ts` fleet construction with a unit-aware builder:

| Base | Aircraft | Drones | Air Defense | Ground Vehicles | Radar |
|---|---|---|---|---|---|
| MOB     | 12× GripenE | 4× ISR_DRONE | 2× SAM_LONG | 6 (logistics mix) | 1× SEARCH_RADAR |
| FOB_N   | 12× GripenE + 2× LOTUS | 4× ISR_DRONE | 1× SAM_MEDIUM | 4 | 1× SEARCH_RADAR |
| FOB_S   | 6× GripenF_EA | 0 | 1× SAM_MEDIUM | 2 | 1× SEARCH_RADAR |
| *(GlobalEye)* | 1× GlobalEye tagged `role: "awacs"` | — | — | — | — |

All units spawn `affiliation: "friend"`, `currentBase` set, `lastBase` equal to `currentBase`, `movement.state === "stationary"` (or `"airborne"` for GlobalEye if on an AEW mission — inherits existing logic).

---

## 8. Map Rendering

### 8.1 Changes to `src/pages/Map.tsx` + `src/pages/map/*`

- `AircraftLayer.tsx` is renamed/expanded to `UnitsLayer.tsx`. Iterates over **all** units in all bases (`base.units.flat()`) plus any field-deployed units from a new top-level `GameState.deployedUnits: Unit[]` (for units not in any base).
- Each unit renders as `<UnitSymbol sidc={unit.sidc} />` positioned via `unit.position` and animated along `movement`.
- Existing `AircraftDetailPanel.tsx` becomes `UnitDetailPanel.tsx` — narrows per `unit.category` to display category-appropriate fields.
- `BaseDetailPanel.tsx` shows base roster grouped by category with collapsible sections.

### 8.2 New: Unit Roster / Management Screen

- New route `/units/:id` → `UnitDashboard.tsx` (modeled on existing `AircraftDashboard.tsx`).
- Shows: symbol, category-specific stats, position, movement, `currentBase`, `lastBase`, health/fuel bars, event history filtered to `unitId === this.id`, action buttons (Deploy, Recall, Transfer, Relocate, Classify).

---

## 9. State Shape Summary

```ts
export interface GameState {
  // ...existing fields
  bases: Base[];                // Base.units replaces Base.aircraft
  deployedUnits: Unit[];        // NEW: units currently not assigned to any base
  events: GameEvent[];          // schema extended with unitId/unitCategory
}
```

`deployedUnits` holds units physically in the field. Every unit lives in exactly one of: a single `base.units` array, or `state.deployedUnits`. That determines its **physical location**.

`currentBase` is the unit's **administrative assignment** (home base) and is tracked separately:
- A unit stored at a base: `currentBase = base.id` and lives in `base.units`.
- A unit launched on an aircraft mission: `currentBase = launch base` (unchanged) but lives in `state.deployedUnits` while airborne. Returns to `base.units` on recovery.
- A unit deployed to the field via `DEPLOY_UNIT`: `currentBase` still points to its home base; unit lives in `state.deployedUnits`. `RECALL_UNIT` returns it to its home (or a specified base, which updates `currentBase`/`lastBase` at arrival).
- A unit transferred between bases: travel period — lives in `state.deployedUnits` with `movement.destination = toBaseId`. On arrival: `lastBase = currentBase; currentBase = toBaseId;` and unit is pushed into the destination base's `units`.

This decoupling preserves the existing aircraft-on-mission semantics while giving ground units a natural field/base distinction.

---

## 10. Migration Plan

1. **Type introduction.** Add `src/types/units.ts`. Leave `src/types/game.ts` `Aircraft` interface in place as a re-export alias: `export type Aircraft = AircraftUnit`.
2. **Dual-read phase.** Add `Base.units` alongside `Base.aircraft`; populate both at state init. Readers can migrate incrementally.
3. **Migrate call sites.** Replace `base.aircraft` reads with `getAircraft(base)` helper; replace writes with `STORE_UNIT`/`RECOVER_UNIT`.
4. **Remove `Base.aircraft`.** Once all readers use the helper, delete the field and the `Aircraft` alias.
5. **Extend engine.** Add unit movement tick, deploy/transfer/recall actions, new event types.
6. **Map refactor.** Rename `AircraftLayer` → `UnitsLayer`; add `milsymbol` rendering.
7. **Seed & UI.** Update `initialGameState.ts` with full seed; add `UnitDashboard`.
8. **AAR filters.** Add category filter; update action-type filter.

Each step is independently shippable and does not break the running game.

---

## 11. Testing Strategy

Reuses Vitest for pure logic:

- `tickUnit` per-category fuel/movement rules (seeded RNG where applicable).
- `canStoreUnit` for infrastructure-gated vs. unlimited categories, slot-cost edge cases.
- Airborne invariant: deployed aircraft never enter `stationary`.
- Action handlers: `DEPLOY_UNIT`, `TRANSFER_UNIT`, `RECALL_UNIT` produce correct `lastBase`/`currentBase` transitions and emit the correct events.
- SIDC construction: affiliation changes rewrite the correct digit.
- Backwards compat: `event.aircraftId` and `event.unitId` stay in sync for aircraft events during migration.

Playwright coverage (one smoke test):
- Map loads, all seeded units render with milsymbol SVGs, clicking a unit opens `UnitDashboard`.

---

## 12. Files Touched (Summary)

**New files:**
- `src/types/units.ts` — discriminated union
- `src/data/config/unitTypes.ts` — per-category registry
- `src/core/units/capacity.ts` — `canStoreUnit`
- `src/core/units/tick.ts` — `tickUnit` per-hour update
- `src/core/units/sidc.ts` — SIDC construction/rewriting helpers
- `src/components/map/UnitSymbol.tsx` — milsymbol wrapper
- `src/pages/UnitDashboard.tsx` — per-unit management screen

**Modified:**
- `src/types/game.ts` — `Base.units`, `GameState.deployedUnits`, `GameEvent` generalization
- `src/data/initialGameState.ts` — full seed
- `src/core/engine.ts` — new actions, invariant enforcement, tick integration
- `src/core/validators.ts` — per-category rules
- `src/pages/map/AircraftLayer.tsx` → `UnitsLayer.tsx`
- `src/pages/map/AircraftDetailPanel.tsx` → `UnitDetailPanel.tsx`
- `src/pages/AARPage.tsx` — category filter, new action types
- `package.json` — add `milsymbol`

**Removed (end of migration):**
- `Base.aircraft` field (replaced by `Base.units`)
- `Aircraft` type alias (once all consumers use `AircraftUnit` or `Unit`)
