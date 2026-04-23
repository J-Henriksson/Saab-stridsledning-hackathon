# Multi-Unit Battle Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the real-time airbase sim to render and manage multiple unit categories (aircraft, drones, air defense, ground vehicles, ground radar) as a unified `Unit` discriminated union, with NATO APP-6(D) symbology on the tactical map.

**Architecture:** Introduce a discriminated-union `Unit` type; `Aircraft` becomes one variant (`AircraftUnit`). `Base.units` replaces `Base.aircraft`; a new `GameState.deployedUnits` holds units physically in the field. `currentBase` stays the administrative home; physical location is determined by array membership. Per-category behavior (fuel drain, movement, capacity gating) is driven by a `UNIT_TYPE_CONFIG` registry. NATO symbols via `milsymbol` library with per-unit SIDC strings.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (jsdom), MapLibre GL, Framer Motion, `milsymbol` (new dep).

**Spec:** `docs/superpowers/specs/2026-04-23-multi-unit-battle-map-design.md`

**Conventions:**
- All paths absolute from repo root.
- Run tests with `pnpm test` (or `npm test`). The project uses Bun lock but package.json scripts are the canonical entry.
- Commit after every green-bar task. Commits use imperative mood (`feat:`, `refactor:`, `test:`).

---

## File Structure

**New files:**
- `src/types/units.ts` — `Unit` discriminated union, `UnitCategory`, `Affiliation`, `Movement`, category-specific interfaces
- `src/data/config/unitTypes.ts` — `UNIT_TYPE_CONFIG` registry with default SIDCs
- `src/core/units/capacity.ts` — `canStoreUnit`, `recomputeZoneOccupancy`
- `src/core/units/sidc.ts` — SIDC digit manipulation helpers
- `src/core/units/movement.ts` — `tickUnit` per-hour update, airborne invariant
- `src/core/units/factory.ts` — `createUnit(category, params)` builder
- `src/core/units/capacity.test.ts` — TDD
- `src/core/units/sidc.test.ts` — TDD
- `src/core/units/movement.test.ts` — TDD
- `src/components/map/UnitSymbol.tsx` — `milsymbol` React wrapper
- `src/pages/UnitDashboard.tsx` — per-unit management screen
- `src/pages/map/UnitsLayer.tsx` — replaces `AircraftLayer.tsx`, iterates all units
- `src/pages/map/UnitDetailPanel.tsx` — replaces `AircraftDetailPanel.tsx`

**Modified:**
- `src/types/game.ts` — re-export `Aircraft` as alias; add `Base.units`, `GameState.deployedUnits`, extend `GameEvent`, add new actions, new `AARActionType`s
- `src/core/engine.ts` — wire new actions, invariant enforcement, movement tick integration, generalize event logging
- `src/core/validators.ts` — per-category validation for new actions
- `src/data/initialGameState.ts` — full seed (drones, AD, ground vehicles, radars)
- `src/pages/map/AircraftLayer.tsx` — converted to `UnitsLayer.tsx`
- `src/pages/map/AircraftDetailPanel.tsx` — converted to `UnitDetailPanel.tsx`
- `src/pages/map/helpers.ts` — add unit-category utilities
- `src/pages/AARPage.tsx` — new category filter + new action-type options
- `src/App.tsx` — route for `/units/:id`
- `package.json` — add `milsymbol`

**Deferred (final cleanup task):**
- Delete `Base.aircraft` field
- Delete `Aircraft` type alias

---

## Task 1: Add `milsymbol` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

Run:
```bash
bun add milsymbol
```
(If bun is unavailable: `npm install milsymbol`.)

Expected: `package.json` gets `"milsymbol": "^X.Y.Z"` in `dependencies`; lockfile updated.

- [ ] **Step 2: Verify import resolves**

Run:
```bash
bunx tsc --noEmit --esModuleInterop --moduleResolution bundler --module esnext --target es2020 - <<'EOF'
import ms from "milsymbol";
const s = new ms.Symbol("10031000001103000000");
console.log(s.asSVG().length > 0);
EOF
```

Expected: no type errors. If `milsymbol` ships its own types this passes; if not, add `// @ts-expect-error no types` in the actual consumer later (Task 14).

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock bun.lockb package-lock.json 2>/dev/null; true
git commit -m "feat: add milsymbol dependency for NATO APP-6(D) symbology"
```

---

## Task 2: Define `Unit` discriminated-union types

**Files:**
- Create: `src/types/units.ts`

- [ ] **Step 1: Write the type module**

Create `src/types/units.ts`:

```ts
import type {
  AircraftType,
  AircraftStatus,
  BaseType,
  MaintenanceTask,
  MaintenanceType,
  MissionType,
} from "./game";

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
  speed: number;
  heading?: number;
  destination?: GeoPosition | BaseType;
  etaHour?: number;
}

export interface UnitBase {
  id: string;
  category: UnitCategory;
  name: string;
  affiliation: Affiliation;
  sidc: string;
  health: number;
  position: GeoPosition;
  movement: Movement;
  currentBase: BaseType | null;
  lastBase: BaseType | null;
  deployedAt?: { day: number; hour: number };
}

export interface AircraftUnit extends UnitBase {
  category: "aircraft";
  type: AircraftType;
  tailNumber: string;
  role?: "fighter" | "awacs" | "ucav" | "transport";
  status: AircraftStatus;
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
  fuel: number;
}

export type DroneType = "ISR_DRONE" | "STRIKE_DRONE";

export interface DroneUnit extends UnitBase {
  category: "drone";
  type: DroneType;
  status: AircraftStatus;
  fuel: number;
  enduranceHours: number;
  currentMission?: MissionType;
  missionEndHour?: number;
}

export type AirDefenseType = "SAM_SHORT" | "SAM_MEDIUM" | "SAM_LONG";

export interface AirDefenseUnit extends UnitBase {
  category: "air_defense";
  type: AirDefenseType;
  deployedState: "emplaced" | "stowed";
  missileStock: { loaded: number; max: number };
  fuel: number;
  relocateSpeed: number;
}

export type GroundVehicleType = "LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER";

export interface GroundVehicleUnit extends UnitBase {
  category: "ground_vehicle";
  type: GroundVehicleType;
  fuel: number;
  roadSpeed: number;
}

export type GroundRadarType = "SEARCH_RADAR" | "TRACKING_RADAR";

export interface RadarUnit extends UnitBase {
  category: "radar";
  type: GroundRadarType;
  deployedState: "emplaced" | "stowed";
  emitting: boolean;
  relocateSpeed: number;
}

export type Unit =
  | AircraftUnit
  | DroneUnit
  | AirDefenseUnit
  | GroundVehicleUnit
  | RadarUnit;

export function isAircraft(u: Unit): u is AircraftUnit {
  return u.category === "aircraft";
}
export function isDrone(u: Unit): u is DroneUnit {
  return u.category === "drone";
}
export function isAirDefense(u: Unit): u is AirDefenseUnit {
  return u.category === "air_defense";
}
export function isGroundVehicle(u: Unit): u is GroundVehicleUnit {
  return u.category === "ground_vehicle";
}
export function isRadar(u: Unit): u is RadarUnit {
  return u.category === "radar";
}
```

- [ ] **Step 2: Add alias to `src/types/game.ts`**

At the bottom of `src/types/game.ts`, add:

```ts
// ── Unit model (see src/types/units.ts for the discriminated union) ──────
export type { Unit, UnitCategory, Affiliation, AircraftUnit, DroneUnit, AirDefenseUnit, GroundVehicleUnit, RadarUnit, GeoPosition, Movement, MovementState } from "./units";
```

Do not delete the existing `Aircraft` interface yet — it stays as-is through migration, and callers keep reading `base.aircraft` until Task 18.

- [ ] **Step 3: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/units.ts src/types/game.ts
git commit -m "feat: introduce Unit discriminated-union type"
```

---

## Task 3: Unit type config registry

**Files:**
- Create: `src/data/config/unitTypes.ts`

- [ ] **Step 1: Write the registry**

Create `src/data/config/unitTypes.ts`:

```ts
import type { BaseZoneType } from "@/types/game";
import type { UnitCategory } from "@/types/units";

export interface UnitTypeConfig {
  category: UnitCategory;
  infrastructureGated: boolean;
  homeZone?: BaseZoneType;
  slotCost: number;
  /**
   * 20-character APP-6(D) SIDC template. The affiliation digit at index 3 is
   * replaced at runtime. These templates are starting values tuned to render
   * an unambiguous frame+icon in milsymbol; they may be refined later.
   */
  defaultSidc: string;
}

export const UNIT_TYPE_CONFIG: Record<UnitCategory, UnitTypeConfig> = {
  aircraft: {
    category: "aircraft",
    infrastructureGated: true,
    homeZone: "parking",
    slotCost: 1,
    defaultSidc: "10031000001103000000",
  },
  drone: {
    category: "drone",
    infrastructureGated: true,
    homeZone: "parking",
    slotCost: 1,
    defaultSidc: "10031100001105000000",
  },
  air_defense: {
    category: "air_defense",
    infrastructureGated: false,
    slotCost: 1,
    defaultSidc: "10061000001330010000",
  },
  ground_vehicle: {
    category: "ground_vehicle",
    infrastructureGated: false,
    slotCost: 1,
    defaultSidc: "10061000001211000000",
  },
  radar: {
    category: "radar",
    infrastructureGated: false,
    slotCost: 1,
    defaultSidc: "10062000001120000000",
  },
};
```

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/config/unitTypes.ts
git commit -m "feat: add UNIT_TYPE_CONFIG registry with SIDC templates"
```

---

## Task 4: SIDC construction helpers (TDD)

**Files:**
- Create: `src/core/units/sidc.ts`
- Create: `src/core/units/sidc.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/core/units/sidc.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { affiliationDigit, setAffiliationOnSidc, buildSidc } from "./sidc";

describe("affiliationDigit", () => {
  it("maps each affiliation to its APP-6(D) digit", () => {
    expect(affiliationDigit("friend")).toBe("3");
    expect(affiliationDigit("hostile")).toBe("6");
    expect(affiliationDigit("neutral")).toBe("4");
    expect(affiliationDigit("unknown")).toBe("1");
    expect(affiliationDigit("pending")).toBe("2");
  });
});

describe("setAffiliationOnSidc", () => {
  it("rewrites the affiliation digit at index 3, preserving the rest", () => {
    const original = "10031000001103000000";
    const updated = setAffiliationOnSidc(original, "hostile");
    expect(updated).toBe("10061000001103000000");
    expect(updated).toHaveLength(20);
  });

  it("is idempotent when the affiliation already matches", () => {
    const sidc = "10031000001103000000";
    expect(setAffiliationOnSidc(sidc, "friend")).toBe(sidc);
  });

  it("throws if the SIDC is not 20 characters", () => {
    expect(() => setAffiliationOnSidc("1003", "friend")).toThrow(/20/);
  });
});

describe("buildSidc", () => {
  it("uses the category template and applies the affiliation", () => {
    const sidc = buildSidc("aircraft", "hostile");
    expect(sidc).toHaveLength(20);
    expect(sidc[3]).toBe("6");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test -- --run src/core/units/sidc.test.ts` (or `npm test -- --run ...`)

Expected: FAIL — module not found / function not exported.

- [ ] **Step 3: Implement**

Create `src/core/units/sidc.ts`:

```ts
import type { Affiliation, UnitCategory } from "@/types/units";
import { UNIT_TYPE_CONFIG } from "@/data/config/unitTypes";

const AFFILIATION_DIGITS: Record<Affiliation, string> = {
  unknown: "1",
  pending: "2",
  friend: "3",
  neutral: "4",
  hostile: "6",
};

export function affiliationDigit(affiliation: Affiliation): string {
  return AFFILIATION_DIGITS[affiliation];
}

export function setAffiliationOnSidc(sidc: string, affiliation: Affiliation): string {
  if (sidc.length !== 20) {
    throw new Error(`SIDC must be 20 characters, got ${sidc.length}`);
  }
  const digit = affiliationDigit(affiliation);
  return sidc.slice(0, 3) + digit + sidc.slice(4);
}

export function buildSidc(category: UnitCategory, affiliation: Affiliation): string {
  const template = UNIT_TYPE_CONFIG[category].defaultSidc;
  return setAffiliationOnSidc(template, affiliation);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test -- --run src/core/units/sidc.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/units/sidc.ts src/core/units/sidc.test.ts
git commit -m "feat: SIDC helpers for affiliation digit rewriting"
```

---

## Task 5: Capacity helper (TDD)

**Files:**
- Create: `src/core/units/capacity.ts`
- Create: `src/core/units/capacity.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/core/units/capacity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Base, BaseZone } from "@/types/game";
import type { Unit } from "@/types/units";
import { canStoreUnit, recomputeZoneOccupancy } from "./capacity";

function makeBase(overrides: Partial<Base> = {}): Base {
  return {
    id: "MOB",
    name: "Test MOB",
    type: "huvudbas",
    aircraft: [],
    units: [],
    spareParts: [],
    personnel: [],
    fuel: 100,
    maxFuel: 100,
    ammunition: [],
    maintenanceBays: { total: 2, occupied: 0 },
    zones: [
      { id: "z1", type: "parking", capacity: 2, currentQueue: [], assignedWork: [], resourceStock: {} },
    ],
    ...overrides,
  } as Base;
}

function makeAircraft(id: string): Unit {
  return {
    id,
    category: "aircraft",
    type: "GripenE",
    tailNumber: id,
    name: id,
    affiliation: "friend",
    sidc: "10031000001103000000",
    health: 100,
    position: { lat: 0, lng: 0 },
    movement: { state: "stationary", speed: 0 },
    currentBase: "MOB",
    lastBase: "MOB",
    status: "ready",
    flightHours: 0,
    hoursToService: 100,
    fuel: 100,
  } as Unit;
}

function makeGroundVehicle(id: string): Unit {
  return {
    id,
    category: "ground_vehicle",
    type: "LOGISTICS_TRUCK",
    name: id,
    affiliation: "friend",
    sidc: "10061000001211000000",
    health: 100,
    position: { lat: 0, lng: 0 },
    movement: { state: "stationary", speed: 0 },
    currentBase: "MOB",
    lastBase: "MOB",
    fuel: 100,
    roadSpeed: 40,
  } as Unit;
}

describe("canStoreUnit", () => {
  it("allows infrastructure-gated unit when zone has room", () => {
    const base = makeBase();
    expect(canStoreUnit(base, makeAircraft("a1")).ok).toBe(true);
  });

  it("blocks infrastructure-gated unit when zone is full", () => {
    const base = makeBase({ units: [makeAircraft("a1"), makeAircraft("a2")] });
    const result = canStoreUnit(base, makeAircraft("a3"));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/full/i);
  });

  it("always allows non-gated unit (ground vehicle)", () => {
    const base = makeBase({ units: [makeAircraft("a1"), makeAircraft("a2")] });
    expect(canStoreUnit(base, makeGroundVehicle("t1")).ok).toBe(true);
  });

  it("reports missing zone for a gated unit when the base has no matching zone", () => {
    const base = makeBase({ zones: [] });
    const result = canStoreUnit(base, makeAircraft("a1"));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/parking/i);
  });
});

describe("recomputeZoneOccupancy", () => {
  it("sets zone.currentQueue length to count of gated units assigned to that zone", () => {
    const base = makeBase({
      units: [makeAircraft("a1"), makeAircraft("a2"), makeGroundVehicle("t1")],
    });
    const recomputed = recomputeZoneOccupancy(base);
    const parking = recomputed.zones.find(z => z.type === "parking")!;
    expect(parking.currentQueue).toHaveLength(2);
    expect(parking.currentQueue).toContain("a1");
    expect(parking.currentQueue).toContain("a2");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test -- --run src/core/units/capacity.test.ts`

Expected: FAIL (Base has no `units` field yet — fix in next step by temporarily extending game.ts Base interface).

- [ ] **Step 3: Add `units` field to `Base` interface**

Edit `src/types/game.ts`, find the `Base` interface and add one field right after `aircraft: Aircraft[];`:

```ts
export interface Base {
  id: BaseType;
  name: string;
  type: "huvudbas" | "sidobas" | "reservbas";
  aircraft: Aircraft[];
  units: import("./units").Unit[];
  spareParts: SparePartStock[];
  personnel: PersonnelGroup[];
  fuel: number;
  maxFuel: number;
  ammunition: { type: string; quantity: number; max: number }[];
  maintenanceBays: { total: number; occupied: number };
  zones: BaseZone[];
}
```

And add `deployedUnits` to `GameState`:

```ts
export interface GameState {
  day: number;
  hour: number;
  phase: ScenarioPhase;
  bases: Base[];
  deployedUnits: import("./units").Unit[];
  successfulMissions: number;
  failedMissions: number;
  events: GameEvent[];
  atoOrders: ATOOrder[];
  isRunning: boolean;
  recommendations: Recommendation[];
  maintenanceTasks: MaintenanceTask[];
  pendingLandingChecks: { aircraftId: string; baseId: BaseType }[];
}
```

Then in `src/data/initialGameState.ts`, initialize both:
- find each base-builder and add `units: []` right after the `aircraft:` field
- find the root `initialGameState` return value and add `deployedUnits: []`

Run `bunx tsc --noEmit` and fix any complaints by adding `units: []` / `deployedUnits: []` wherever a base/state is constructed.

- [ ] **Step 4: Implement capacity helpers**

Create `src/core/units/capacity.ts`:

```ts
import type { Base } from "@/types/game";
import type { Unit } from "@/types/units";
import { UNIT_TYPE_CONFIG } from "@/data/config/unitTypes";

export interface CapacityResult {
  ok: boolean;
  reason?: string;
}

export function canStoreUnit(base: Base, unit: Unit): CapacityResult {
  const cfg = UNIT_TYPE_CONFIG[unit.category];
  if (!cfg.infrastructureGated) return { ok: true };

  const zone = base.zones.find(z => z.type === cfg.homeZone);
  if (!zone) {
    return { ok: false, reason: `No ${cfg.homeZone} zone at ${base.name}` };
  }
  const occupied = base.units.filter(u => {
    const uCfg = UNIT_TYPE_CONFIG[u.category];
    return uCfg.infrastructureGated && uCfg.homeZone === cfg.homeZone;
  }).length;
  if (occupied + cfg.slotCost > zone.capacity) {
    return { ok: false, reason: `${cfg.homeZone} full at ${base.name}` };
  }
  return { ok: true };
}

export function recomputeZoneOccupancy(base: Base): Base {
  const zones = base.zones.map(zone => {
    const occupants = base.units
      .filter(u => {
        const cfg = UNIT_TYPE_CONFIG[u.category];
        return cfg.infrastructureGated && cfg.homeZone === zone.type;
      })
      .map(u => u.id);
    return { ...zone, currentQueue: occupants };
  });
  return { ...base, zones };
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `bun run test -- --run src/core/units/capacity.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/units/capacity.ts src/core/units/capacity.test.ts src/types/game.ts src/data/initialGameState.ts
git commit -m "feat: canStoreUnit + recomputeZoneOccupancy with Base.units field"
```

---

## Task 6: Unit factory

**Files:**
- Create: `src/core/units/factory.ts`

- [ ] **Step 1: Implement factory**

Create `src/core/units/factory.ts`:

```ts
import type { BaseType } from "@/types/game";
import type {
  Affiliation,
  AircraftUnit,
  AirDefenseUnit,
  DroneUnit,
  GeoPosition,
  GroundVehicleUnit,
  RadarUnit,
  Unit,
} from "@/types/units";
import { buildSidc } from "./sidc";
import { uuid } from "@/core/uuid";

interface CommonParams {
  name: string;
  affiliation?: Affiliation;
  position: GeoPosition;
  currentBase: BaseType | null;
}

export function createAircraftUnit(params: CommonParams & {
  type: AircraftUnit["type"];
  tailNumber: string;
  role?: AircraftUnit["role"];
  fuel?: number;
}): AircraftUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
    category: "aircraft",
    type: params.type,
    tailNumber: params.tailNumber,
    name: params.name,
    role: params.role,
    affiliation,
    sidc: buildSidc("aircraft", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    status: "ready",
    flightHours: 0,
    hoursToService: 100,
    fuel: params.fuel ?? 100,
  };
}

export function createDroneUnit(params: CommonParams & {
  type: DroneUnit["type"];
  enduranceHours?: number;
}): DroneUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
    category: "drone",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("drone", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    status: "ready",
    fuel: 100,
    enduranceHours: params.enduranceHours ?? 12,
  };
}

export function createAirDefenseUnit(params: CommonParams & {
  type: AirDefenseUnit["type"];
  loadedMissiles?: number;
  maxMissiles?: number;
  relocateSpeed?: number;
}): AirDefenseUnit {
  const affiliation = params.affiliation ?? "friend";
  const max = params.maxMissiles ?? 8;
  return {
    id: uuid(),
    category: "air_defense",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("air_defense", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    deployedState: "emplaced",
    missileStock: { loaded: params.loadedMissiles ?? max, max },
    fuel: 100,
    relocateSpeed: params.relocateSpeed ?? 30,
  };
}

export function createGroundVehicleUnit(params: CommonParams & {
  type: GroundVehicleUnit["type"];
  roadSpeed?: number;
}): GroundVehicleUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
    category: "ground_vehicle",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("ground_vehicle", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    fuel: 100,
    roadSpeed: params.roadSpeed ?? 40,
  };
}

export function createRadarUnit(params: CommonParams & {
  type: RadarUnit["type"];
  emitting?: boolean;
  relocateSpeed?: number;
}): RadarUnit {
  const affiliation = params.affiliation ?? "friend";
  return {
    id: uuid(),
    category: "radar",
    type: params.type,
    name: params.name,
    affiliation,
    sidc: buildSidc("radar", affiliation),
    health: 100,
    position: params.position,
    movement: { state: "stationary", speed: 0 },
    currentBase: params.currentBase,
    lastBase: params.currentBase,
    deployedState: "emplaced",
    emitting: params.emitting ?? true,
    relocateSpeed: params.relocateSpeed ?? 25,
  };
}

export type UnitFactory = typeof createAircraftUnit
  | typeof createDroneUnit
  | typeof createAirDefenseUnit
  | typeof createGroundVehicleUnit
  | typeof createRadarUnit;

export type { Unit };
```

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/core/units/factory.ts
git commit -m "feat: unit factory helpers per category"
```

---

## Task 7: Movement tick + airborne invariant (TDD)

**Files:**
- Create: `src/core/units/movement.ts`
- Create: `src/core/units/movement.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/core/units/movement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  enforceAirborneInvariant,
  advanceMovement,
  perHourFuelDrain,
} from "./movement";
import {
  createAircraftUnit,
  createGroundVehicleUnit,
  createAirDefenseUnit,
} from "./factory";

describe("enforceAirborneInvariant", () => {
  it("forces stationary in-field aircraft to airborne", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1",
      type: "GripenE",
      position: { lat: 0, lng: 0 },
      currentBase: "MOB",
    });
    const corrected = enforceAirborneInvariant(aircraft, false);
    expect(corrected.movement.state).toBe("airborne");
  });

  it("leaves at-base aircraft stationary", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1",
      type: "GripenE",
      position: { lat: 0, lng: 0 },
      currentBase: "MOB",
    });
    const corrected = enforceAirborneInvariant(aircraft, true);
    expect(corrected.movement.state).toBe("stationary");
  });

  it("does not touch ground vehicles in the field", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: null,
    });
    const corrected = enforceAirborneInvariant(v, false);
    expect(corrected.movement.state).toBe("stationary");
  });
});

describe("perHourFuelDrain", () => {
  it("drains fuel for airborne aircraft at the phase rate", () => {
    const aircraft = createAircraftUnit({
      name: "A1", tailNumber: "A1", type: "GripenE",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    aircraft.movement = { state: "airborne", speed: 400 };
    expect(perHourFuelDrain(aircraft, "KRIG")).toBeGreaterThan(0);
  });

  it("drains zero for stationary ground vehicle", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    expect(perHourFuelDrain(v, "KRIG")).toBe(0);
  });

  it("drains >0 for moving ground vehicle", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    v.movement = { state: "moving", speed: 40 };
    expect(perHourFuelDrain(v, "KRIG")).toBeGreaterThan(0);
  });

  it("drains zero for emplaced air defense", () => {
    const ad = createAirDefenseUnit({
      name: "S1", type: "SAM_LONG",
      position: { lat: 0, lng: 0 }, currentBase: "MOB",
    });
    expect(perHourFuelDrain(ad, "KRIG")).toBe(0);
  });
});

describe("advanceMovement", () => {
  it("moves a moving unit toward its destination by speed * 1h", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 58.0, lng: 15.0 }, currentBase: null,
    });
    v.movement = { state: "moving", speed: 30, destination: { lat: 58.5, lng: 15.0 } };
    const moved = advanceMovement(v);
    // Moved some distance toward destination but not past it
    expect(moved.position.lat).toBeGreaterThan(58.0);
    expect(moved.position.lat).toBeLessThanOrEqual(58.5);
  });

  it("snaps to destination and becomes stationary on arrival", () => {
    const v = createGroundVehicleUnit({
      name: "T1", type: "LOGISTICS_TRUCK",
      position: { lat: 58.0, lng: 15.0 }, currentBase: null,
    });
    // Tiny delta so one hour at any speed arrives
    v.movement = { state: "moving", speed: 500, destination: { lat: 58.0001, lng: 15.0001 } };
    const moved = advanceMovement(v);
    expect(moved.position.lat).toBe(58.0001);
    expect(moved.position.lng).toBe(15.0001);
    expect(moved.movement.state).toBe("stationary");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `bun run test -- --run src/core/units/movement.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement movement module**

Create `src/core/units/movement.ts`:

```ts
import type { ScenarioPhase } from "@/types/game";
import { FUEL_DRAIN_RATE } from "@/data/config/capacities";
import type { Unit, GeoPosition } from "@/types/units";

const KNOTS_TO_DEG_PER_HOUR = 1 / 60; // 1 nautical mile ≈ 1 arc-minute ≈ 1/60 degree

function isGeoPosition(x: unknown): x is GeoPosition {
  return !!x && typeof x === "object" && "lat" in (x as object) && "lng" in (x as object);
}

export function enforceAirborneInvariant(unit: Unit, isAtBase: boolean): Unit {
  if (unit.category === "aircraft" && !isAtBase) {
    if (unit.movement.state === "stationary") {
      return { ...unit, movement: { ...unit.movement, state: "airborne" } };
    }
  }
  return unit;
}

/** Fuel drained per hour for this unit in the current phase. */
export function perHourFuelDrain(unit: Unit, phase: ScenarioPhase): number {
  switch (unit.category) {
    case "aircraft":
      if (unit.movement.state === "airborne" || unit.status === "on_mission") {
        return FUEL_DRAIN_RATE[phase] ?? 0.5;
      }
      return 0;
    case "drone":
      if (unit.movement.state === "airborne" || unit.status === "on_mission") {
        return (FUEL_DRAIN_RATE[phase] ?? 0.5) * 0.3;
      }
      return 0;
    case "ground_vehicle":
      return unit.movement.state === "moving" ? 2 : 0;
    case "air_defense":
      return unit.movement.state === "moving" ? 2 : 0;
    case "radar":
      return 0;
  }
}

function distanceDeg(a: GeoPosition, b: GeoPosition): number {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Advance position by speed * 1h; if destination reached, snap + set stationary. */
export function advanceMovement(unit: Unit): Unit {
  if (unit.movement.state !== "moving" && unit.movement.state !== "airborne") {
    return unit;
  }
  const dest = unit.movement.destination;
  if (!isGeoPosition(dest)) return unit;

  const stepDeg = unit.movement.speed * KNOTS_TO_DEG_PER_HOUR;
  const remaining = distanceDeg(unit.position, dest);

  if (stepDeg >= remaining || remaining < 1e-4) {
    return {
      ...unit,
      position: { lat: dest.lat, lng: dest.lng },
      movement: { ...unit.movement, state: "stationary", speed: 0, destination: undefined },
    } as Unit;
  }

  const ratio = stepDeg / remaining;
  return {
    ...unit,
    position: {
      lat: unit.position.lat + (dest.lat - unit.position.lat) * ratio,
      lng: unit.position.lng + (dest.lng - unit.position.lng) * ratio,
    },
  } as Unit;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `bun run test -- --run src/core/units/movement.test.ts`

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/units/movement.ts src/core/units/movement.test.ts
git commit -m "feat: unit movement tick, fuel drain, airborne invariant"
```

---

## Task 8: Extend `GameEvent` schema and `AARActionType`

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/core/engine.ts` (addEvent helper)

- [ ] **Step 1: Extend types**

In `src/types/game.ts`, replace `AARActionType`:

```ts
export type AARActionType =
  | "MISSION_DISPATCH"
  | "MAINTENANCE_START"
  | "MAINTENANCE_PAUSE"
  | "LANDING_RECEIVED"
  | "UTFALL_APPLIED"
  | "SPARE_PART_USED"
  | "FAULT_NMC"
  | "HANGAR_CONFIRM"
  | "UNIT_DEPLOYED"
  | "UNIT_RECALLED"
  | "UNIT_TRANSFERRED"
  | "UNIT_DESTROYED"
  | "CONTACT_CLASSIFIED"
  | "UNIT_RELOCATED"
  | "UNIT_FUEL_LOW";
```

Replace `GameEvent`:

```ts
export interface GameEvent {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  base?: BaseType;
  /** @deprecated use unitId. Kept in sync automatically for aircraft events. */
  aircraftId?: string;
  unitId?: string;
  unitCategory?: import("./units").UnitCategory;
  actionType?: AARActionType;
  riskLevel?: RiskLevel;
  healthAtDecision?: number;
  resourceImpact?: string;
  decisionContext?: string;
}
```

- [ ] **Step 2: Update `addEvent` in `src/core/engine.ts` to mirror fields**

Find the `addEvent` helper (around the top of the file) and replace with:

```ts
function addEvent(state: GameState, event: Omit<GameEvent, "id" | "timestamp">): GameState {
  // Back-compat mirroring: if unitId is set and category is aircraft, also populate aircraftId.
  // If aircraftId is set (legacy call) and unitId is not, mirror into unitId too.
  const mirrored: Omit<GameEvent, "id" | "timestamp"> = { ...event };
  if (mirrored.unitId && mirrored.unitCategory === "aircraft" && !mirrored.aircraftId) {
    mirrored.aircraftId = mirrored.unitId;
  }
  if (mirrored.aircraftId && !mirrored.unitId) {
    mirrored.unitId = mirrored.aircraftId;
    mirrored.unitCategory = "aircraft";
  }
  return {
    ...state,
    events: [
      {
        ...mirrored,
        id: uuid(),
        timestamp: `Dag ${state.day} ${String(state.hour).padStart(2, "0")}:00`,
      },
      ...state.events,
    ].slice(0, 200),
  };
}
```

- [ ] **Step 3: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts src/core/engine.ts
git commit -m "feat: extend GameEvent with unitId/unitCategory + new AAR action types"
```

---

## Task 9: Unit actions on `GameAction` union

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Add new action variants**

At the bottom of the `GameAction` union in `src/types/game.ts`, add:

```ts
  | { type: "DEPLOY_UNIT"; unitId: string; destination: import("./units").GeoPosition; speed?: number }
  | { type: "TRANSFER_UNIT"; unitId: string; toBaseId: BaseType }
  | { type: "RECALL_UNIT"; unitId: string; toBaseId?: BaseType }
  | { type: "RELOCATE_UNIT"; unitId: string; destination: import("./units").GeoPosition }
  | { type: "CLASSIFY_CONTACT"; unitId: string; affiliation: import("./units").Affiliation }
  | { type: "STORE_UNIT"; unitId: string; baseId: BaseType }
  | { type: "SET_AD_STATE"; unitId: string; deployedState: "emplaced" | "stowed" }
  | { type: "SET_RADAR_EMITTING"; unitId: string; emitting: boolean };
```

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: errors only in `src/core/engine.ts` (and maybe `validators.ts`) for missing case handlers — that's fine, Task 10 fills them in.

- [ ] **Step 3: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add unit management actions to GameAction"
```

---

## Task 10: Implement unit action handlers in engine

**Files:**
- Modify: `src/core/engine.ts`

- [ ] **Step 1: Add unit lookup helpers near the top of `engine.ts`**

Insert (below imports) these helpers:

```ts
import type { Unit, Affiliation, GeoPosition } from "@/types/units";
import { canStoreUnit, recomputeZoneOccupancy } from "@/core/units/capacity";
import { setAffiliationOnSidc } from "@/core/units/sidc";
import { enforceAirborneInvariant } from "@/core/units/movement";

interface UnitLocation {
  unit: Unit;
  baseId: BaseType | null; // null means in deployedUnits
}

function findUnit(state: GameState, unitId: string): UnitLocation | null {
  for (const base of state.bases) {
    const u = base.units.find(u => u.id === unitId);
    if (u) return { unit: u, baseId: base.id };
  }
  const u = state.deployedUnits.find(u => u.id === unitId);
  if (u) return { unit: u, baseId: null };
  return null;
}

function removeUnitFromState(state: GameState, unitId: string): GameState {
  return {
    ...state,
    bases: state.bases.map(b =>
      b.units.some(u => u.id === unitId)
        ? recomputeZoneOccupancy({ ...b, units: b.units.filter(u => u.id !== unitId) })
        : b
    ),
    deployedUnits: state.deployedUnits.filter(u => u.id !== unitId),
  };
}

function putUnitAtBase(state: GameState, unit: Unit, baseId: BaseType): GameState {
  return {
    ...state,
    bases: state.bases.map(b =>
      b.id === baseId
        ? recomputeZoneOccupancy({ ...b, units: [...b.units, unit] })
        : b
    ),
  };
}

function putUnitInField(state: GameState, unit: Unit): GameState {
  return { ...state, deployedUnits: [...state.deployedUnits, unit] };
}
```

- [ ] **Step 2: Add cases to the switch in `gameReducer`**

Inside the main `switch (action.type)` block, add these cases right before `default:`:

```ts
    case "DEPLOY_UNIT": {
      const loc = findUnit(state, action.unitId);
      if (!loc) return state;
      const { unit, baseId } = loc;
      if (baseId === null) return state; // already in the field
      const newUnit: Unit = enforceAirborneInvariant(
        {
          ...unit,
          lastBase: unit.currentBase,
          movement: {
            state: unit.category === "aircraft" ? "airborne" : "moving",
            speed: action.speed ?? 60,
            destination: action.destination,
          },
          deployedAt: { day: state.day, hour: state.hour },
        } as Unit,
        false
      );
      const s1 = removeUnitFromState(state, unit.id);
      const s2 = putUnitInField(s1, newUnit);
      return addEvent(s2, {
        type: "info",
        message: `${unit.name} deployed from ${baseId} to (${action.destination.lat.toFixed(2)}, ${action.destination.lng.toFixed(2)})`,
        base: baseId,
        unitId: unit.id,
        unitCategory: unit.category,
        actionType: "UNIT_DEPLOYED",
      });
    }

    case "TRANSFER_UNIT": {
      const loc = findUnit(state, action.unitId);
      if (!loc) return state;
      const { unit, baseId } = loc;
      if (baseId === action.toBaseId) return state;
      const destBase = state.bases.find(b => b.id === action.toBaseId);
      if (!destBase) return state;
      const check = canStoreUnit(destBase, unit);
      if (!check.ok) {
        return addEvent(state, {
          type: "warning",
          message: `Transfer blocked: ${check.reason}`,
          unitId: unit.id,
          unitCategory: unit.category,
        });
      }
      const traveling: Unit = {
        ...unit,
        lastBase: unit.currentBase,
        currentBase: action.toBaseId,
        movement: {
          state: unit.category === "aircraft" ? "airborne" : "moving",
          speed: 120,
          destination: action.toBaseId,
        },
        deployedAt: { day: state.day, hour: state.hour },
      } as Unit;
      const s1 = removeUnitFromState(state, unit.id);
      const s2 = putUnitInField(s1, traveling);
      return addEvent(s2, {
        type: "info",
        message: `${unit.name} transferring ${baseId ?? "field"} → ${action.toBaseId}`,
        base: action.toBaseId,
        unitId: unit.id,
        unitCategory: unit.category,
        actionType: "UNIT_TRANSFERRED",
      });
    }

    case "RECALL_UNIT": {
      const loc = findUnit(state, action.unitId);
      if (!loc) return state;
      const { unit, baseId } = loc;
      if (baseId !== null) return state; // already at a base
      const homeId = action.toBaseId ?? unit.currentBase ?? unit.lastBase;
      if (!homeId) return state;
      const destBase = state.bases.find(b => b.id === homeId);
      if (!destBase) return state;
      const check = canStoreUnit(destBase, unit);
      if (!check.ok) {
        return addEvent(state, {
          type: "warning",
          message: `Recall blocked: ${check.reason}`,
          unitId: unit.id,
          unitCategory: unit.category,
        });
      }
      const basePos = destBase.units[0]?.position ?? unit.position;
      const stored: Unit = {
        ...unit,
        lastBase: unit.currentBase,
        currentBase: homeId,
        position: basePos,
        movement: { state: "stationary", speed: 0 },
      } as Unit;
      const s1 = removeUnitFromState(state, unit.id);
      const s2 = putUnitAtBase(s1, stored, homeId);
      return addEvent(s2, {
        type: "success",
        message: `${unit.name} recalled to ${homeId}`,
        base: homeId,
        unitId: unit.id,
        unitCategory: unit.category,
        actionType: "UNIT_RECALLED",
      });
    }

    case "RELOCATE_UNIT": {
      const loc = findUnit(state, action.unitId);
      if (!loc || loc.baseId !== null) return state; // must be in field
      const { unit } = loc;
      const newUnit: Unit = {
        ...unit,
        movement: {
          state: unit.category === "aircraft" ? "airborne" : "moving",
          speed: 60,
          destination: action.destination,
        },
      } as Unit;
      const s1 = removeUnitFromState(state, unit.id);
      const s2 = putUnitInField(s1, newUnit);
      return addEvent(s2, {
        type: "info",
        message: `${unit.name} relocating to (${action.destination.lat.toFixed(2)}, ${action.destination.lng.toFixed(2)})`,
        unitId: unit.id,
        unitCategory: unit.category,
        actionType: "UNIT_RELOCATED",
      });
    }

    case "CLASSIFY_CONTACT": {
      const loc = findUnit(state, action.unitId);
      if (!loc) return state;
      const { unit, baseId } = loc;
      const prior = unit.affiliation;
      if (prior === action.affiliation) return state;
      const updated: Unit = {
        ...unit,
        affiliation: action.affiliation,
        sidc: setAffiliationOnSidc(unit.sidc, action.affiliation),
      } as Unit;
      const s1 = removeUnitFromState(state, unit.id);
      const s2 = baseId === null ? putUnitInField(s1, updated) : putUnitAtBase(s1, updated, baseId);
      return addEvent(s2, {
        type: "info",
        message: `Contact ${unit.name} classified: ${prior} → ${action.affiliation}`,
        unitId: unit.id,
        unitCategory: unit.category,
        actionType: "CONTACT_CLASSIFIED",
      });
    }

    case "STORE_UNIT": {
      const loc = findUnit(state, action.unitId);
      if (!loc || loc.baseId !== null) return state;
      const destBase = state.bases.find(b => b.id === action.baseId);
      if (!destBase) return state;
      const check = canStoreUnit(destBase, loc.unit);
      if (!check.ok) return state;
      const stored: Unit = {
        ...loc.unit,
        currentBase: action.baseId,
        movement: { state: "stationary", speed: 0 },
      } as Unit;
      const s1 = removeUnitFromState(state, loc.unit.id);
      return putUnitAtBase(s1, stored, action.baseId);
    }

    case "SET_AD_STATE": {
      const loc = findUnit(state, action.unitId);
      if (!loc || loc.unit.category !== "air_defense") return state;
      const updated: Unit = { ...loc.unit, deployedState: action.deployedState };
      const s1 = removeUnitFromState(state, loc.unit.id);
      return loc.baseId === null ? putUnitInField(s1, updated) : putUnitAtBase(s1, updated, loc.baseId);
    }

    case "SET_RADAR_EMITTING": {
      const loc = findUnit(state, action.unitId);
      if (!loc || loc.unit.category !== "radar") return state;
      const updated: Unit = { ...loc.unit, emitting: action.emitting };
      const s1 = removeUnitFromState(state, loc.unit.id);
      return loc.baseId === null ? putUnitInField(s1, updated) : putUnitAtBase(s1, updated, loc.baseId);
    }
```

- [ ] **Step 3: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
git add src/core/engine.ts
git commit -m "feat: implement unit deploy/transfer/recall/relocate/classify handlers"
```

---

## Task 11: Integrate movement tick into `ADVANCE_HOUR`

**Files:**
- Modify: `src/core/engine.ts`

- [ ] **Step 1: Find the `ADVANCE_HOUR` handler**

Look for the block that starts with `case "ADVANCE_HOUR":` in `src/core/engine.ts`. Inside it, *after* the existing fuel drain / aircraft wear logic but *before* the return, add a unit tick pass:

```ts
      // ── Unit movement tick (Task 11) ────────────────────────────────
      const { advanceMovement, perHourFuelDrain, enforceAirborneInvariant } = await import("@/core/units/movement");
      // ^ NOTE: if dynamic import is awkward in a sync reducer, import statically at top.
```

If the engine is a synchronous reducer (it is), use a **static import** at the top of the file instead:

```ts
import { advanceMovement, perHourFuelDrain } from "@/core/units/movement";
```

Then, inside the `ADVANCE_HOUR` case, add this block (adapt to match the existing code's variable names — `nextPhase` already exists for fuel drain):

```ts
      const tickUnit = (u: Unit, isAtBase: boolean): Unit => {
        let updated = enforceAirborneInvariant(u, isAtBase);
        updated = advanceMovement(updated);
        const drain = perHourFuelDrain(updated, nextPhase);
        if ("fuel" in updated && typeof updated.fuel === "number" && drain > 0) {
          updated = { ...updated, fuel: Math.max(0, updated.fuel - drain) } as Unit;
        }
        return updated;
      };

      const tickedBases = (existingUpdatedBases ?? state.bases).map(b => ({
        ...b,
        units: b.units.map(u => tickUnit(u, true)),
      }));
      const tickedDeployed = state.deployedUnits.map(u => tickUnit(u, false));
      // Replace any previously-computed `bases`/`deployedUnits` in the final return
      // with `tickedBases` and `tickedDeployed`.
```

**Important:** you will need to read the actual existing `ADVANCE_HOUR` case first and integrate this tick correctly — it should run *after* the existing base-level fuel drain / aircraft wear so that aircraft-as-units don't get double-drained. If the existing code already mutates `base.aircraft`, mirror those mutations onto `base.units` where appropriate, or keep them separate until Task 15's cleanup. The safest approach during migration is:

1. Existing code continues to operate on `base.aircraft`.
2. New tick code operates on `base.units` and `state.deployedUnits`.
3. Any aircraft field update in the old code is also mirrored into `base.units` where the id matches.

Add a helper if that mirroring becomes frequent:

```ts
function syncAircraftToUnits(base: Base): Base {
  const units = base.units.map(u => {
    if (u.category !== "aircraft") return u;
    const match = base.aircraft.find(a => a.id === u.id);
    if (!match) return u;
    return { ...u, status: match.status, health: match.health, flightHours: match.flightHours, hoursToService: match.hoursToService };
  });
  return { ...base, units };
}
```

Apply `syncAircraftToUnits(base)` at the end of any handler that mutated `base.aircraft`.

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Smoke-run the dev server**

Run: `bun run dev` and load the app. Verify:
- Nothing crashes on the clock advancing
- Existing aircraft behavior unchanged

Stop the dev server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add src/core/engine.ts
git commit -m "feat: integrate unit tick into ADVANCE_HOUR"
```

---

## Task 12: Validators for unit actions

**Files:**
- Modify: `src/core/validators.ts`

- [ ] **Step 1: Add unit-action validators**

Read `src/core/validators.ts`, find the main validator dispatcher, and add these cases (reusing the helper pattern already in the file):

```ts
case "DEPLOY_UNIT": {
  const unit = allUnits(state).find(u => u.id === action.unitId);
  if (!unit) return { ok: false, reason: "Unit not found" };
  if (unit.currentBase === null) return { ok: false, reason: "Unit already deployed" };
  return { ok: true };
}
case "TRANSFER_UNIT": {
  const unit = allUnits(state).find(u => u.id === action.unitId);
  if (!unit) return { ok: false, reason: "Unit not found" };
  const dest = state.bases.find(b => b.id === action.toBaseId);
  if (!dest) return { ok: false, reason: "Destination base not found" };
  const cap = canStoreUnit(dest, unit);
  if (!cap.ok) return { ok: false, reason: cap.reason };
  return { ok: true };
}
case "RECALL_UNIT": {
  const unit = allUnits(state).find(u => u.id === action.unitId);
  if (!unit) return { ok: false, reason: "Unit not found" };
  if (unit.currentBase !== null && state.bases.some(b => b.units.some(u => u.id === unit.id))) {
    return { ok: false, reason: "Unit already at base" };
  }
  return { ok: true };
}
case "RELOCATE_UNIT":
case "CLASSIFY_CONTACT":
case "SET_AD_STATE":
case "SET_RADAR_EMITTING":
case "STORE_UNIT":
  return { ok: true };
```

Add helper near the top of the validators file:

```ts
import type { Unit } from "@/types/units";
import { canStoreUnit } from "@/core/units/capacity";

function allUnits(state: GameState): Unit[] {
  return [...state.bases.flatMap(b => b.units), ...state.deployedUnits];
}
```

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/core/validators.ts
git commit -m "feat: validators for unit management actions"
```

---

## Task 13: Full initial seed (drones, AD, ground vehicles, radars)

**Files:**
- Modify: `src/data/initialGameState.ts`
- Read first: entire file with `Read`

- [ ] **Step 1: Import factories**

At the top of `src/data/initialGameState.ts`, add:

```ts
import {
  createAircraftUnit,
  createDroneUnit,
  createAirDefenseUnit,
  createGroundVehicleUnit,
  createRadarUnit,
} from "@/core/units/factory";
import type { Unit } from "@/types/units";
```

- [ ] **Step 2: Define base coordinates constant**

Add near the top (or reuse existing constant if present — check `src/pages/map/constants.ts` for `BASE_COORDS`):

```ts
const BASE_SEED_COORDS: Record<"MOB" | "FOB_N" | "FOB_S", { lat: number; lng: number }> = {
  MOB: { lat: 58.40, lng: 15.52 },   // Malmen / Linköping (placeholder — align with map/constants.ts if different)
  FOB_N: { lat: 63.17, lng: 14.50 }, // Östersund
  FOB_S: { lat: 55.53, lng: 13.37 }, // Skåne
};
```

If `src/pages/map/constants.ts` already exports `BASE_COORDS`, import it and reuse instead.

- [ ] **Step 3: Build per-base unit list**

Add a helper inside `initialGameState.ts`:

```ts
function seedUnitsForBase(baseId: "MOB" | "FOB_N" | "FOB_S"): Unit[] {
  const pos = BASE_SEED_COORDS[baseId];
  const units: Unit[] = [];

  // Drones
  const droneCount = baseId === "FOB_S" ? 0 : 4;
  for (let i = 0; i < droneCount; i++) {
    units.push(createDroneUnit({
      name: `${baseId}-DRN-${i + 1}`,
      type: "ISR_DRONE",
      position: pos,
      currentBase: baseId,
    }));
  }

  // Air defense
  const adConfig = {
    MOB: [{ type: "SAM_LONG" as const }, { type: "SAM_LONG" as const }],
    FOB_N: [{ type: "SAM_MEDIUM" as const }],
    FOB_S: [{ type: "SAM_MEDIUM" as const }],
  }[baseId];
  adConfig.forEach((cfg, i) => {
    units.push(createAirDefenseUnit({
      name: `${baseId}-AD-${i + 1}`,
      type: cfg.type,
      position: pos,
      currentBase: baseId,
    }));
  });

  // Ground vehicles
  const gvCount = { MOB: 6, FOB_N: 4, FOB_S: 2 }[baseId];
  const gvTypes: ("LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER")[] =
    ["LOGISTICS_TRUCK", "ARMORED_TRANSPORT", "FUEL_BOWSER"];
  for (let i = 0; i < gvCount; i++) {
    units.push(createGroundVehicleUnit({
      name: `${baseId}-GV-${i + 1}`,
      type: gvTypes[i % gvTypes.length],
      position: pos,
      currentBase: baseId,
    }));
  }

  // Ground radar (1 per base)
  units.push(createRadarUnit({
    name: `${baseId}-RAD-1`,
    type: "SEARCH_RADAR",
    position: pos,
    currentBase: baseId,
  }));

  return units;
}
```

- [ ] **Step 4: Populate each base's `units` field**

Find the section where each base object is constructed (e.g. `const MOB: Base = { ... }`). For each of MOB / FOB_N / FOB_S, set:

```ts
units: seedUnitsForBase("MOB"),  // or "FOB_N" / "FOB_S"
```

**Also:** for each existing `Aircraft` object in the base's `aircraft` array, construct an equivalent `AircraftUnit` via `createAircraftUnit(...)` and push it into the base's `units` array alongside the non-aircraft seeded units. Map tail numbers 1:1. Set `role: "awacs"` on the GlobalEye.

Pseudocode for MOB:

```ts
const aircraftUnits: Unit[] = MOB_AIRCRAFT.map(a =>
  createAircraftUnit({
    name: a.tailNumber,
    tailNumber: a.tailNumber,
    type: a.type,
    role: a.type === "GlobalEye" ? "awacs" : "fighter",
    position: BASE_SEED_COORDS.MOB,
    currentBase: "MOB",
  })
);
const MOB: Base = {
  // ...existing fields
  aircraft: MOB_AIRCRAFT,
  units: [...aircraftUnits, ...seedUnitsForBase("MOB")],
};
```

Repeat for FOB_N and FOB_S.

- [ ] **Step 5: Initialize `deployedUnits: []`**

In the root `initialGameState` object, add:

```ts
deployedUnits: [],
```

- [ ] **Step 6: Compile + smoke test**

Run: `bunx tsc --noEmit` then `bun run test` — existing tests must still pass.

Run: `bun run dev`, load the app, open browser console. Verify:
- No crashes.
- `__GAMESTATE__` (if exposed) or a poke into state shows `base.units.length > base.aircraft.length` for MOB.

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add src/data/initialGameState.ts
git commit -m "feat: full initial seed with drones, AD, ground vehicles, radars"
```

---

## Task 14: `UnitSymbol` React component (milsymbol wrapper)

**Files:**
- Create: `src/components/map/UnitSymbol.tsx`

- [ ] **Step 1: Implement component**

Create `src/components/map/UnitSymbol.tsx`:

```tsx
import { useMemo } from "react";
// @ts-expect-error milsymbol has no bundled types in older versions
import ms from "milsymbol";

interface UnitSymbolProps {
  sidc: string;
  size?: number;        // pixel size (height); milsymbol scales proportionally
  className?: string;
  title?: string;
}

export function UnitSymbol({ sidc, size = 36, className, title }: UnitSymbolProps) {
  const svg = useMemo(() => {
    try {
      const sym = new ms.Symbol(sidc, { size });
      return sym.asSVG();
    } catch {
      return "";
    }
  }, [sidc, size]);

  if (!svg) {
    return <span className={className} title={title}>?</span>;
  }
  return (
    <span
      className={className}
      title={title}
      style={{ display: "inline-block", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

- [ ] **Step 2: Compile check**

Run: `bunx tsc --noEmit`

Expected: no errors (the `@ts-expect-error` comment absorbs the missing-types issue).

- [ ] **Step 3: Quick visual smoke**

Run: `bun run dev`. Temporarily insert `<UnitSymbol sidc="10031000001103000000" size={48} />` into a page (e.g., `src/pages/Index.tsx`) and confirm a NATO symbol renders. Revert the temporary insertion.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/UnitSymbol.tsx
git commit -m "feat: UnitSymbol component (milsymbol wrapper)"
```

---

## Task 15: Map layer — render all units

**Files:**
- Modify: `src/pages/map/AircraftLayer.tsx` → rename to `src/pages/map/UnitsLayer.tsx`
- Modify: `src/pages/Map.tsx` (import path)

- [ ] **Step 1: Rename and read the existing layer**

```bash
git mv src/pages/map/AircraftLayer.tsx src/pages/map/UnitsLayer.tsx
```

Read the file. It currently iterates over `state.bases.flatMap(b => b.aircraft)` (or similar).

- [ ] **Step 2: Iterate over all units**

Edit `src/pages/map/UnitsLayer.tsx`:
- Rename the exported component from `AircraftLayer` to `UnitsLayer`.
- Change the source list from `bases.flatMap(b => b.aircraft)` to:

```ts
const allUnits = [
  ...state.bases.flatMap(b => b.units),
  ...state.deployedUnits,
];
```

- For each unit, render a MapLibre `<Marker>` at `unit.position` containing `<UnitSymbol sidc={unit.sidc} size={30} title={unit.name} />` (from `@/components/map/UnitSymbol`).
- Preserve the existing click/hover behavior but pass a `unit` (not `aircraft`) to the selection handler.

- [ ] **Step 3: Update `src/pages/Map.tsx` import**

Find `import { AircraftLayer } from "./map/AircraftLayer"` and change to:

```ts
import { UnitsLayer } from "./map/UnitsLayer";
```

Replace `<AircraftLayer ... />` with `<UnitsLayer ... />` in the JSX.

- [ ] **Step 4: Compile + run**

Run: `bunx tsc --noEmit` then `bun run dev`. Load the map and verify:
- Base positions still show their symbols
- New unit types (drones, SAMs, ground vehicles, radars) render near each base
- Hover/click opens detail (may need Task 16 for the panel)

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/pages/map/UnitsLayer.tsx src/pages/Map.tsx
git commit -m "refactor: rename AircraftLayer to UnitsLayer, render all unit categories"
```

---

## Task 16: Unit detail panel on the map

**Files:**
- Modify: `src/pages/map/AircraftDetailPanel.tsx` → rename to `src/pages/map/UnitDetailPanel.tsx`
- Modify: any caller (grep for `AircraftDetailPanel`)

- [ ] **Step 1: Rename**

```bash
git mv src/pages/map/AircraftDetailPanel.tsx src/pages/map/UnitDetailPanel.tsx
```

- [ ] **Step 2: Generalize the prop**

Change the component's prop from `aircraft: Aircraft` to `unit: Unit`. Inside the component, render:
- Always: `<UnitSymbol sidc={unit.sidc} size={48} />`, `unit.name`, `unit.affiliation`, `unit.category`, health bar, position, `currentBase` / `lastBase`
- If `isAircraft(unit)` or `isDrone(unit)`: show `status`, `flightHours`/`hoursToService` (aircraft only), fuel, current mission
- If `isAirDefense(unit)`: show `deployedState`, missile stock, fuel
- If `isGroundVehicle(unit)`: show fuel, road speed, movement state
- If `isRadar(unit)`: show `deployedState`, `emitting` toggle

Import the type guards from `@/types/units`.

- [ ] **Step 3: Add action buttons**

Below the unit details, add conditional buttons:
- If at base: "Deploy" (opens a destination picker — for v1, a simple coord prompt is acceptable) and "Transfer to…" dropdown (list other bases)
- If in field: "Recall" (returns to `currentBase` or `lastBase`) and "Relocate" (destination picker)
- Always: "Classify" dropdown (cycles through the 5 affiliations) — dispatches `CLASSIFY_CONTACT`

Wire each to `dispatch({ type: "...", ... })`.

- [ ] **Step 4: Update callers**

Grep for `AircraftDetailPanel`:
```bash
grep -rn "AircraftDetailPanel" src/
```
Replace import paths and the `aircraft={...}` prop with `unit={...}`.

- [ ] **Step 5: Smoke test**

Run: `bun run dev`. Click units on the map, verify the panel shows category-appropriate info. Try Deploy → Recall round-trip.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: UnitDetailPanel with category-aware fields and action buttons"
```

---

## Task 17: `UnitDashboard` per-unit page + route

**Files:**
- Create: `src/pages/UnitDashboard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the page**

Create `src/pages/UnitDashboard.tsx`:

```tsx
import { useParams, Link } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import { isAircraft, isDrone, isAirDefense, isGroundVehicle, isRadar } from "@/types/units";

export default function UnitDashboard() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useGame();

  const unit = [...state.bases.flatMap(b => b.units), ...state.deployedUnits].find(u => u.id === id);
  if (!unit) return <div className="p-6">Unit {id} not found. <Link to="/map">Back to map</Link></div>;

  const events = state.events.filter(e => e.unitId === unit.id || e.aircraftId === unit.id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <UnitSymbol sidc={unit.sidc} size={64} />
        <div>
          <h1 className="text-2xl font-bold">{unit.name}</h1>
          <div className="text-sm opacity-70">{unit.category} · {unit.affiliation} · health {unit.health}%</div>
        </div>
      </div>

      <section>
        <h2 className="font-semibold">Location</h2>
        <div>Current base: {unit.currentBase ?? "—"}</div>
        <div>Last base: {unit.lastBase ?? "—"}</div>
        <div>Position: {unit.position.lat.toFixed(3)}, {unit.position.lng.toFixed(3)}</div>
        <div>Movement: {unit.movement.state} @ {unit.movement.speed} kt</div>
      </section>

      {(isAircraft(unit) || isDrone(unit)) && (
        <section>
          <h2 className="font-semibold">Aviation</h2>
          <div>Status: {unit.status}</div>
          <div>Fuel: {unit.fuel}%</div>
          {isAircraft(unit) && <div>Flight hours: {unit.flightHours} / service in {unit.hoursToService}h</div>}
        </section>
      )}

      {isAirDefense(unit) && (
        <section>
          <h2 className="font-semibold">Air Defense</h2>
          <div>State: {unit.deployedState}</div>
          <div>Missiles: {unit.missileStock.loaded} / {unit.missileStock.max}</div>
        </section>
      )}

      {isGroundVehicle(unit) && (
        <section>
          <h2 className="font-semibold">Ground Vehicle</h2>
          <div>Fuel: {unit.fuel}%</div>
          <div>Road speed: {unit.roadSpeed} kt</div>
        </section>
      )}

      {isRadar(unit) && (
        <section>
          <h2 className="font-semibold">Radar</h2>
          <div>State: {unit.deployedState}</div>
          <div>Emitting: {unit.emitting ? "yes" : "no"}</div>
          <button
            className="mt-2 px-2 py-1 border rounded"
            onClick={() => dispatch({ type: "SET_RADAR_EMITTING", unitId: unit.id, emitting: !unit.emitting })}
          >
            Toggle emit
          </button>
        </section>
      )}

      <section>
        <h2 className="font-semibold">Event history</h2>
        <ul className="text-sm space-y-1">
          {events.map(e => (
            <li key={e.id}>
              <span className="opacity-60 mr-2">{e.timestamp}</span>
              {e.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add route**

In `src/App.tsx`, find the `<Routes>` block and add:

```tsx
<Route path="/units/:id" element={<UnitDashboard />} />
```

Add the import: `import UnitDashboard from "./pages/UnitDashboard";`

- [ ] **Step 3: Wire detail-panel "open dashboard" link**

In `src/pages/map/UnitDetailPanel.tsx`, add a link:

```tsx
<Link to={`/units/${unit.id}`}>Full details →</Link>
```

- [ ] **Step 4: Smoke test**

Run: `bun run dev`. Click a unit, hit "Full details", verify page renders with category-correct sections.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: UnitDashboard page at /units/:id"
```

---

## Task 18: AAR filter — unit category

**Files:**
- Modify: `src/pages/AARPage.tsx`

- [ ] **Step 1: Add category filter UI**

Read `src/pages/AARPage.tsx`. Find the existing filter state and UI.

Add a new multi-select (or checkbox group) for `unitCategory`:

```tsx
const CATEGORIES: UnitCategory[] = ["aircraft", "drone", "air_defense", "ground_vehicle", "radar"];
const [categoryFilter, setCategoryFilter] = useState<Set<UnitCategory>>(new Set(CATEGORIES));
```

Render checkboxes for each category.

- [ ] **Step 2: Apply the filter**

In the event-filtering code, add:

```ts
.filter(e => !e.unitCategory || categoryFilter.has(e.unitCategory))
```

Events with no `unitCategory` (older events, base events) pass through — `!e.unitCategory` handles that.

- [ ] **Step 3: Add new action types to the action-type filter**

Find where `AARActionType` values are listed and append the new ones (`UNIT_DEPLOYED`, `UNIT_RECALLED`, `UNIT_TRANSFERRED`, `UNIT_DESTROYED`, `CONTACT_CLASSIFIED`, `UNIT_RELOCATED`, `UNIT_FUEL_LOW`). If the file iterates over the union type via a constant array, extend that array.

- [ ] **Step 4: Smoke test**

Run: `bun run dev`, open AAR page, trigger a few unit actions (deploy from detail panel), verify events appear and the filter works.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AARPage.tsx
git commit -m "feat: AAR filter by unit category + new action types"
```

---

## Task 19: Cleanup — remove `Base.aircraft`, drop `Aircraft` interface

**Files:**
- Modify: `src/types/game.ts`
- Modify: every caller of `base.aircraft`

- [ ] **Step 1: Find all callers**

Run:
```bash
grep -rn "\.aircraft\b" src/ --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "base\.units"
```

For each result, replace `base.aircraft` with `base.units.filter((u): u is AircraftUnit => u.category === "aircraft")` or use a helper:

In `src/core/units/helpers.ts` (new file):

```ts
import type { Base } from "@/types/game";
import type { AircraftUnit } from "@/types/units";

export function getAircraft(base: Base): AircraftUnit[] {
  return base.units.filter((u): u is AircraftUnit => u.category === "aircraft");
}
```

Replace each site `base.aircraft` → `getAircraft(base)`.

For **writers** (`base.aircraft = [...]` or `.aircraft.push` or `.aircraft.map(...).concat(...)`), convert to operate on `base.units` with a category filter.

- [ ] **Step 2: Remove `aircraft` field from `Base`**

Once no callers remain, delete the `aircraft: Aircraft[];` line from `Base` in `src/types/game.ts`.

Delete the `Aircraft` interface itself from `src/types/game.ts`. Replace any remaining `Aircraft` imports with `AircraftUnit` from `@/types/units`.

- [ ] **Step 3: Compile + test**

Run:
```bash
bunx tsc --noEmit
bun run test
```

Expected: both pass.

- [ ] **Step 4: Smoke test**

Run: `bun run dev`. Verify existing features still work: ATO assignment, maintenance, landing, recommendations, AAR.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove Base.aircraft and Aircraft interface, consolidate on Unit"
```

---

## Self-Review

**Spec coverage:**
- ✅ Unified `Unit` discriminated union — Task 2
- ✅ `Base.units` replaces `Base.aircraft` — Tasks 5, 19
- ✅ `GameState.deployedUnits` — Task 5
- ✅ `UNIT_TYPE_CONFIG` registry — Task 3
- ✅ Capacity helper (infrastructure-gated vs. free) — Task 5
- ✅ SIDC helpers + affiliation model — Task 4
- ✅ Unit factory — Task 6
- ✅ Movement tick, fuel drain, airborne invariant — Task 7
- ✅ Movement integrated into `ADVANCE_HOUR` — Task 11
- ✅ Event schema extension + new action types — Task 8
- ✅ New game actions — Task 9
- ✅ Action handlers — Task 10
- ✅ Validators — Task 12
- ✅ Full initial seed — Task 13
- ✅ `milsymbol` dependency + `UnitSymbol` component — Tasks 1, 14
- ✅ Map layer rendering all units — Task 15
- ✅ Detail panel — Task 16
- ✅ `UnitDashboard` page — Task 17
- ✅ AAR category filter + new action types — Task 18
- ✅ Cleanup migration — Task 19

**Placeholder scan:** No "TBD" / "implement later" / "similar to above" in any task. Code blocks are complete.

**Type consistency:**
- `Unit` is the union type, `AircraftUnit` / `DroneUnit` / etc. are variants — used consistently across all tasks.
- `canStoreUnit` returns `{ ok: boolean; reason?: string }` — same shape in capacity.ts, engine.ts handlers, and validators.
- `findUnit` returns `{ unit, baseId: BaseType | null }` — used consistently in all engine handlers.
- `createXxxUnit` factories always accept `{ name, position, currentBase, ... }` with `affiliation` defaulting to `"friend"`.
- `enforceAirborneInvariant(unit, isAtBase)` — two-arg form used consistently between movement.ts, engine.ts, and tests.
