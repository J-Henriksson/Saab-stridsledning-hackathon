import type { Base, GameState, ScenarioPhase, BaseType, SparePartStock, ATOOrder } from "@/types/game";
import { isAircraft, isGroundVehicle } from "@/types/units";

// ── Sortie generation tunables ───────────────────────────────────────────────
/**
 * Average prep + recovery time per sortie (hours). Real PREP_TIME varies by
 * aircraft type (45–60 min) plus recovery (~30 min) plus armament/fuel turnaround.
 * This rolled-up estimate keeps the capacity ceiling readable for commanders.
 */
const SORTIE_TURNAROUND_HOURS = 4;
/** Hard daily limit per maintenance bay regardless of arithmetic. */
const SORTIES_PER_BAY_PER_DAY_CAP = 4;

// ── Phase-aware burn-rate multipliers ────────────────────────────────────────
/** Fuel burn-rate (% of maxFuel per hour) per phase. Mirrors ResursPage. */
export const FUEL_BURN_PCT_PER_HOUR: Record<ScenarioPhase, number> = {
  FRED: 0.5,
  KRIS: 1.5,
  KRIG: 3.0,
};

/** Ammunition burn-rate (% of max stockpile per day). Strategic-level estimate. */
export const AMMO_BURN_PCT_PER_DAY: Record<ScenarioPhase, number> = {
  FRED: 1.5,
  KRIS: 8,
  KRIG: 22,
};

/** Spare-parts attrition (LRU swaps per day per base). */
export const PARTS_ATTRITION_PER_DAY: Record<ScenarioPhase, number> = {
  FRED: 0.4,
  KRIS: 1.1,
  KRIG: 2.2,
};

/** Phase-tier minimum reserve targets (% of max). Doctrinal floor. */
export const RESERVE_TARGET_PCT: Record<ScenarioPhase, number> = {
  FRED: 50,
  KRIS: 70,
  KRIG: 85,
};

// ── Per-base aggregates ──────────────────────────────────────────────────────
export interface BaseLogisticsSnapshot {
  baseId: BaseType;
  name: string;
  fuelPct: number;
  fuelLiters: number;
  ammoPct: number;
  ammoCount: number;
  ammoMax: number;
  personnelPct: number;
  personnelAvail: number;
  personnelTotal: number;
  partsPct: number;
  partsCriticalCount: number;
  bayPct: number;
  bayFree: number;
  bayTotal: number;
  /** Days of fuel at current phase burn-rate. */
  fuelDOS: number;
  /** Days of ammo at current phase burn-rate. */
  ammoDOS: number;
  /** MC-rate (mission-capable aircraft / total) at this base. */
  mcRate: number;
  /** Aircraft-MC absolute counts. */
  mcCount: number;
  acTotal: number;
  /** Composite stock health (weighted average across resources). */
  composite: number;
}

export function snapshotBase(base: Base, phase: ScenarioPhase): BaseLogisticsSnapshot {
  const fuelPct = base.maxFuel > 0 ? Math.round((base.fuel / base.maxFuel) * 100) : 0;
  const ammoCount = base.ammunition.reduce((s, a) => s + a.quantity, 0);
  const ammoMax = base.ammunition.reduce((s, a) => s + a.max, 0);
  const ammoPct = ammoMax > 0 ? Math.round((ammoCount / ammoMax) * 100) : 0;
  const personnelAvail = base.personnel.reduce((s, p) => s + p.available, 0);
  const personnelTotal = base.personnel.reduce((s, p) => s + p.total, 0);
  const personnelPct = personnelTotal > 0 ? Math.round((personnelAvail / personnelTotal) * 100) : 0;
  const partsCount = base.spareParts.reduce((s, p) => s + p.quantity, 0);
  const partsMax = base.spareParts.reduce((s, p) => s + p.maxQuantity, 0);
  const partsPct = partsMax > 0 ? Math.round((partsCount / partsMax) * 100) : 0;
  const partsCriticalCount = base.spareParts.filter(
    (p) => p.maxQuantity > 0 && p.quantity / p.maxQuantity < 0.30,
  ).length;
  const bayFree = base.maintenanceBays.total - base.maintenanceBays.occupied;
  const bayPct = base.maintenanceBays.total > 0
    ? Math.round((bayFree / base.maintenanceBays.total) * 100) : 0;

  const fuelBurn = FUEL_BURN_PCT_PER_HOUR[phase];
  const fuelDOS = fuelBurn > 0 ? base.fuel / (fuelBurn * 24) : Infinity;
  const ammoBurn = AMMO_BURN_PCT_PER_DAY[phase];
  const ammoDOS = ammoBurn > 0 && ammoMax > 0 ? (ammoCount / ammoMax) * 100 / ammoBurn : Infinity;

  const aircraft = base.units.filter(isAircraft);
  const mcCount = aircraft.filter((a) => a.status === "ready").length;
  const acTotal = aircraft.length;
  const mcRate = acTotal > 0 ? Math.round((mcCount / acTotal) * 100) : 0;

  const composite = Math.round(
    (fuelPct * 0.25) + (ammoPct * 0.20) + (personnelPct * 0.20)
    + (partsPct * 0.20) + (bayPct * 0.05) + (mcRate * 0.10),
  );

  return {
    baseId: base.id,
    name: base.name,
    fuelPct,
    fuelLiters: Math.round(base.fuel * 800),
    ammoPct, ammoCount, ammoMax,
    personnelPct, personnelAvail, personnelTotal,
    partsPct, partsCriticalCount,
    bayPct, bayFree, bayTotal: base.maintenanceBays.total,
    fuelDOS, ammoDOS,
    mcRate, mcCount, acTotal,
    composite,
  };
}

// ── Network-wide totals ──────────────────────────────────────────────────────
export interface NetworkSummary {
  fuelPct: number;
  fuelLiters: number;
  fuelMaxLiters: number;
  ammoPct: number;
  ammoCount: number;
  ammoMax: number;
  personnelPct: number;
  personnelAvail: number;
  personnelTotal: number;
  partsPct: number;
  partsCriticalCount: number;
  bayPct: number;
  bayFree: number;
  bayTotal: number;
  /** Theater-wide MC-rate. */
  mcRate: number;
  mcCount: number;
  acTotal: number;
  /** Worst-case Days-of-Supply (min over bases for fuel). */
  worstFuelDOS: number;
  /** Average DOS across bases. */
  avgFuelDOS: number;
  /** Total resupply orders pending. */
  pendingResupply: number;
  /** Logistics ground vehicles theater-wide (truck / armored / bowser). */
  truckCount: number;
  bowserCount: number;
  armoredCount: number;
}

export function summarizeNetwork(state: GameState): NetworkSummary {
  const phase = state.phase;
  let fuelLiters = 0, fuelMaxLiters = 0;
  let ammoCount = 0, ammoMax = 0;
  let personnelAvail = 0, personnelTotal = 0;
  let partsCount = 0, partsMax = 0, partsCriticalCount = 0;
  let bayFree = 0, bayTotal = 0;
  let mcCount = 0, acTotal = 0;
  let worstFuelDOS = Infinity, dosSum = 0, dosN = 0;
  let pendingResupply = 0;
  let truckCount = 0, bowserCount = 0, armoredCount = 0;

  for (const base of state.bases) {
    fuelLiters += Math.round(base.fuel * 800);
    fuelMaxLiters += Math.round(base.maxFuel * 800);
    ammoCount += base.ammunition.reduce((s, a) => s + a.quantity, 0);
    ammoMax += base.ammunition.reduce((s, a) => s + a.max, 0);
    personnelAvail += base.personnel.reduce((s, p) => s + p.available, 0);
    personnelTotal += base.personnel.reduce((s, p) => s + p.total, 0);
    partsCount += base.spareParts.reduce((s, p) => s + p.quantity, 0);
    partsMax += base.spareParts.reduce((s, p) => s + p.maxQuantity, 0);
    partsCriticalCount += base.spareParts.filter(
      (p) => p.maxQuantity > 0 && p.quantity / p.maxQuantity < 0.30,
    ).length;
    bayFree += base.maintenanceBays.total - base.maintenanceBays.occupied;
    bayTotal += base.maintenanceBays.total;
    pendingResupply += base.spareParts.reduce((s, p) => s + (p.onOrder > 0 ? 1 : 0), 0);

    const ac = base.units.filter(isAircraft);
    mcCount += ac.filter((a) => a.status === "ready").length;
    acTotal += ac.length;

    const dos = FUEL_BURN_PCT_PER_HOUR[phase] > 0
      ? base.fuel / (FUEL_BURN_PCT_PER_HOUR[phase] * 24) : Infinity;
    if (dos < worstFuelDOS) worstFuelDOS = dos;
    if (Number.isFinite(dos)) { dosSum += dos; dosN += 1; }

    for (const u of base.units) {
      if (!isGroundVehicle(u)) continue;
      if (u.type === "LOGISTICS_TRUCK") truckCount += 1;
      else if (u.type === "FUEL_BOWSER") bowserCount += 1;
      else if (u.type === "ARMORED_TRANSPORT") armoredCount += 1;
    }
  }

  return {
    fuelPct: fuelMaxLiters > 0 ? Math.round((fuelLiters / fuelMaxLiters) * 100) : 0,
    fuelLiters, fuelMaxLiters,
    ammoPct: ammoMax > 0 ? Math.round((ammoCount / ammoMax) * 100) : 0,
    ammoCount, ammoMax,
    personnelPct: personnelTotal > 0 ? Math.round((personnelAvail / personnelTotal) * 100) : 0,
    personnelAvail, personnelTotal,
    partsPct: partsMax > 0 ? Math.round((partsCount / partsMax) * 100) : 0,
    partsCriticalCount,
    bayPct: bayTotal > 0 ? Math.round((bayFree / bayTotal) * 100) : 0,
    bayFree, bayTotal,
    mcRate: acTotal > 0 ? Math.round((mcCount / acTotal) * 100) : 0,
    mcCount, acTotal,
    worstFuelDOS: Number.isFinite(worstFuelDOS) ? worstFuelDOS : 0,
    avgFuelDOS: dosN > 0 ? dosSum / dosN : 0,
    pendingResupply,
    truckCount, bowserCount, armoredCount,
  };
}

// ── Critical shortages (flat, severity-ranked) ───────────────────────────────
export type Severity = "critical" | "high" | "medium";

export interface CriticalItem {
  id: string;
  baseId: BaseType;
  baseName: string;
  category: "fuel" | "ammo" | "parts" | "personnel" | "bays";
  label: string;
  pct: number;
  /** Human-readable "x/y" detail string. */
  detail: string;
  severity: Severity;
  /** Estimated days until depletion (only for fuel/ammo). */
  daysOfSupply?: number;
}

export function findCriticalItems(state: GameState): CriticalItem[] {
  const items: CriticalItem[] = [];
  const phase = state.phase;

  for (const base of state.bases) {
    const fuelPct = base.maxFuel > 0 ? Math.round((base.fuel / base.maxFuel) * 100) : 0;
    if (fuelPct < 60) {
      const dos = base.fuel / (FUEL_BURN_PCT_PER_HOUR[phase] * 24);
      items.push({
        id: `${base.id}-fuel`,
        baseId: base.id,
        baseName: base.name,
        category: "fuel",
        label: "Bränsle",
        pct: fuelPct,
        detail: `${Math.round(base.fuel * 800).toLocaleString("sv-SE")} L (${fuelPct}%)`,
        severity: fuelPct < 25 ? "critical" : fuelPct < 40 ? "high" : "medium",
        daysOfSupply: dos,
      });
    }

    for (const a of base.ammunition) {
      const pct = a.max > 0 ? Math.round((a.quantity / a.max) * 100) : 0;
      if (pct < 50) {
        items.push({
          id: `${base.id}-ammo-${a.type}`,
          baseId: base.id,
          baseName: base.name,
          category: "ammo",
          label: a.type,
          pct,
          detail: `${a.quantity}/${a.max}`,
          severity: pct < 20 ? "critical" : pct < 35 ? "high" : "medium",
        });
      }
    }

    for (const p of base.spareParts) {
      const pct = p.maxQuantity > 0 ? Math.round((p.quantity / p.maxQuantity) * 100) : 0;
      if (pct < 50) {
        items.push({
          id: `${base.id}-part-${p.id}`,
          baseId: base.id,
          baseName: base.name,
          category: "parts",
          label: p.name,
          pct,
          detail: `${p.quantity}/${p.maxQuantity}${p.onOrder > 0 ? ` (+${p.onOrder} på väg)` : ""}`,
          severity: p.quantity === 0 ? "critical" : p.quantity <= 1 ? "high" : "medium",
        });
      }
    }

    for (const grp of base.personnel) {
      const pct = grp.total > 0 ? Math.round((grp.available / grp.total) * 100) : 0;
      if (pct < 60) {
        items.push({
          id: `${base.id}-pers-${grp.id}`,
          baseId: base.id,
          baseName: base.name,
          category: "personnel",
          label: grp.role,
          pct,
          detail: `${grp.available}/${grp.total}`,
          severity: pct < 40 ? "critical" : pct < 50 ? "high" : "medium",
        });
      }
    }

    if (base.maintenanceBays.total > 0) {
      const free = base.maintenanceBays.total - base.maintenanceBays.occupied;
      const pct = Math.round((free / base.maintenanceBays.total) * 100);
      if (pct === 0) {
        items.push({
          id: `${base.id}-bays`,
          baseId: base.id,
          baseName: base.name,
          category: "bays",
          label: "UH-platser",
          pct: 0,
          detail: `${base.maintenanceBays.occupied}/${base.maintenanceBays.total} upptagna`,
          severity: "high",
        });
      }
    }
  }

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity] || a.pct - b.pct);
}

// ── Consumption forecast (14-day projection) ─────────────────────────────────
export interface ForecastPoint {
  /** Day offset from today (0 = today). */
  day: number;
  label: string;
  /** Percent of max fuel theater-wide. */
  fuelPct: number;
  /** Percent of max ammo theater-wide. */
  ammoPct: number;
  /** Percent of max parts theater-wide. */
  partsPct: number;
  /** Phase-tier doctrinal floor. */
  reserveFloor: number;
}

export function forecastConsumption(state: GameState, days = 14): ForecastPoint[] {
  const phase = state.phase;
  const fuelDailyDrop = FUEL_BURN_PCT_PER_HOUR[phase] * 24;
  const ammoDailyDrop = AMMO_BURN_PCT_PER_DAY[phase];
  const partsDailyDrop = (PARTS_ATTRITION_PER_DAY[phase] / 5) * 100; // 5 LRU types ~ rough
  const summary = summarizeNetwork(state);

  const out: ForecastPoint[] = [];
  for (let d = 0; d <= days; d++) {
    out.push({
      day: d,
      label: d === 0 ? "Idag" : `D+${d}`,
      fuelPct: Math.max(0, Math.round(summary.fuelPct - fuelDailyDrop * d)),
      ammoPct: Math.max(0, Math.round(summary.ammoPct - ammoDailyDrop * d)),
      partsPct: Math.max(0, Math.round(summary.partsPct - partsDailyDrop * d)),
      reserveFloor: RESERVE_TARGET_PCT[phase],
    });
  }
  return out;
}

// ── Resupply pipeline ────────────────────────────────────────────────────────
export interface ResupplyOrder {
  baseId: BaseType;
  baseName: string;
  partId: string;
  partName: string;
  quantity: number;
  leadTimeDays: number;
  source: SparePartStock["source"];
  /** Heuristic — assumes order placed at start of day; in real impl this would be tracked. */
  etaDay: number;
}

export function listResupply(state: GameState): ResupplyOrder[] {
  const out: ResupplyOrder[] = [];
  for (const base of state.bases) {
    for (const p of base.spareParts) {
      if (p.onOrder <= 0) continue;
      out.push({
        baseId: base.id,
        baseName: base.name,
        partId: p.id,
        partName: p.name,
        quantity: p.onOrder,
        leadTimeDays: p.leadTime,
        source: p.source,
        etaDay: state.day + p.leadTime,
      });
    }
  }
  return out.sort((a, b) => a.etaDay - b.etaDay);
}

// ── AI Recommendation engine (deterministic) ─────────────────────────────────
export type LogRecPriority = "critical" | "high" | "medium" | "low";

export type LogRecCategory =
  | "fuel_rebalance"
  | "fuel_reserve"
  | "ammo_preposition"
  | "parts_reorder"
  | "personnel_gap"
  | "bay_balance"
  | "convoy_route"
  | "phase_escalation";

export interface LogisticsRecommendation {
  id: string;
  priority: LogRecPriority;
  category: LogRecCategory;
  title: string;
  rationale: string;
  /** Concrete action suggestion (verb-led, hackathon-deterministic). */
  action: string;
  /** Quantified expected benefit. */
  expectedBenefit: string;
  /** Operational tradeoff. */
  tradeoff: string;
  /** Affected base IDs (for highlighting in matrix). */
  affected: BaseType[];
  /** Confidence — fixed deterministic value for demo. */
  confidence: number;
}

export function generateLogisticsRecommendations(state: GameState): LogisticsRecommendation[] {
  const recs: LogisticsRecommendation[] = [];
  const phase = state.phase;
  const reserveFloor = RESERVE_TARGET_PCT[phase];
  const summary = summarizeNetwork(state);
  const snaps = state.bases.map((b) => snapshotBase(b, phase));

  // 1) Fuel rebalancing (donor base ≥ +20pp above acceptor)
  const sortedFuel = [...snaps].sort((a, b) => b.fuelPct - a.fuelPct);
  const donor = sortedFuel[0];
  const acceptor = sortedFuel[sortedFuel.length - 1];
  if (donor && acceptor && donor.fuelPct - acceptor.fuelPct >= 20 && acceptor.fuelPct < reserveFloor) {
    const transferLiters = Math.round(((donor.fuelPct - acceptor.fuelPct) / 2) * 800 * 0.6);
    const bowsers = summary.bowserCount;
    recs.push({
      id: `rec-fuel-rebal-${donor.baseId}-${acceptor.baseId}`,
      priority: acceptor.fuelPct < 30 ? "critical" : "high",
      category: "fuel_rebalance",
      title: `Omfördela bränsle ${donor.baseId} → ${acceptor.baseId}`,
      rationale: `${donor.baseId} har ${donor.fuelPct}% bränsle medan ${acceptor.baseId} har ${acceptor.fuelPct}% (under doktrinsnivå ${reserveFloor}% för ${phase}). Skillnaden ${donor.fuelPct - acceptor.fuelPct} pp överstiger 20 pp omfördelningströskel.`,
      action: `Dispatcha ${Math.max(1, Math.ceil(transferLiters / 12000))} tankbil (${bowsers} tillgängliga) för transfer ~${transferLiters.toLocaleString("sv-SE")} L`,
      expectedBenefit: `${acceptor.baseId} höjs till ~${Math.round((donor.fuelPct + acceptor.fuelPct) / 2)}% — ${Math.round((((donor.fuelPct + acceptor.fuelPct) / 2) - acceptor.fuelPct) / FUEL_BURN_PCT_PER_HOUR[phase] / 24 * 10) / 10} dagar extra DOS`,
      tradeoff: `${donor.baseId} sänks till ~${Math.round((donor.fuelPct + acceptor.fuelPct) / 2)}%. Konvoj exponerad ${Math.round(60 + Math.random() * 40)} min på väg.`,
      affected: [donor.baseId, acceptor.baseId],
      confidence: 0.92,
    });
  }

  // 2) Phase reserve targeting — bases below floor
  for (const s of snaps) {
    if (s.fuelPct < reserveFloor && s.fuelPct >= 30) {
      const gapL = Math.round((reserveFloor - s.fuelPct) * 800);
      recs.push({
        id: `rec-reserve-${s.baseId}`,
        priority: phase === "KRIG" ? "high" : "medium",
        category: "fuel_reserve",
        title: `${s.baseId} under doktrinsnivå ${reserveFloor}% (${phase})`,
        rationale: `${s.name} har ${s.fuelPct}% bränsle. Doktrin för ${phase} kräver minst ${reserveFloor}% reserv för 72h uthållighet utan extern påfyllning.`,
        action: `Beställ påfyllning ${gapL.toLocaleString("sv-SE")} L från RESMAT — leveranstid 5 dagar`,
        expectedBenefit: `Återställer 72h-reserv. DOS höjs från ${s.fuelDOS.toFixed(1)}d till ~${(reserveFloor / (FUEL_BURN_PCT_PER_HOUR[phase] * 24)).toFixed(1)}d.`,
        tradeoff: `Belastar central drivmedelsdepå. Ingen taktisk påverkan.`,
        affected: [s.baseId],
        confidence: 0.85,
      });
    }
  }

  // 3) Ammunition pre-positioning (KRIS/KRIG escalation)
  if (phase !== "FRED") {
    for (const base of state.bases) {
      const lowAmmo = base.ammunition.filter((a) => a.quantity / a.max < 0.5);
      if (lowAmmo.length === 0) continue;
      const types = lowAmmo.map((a) => a.type).join(", ");
      const refillTotal = lowAmmo.reduce((s, a) => s + (a.max - a.quantity), 0);
      recs.push({
        id: `rec-ammo-pre-${base.id}`,
        priority: phase === "KRIG" ? "critical" : "high",
        category: "ammo_preposition",
        title: `Förpositionera ammunition vid ${base.id}`,
        rationale: `${types} under 50% i ${phase}-läge. Förbrukning ${AMMO_BURN_PCT_PER_DAY[phase]}%/dag — risk för ammopolarisering inom ${Math.round(50 / AMMO_BURN_PCT_PER_DAY[phase])} dagar.`,
        action: `Beställ ${refillTotal} robotar/bomber från central depå. Konvoj via ARMORED_TRANSPORT (${summary.armoredCount} tillgängliga).`,
        expectedBenefit: `${lowAmmo.length} ammunitionstyper återställda till ≥80%. Förlänger uthållighet ~${Math.round(30 / AMMO_BURN_PCT_PER_DAY[phase])} dagar.`,
        tradeoff: `Pansrad transport binder upp 2 personalgrupper i 6h.`,
        affected: [base.id],
        confidence: 0.88,
      });
    }
  }

  // 4) Proactive parts reorder — low stock + nothing on order
  for (const base of state.bases) {
    for (const p of base.spareParts) {
      const pct = p.maxQuantity > 0 ? p.quantity / p.maxQuantity : 1;
      if (pct < 0.40 && p.onOrder === 0 && p.maxQuantity > 1) {
        const reorderQty = p.maxQuantity - p.quantity;
        recs.push({
          id: `rec-parts-${base.id}-${p.id}`,
          priority: p.quantity === 0 ? "critical" : pct < 0.20 ? "high" : "medium",
          category: "parts_reorder",
          title: `Beställ ${p.name} till ${base.id}`,
          rationale: `${p.quantity}/${p.maxQuantity} kvar (${Math.round(pct * 100)}%). Inga beställningar på väg. Källa: ${p.source === "base_stock" ? "basförråd" : p.source === "central_stock" ? "central RESMAT" : "MRO"}.`,
          action: `Beställ ${reorderQty} st ${p.name} (kategori: ${p.category}) — ledtid ${p.leadTime} dagar`,
          expectedBenefit: `Återställer LRU-buffert. Förebygger underhållsstopp på flygplan vid ${base.id}.`,
          tradeoff: `Bekräftelse krävs av ${p.source === "central_stock" ? "MateriellChef" : "Bastekniker"}. Frakttid ${p.leadTime}d.`,
          affected: [base.id],
          confidence: 0.90,
        });
      }
    }
  }

  // 5) Personnel role gaps
  for (const base of state.bases) {
    for (const grp of base.personnel) {
      const pct = grp.total > 0 ? grp.available / grp.total : 1;
      if (pct < 0.6) {
        const gap = grp.total - grp.available;
        recs.push({
          id: `rec-pers-${base.id}-${grp.id}`,
          priority: pct < 0.4 ? "high" : "medium",
          category: "personnel_gap",
          title: `${grp.role}-brist vid ${base.id}`,
          rationale: `${grp.available}/${grp.total} ${grp.role.toLowerCase()} tillgängliga (${Math.round(pct * 100)}%). Vid längre uppdrag riskeras kapacitetsbrist.`,
          action: `Initiera personalrotation från MOB eller aktivera reservpersonal (+${gap})`,
          expectedBenefit: `Återställer ${grp.role}-kapacitet — direkt effekt på sortie-rate.`,
          tradeoff: `MOB:s personalpool minskas tillfälligt. 24h omplaceringstid.`,
          affected: [base.id],
          confidence: 0.78,
        });
      }
    }
  }

  // 6) Maintenance bay imbalance
  const bayBases = snaps.filter((s) => s.bayTotal > 0);
  const fullBay = bayBases.find((s) => s.bayPct === 0);
  const idleBay = bayBases.find((s) => s.bayPct >= 70 && s.bayTotal >= 2);
  if (fullBay && idleBay && fullBay.baseId !== idleBay.baseId) {
    recs.push({
      id: `rec-bay-${fullBay.baseId}-${idleBay.baseId}`,
      priority: "high",
      category: "bay_balance",
      title: `Omfördela UH till ${idleBay.baseId}`,
      rationale: `${fullBay.baseId}: ${fullBay.bayTotal}/${fullBay.bayTotal} platser upptagna. ${idleBay.baseId}: ${idleBay.bayFree}/${idleBay.bayTotal} lediga. Möjligt att avlasta köer.`,
      action: `Rebasa 1–2 NMC-flygplan från ${fullBay.baseId} till ${idleBay.baseId} för LRU-byte`,
      expectedBenefit: `Frigör hangarplats vid ${fullBay.baseId}. Ledtid ~6h flygtid + UH.`,
      tradeoff: `Kräver ferry-pilot och förflyttning. Risk vid lågt molnigt väder.`,
      affected: [fullBay.baseId, idleBay.baseId],
      confidence: 0.75,
    });
  }

  // 7) Convoy routing (if logistics fleet available + critical fuel exists)
  const criticalFuelBase = snaps.find((s) => s.fuelPct < 30);
  if (criticalFuelBase && summary.bowserCount > 0) {
    recs.push({
      id: `rec-convoy-${criticalFuelBase.baseId}`,
      priority: "critical",
      category: "convoy_route",
      title: `Aktivera nödkonvoj till ${criticalFuelBase.baseId}`,
      rationale: `${criticalFuelBase.baseId} har ${criticalFuelBase.fuelPct}% bränsle (~${criticalFuelBase.fuelDOS.toFixed(1)}d DOS). ${summary.bowserCount} tankbil(ar) i flottan kan dispatchas.`,
      action: `Dispatcha 2× FUEL_BOWSER + 1× ARMORED_TRANSPORT eskort. Rutt via E4/E18.`,
      expectedBenefit: `Akut påfyllning 24,000 L inom 4–6h. Räddar QRA-kapacitet.`,
      tradeoff: `Konvoj exponerad ~5h. Kräver ${phase === "KRIG" ? "luftvärnstäckning" : "väganmälan"}.`,
      affected: [criticalFuelBase.baseId],
      confidence: 0.95,
    });
  }

  // 8) Phase-escalation pre-warning
  if (phase === "KRIS") {
    const exposed = snaps.filter((s) => s.fuelPct < RESERVE_TARGET_PCT.KRIG || s.ammoPct < 70);
    if (exposed.length >= 2) {
      recs.push({
        id: `rec-phase-esc`,
        priority: "high",
        category: "phase_escalation",
        title: `Förbered eskalering KRIS → KRIG`,
        rationale: `${exposed.length} av ${snaps.length} baser ligger under KRIG-doktrinens tröskel (bränsle ≥${RESERVE_TARGET_PCT.KRIG}% / ammo ≥70%). Vid eskalering kortas DOS dramatiskt.`,
        action: `Aktivera nivå-2 RESMAT-flöde. Beställ pre-position till alla exponerade baser.`,
        expectedBenefit: `Uthållighet vid eskalering: ${Math.round(RESERVE_TARGET_PCT.KRIG / (FUEL_BURN_PCT_PER_HOUR.KRIG * 24))} d istället för ${Math.round(summary.fuelPct / (FUEL_BURN_PCT_PER_HOUR.KRIG * 24))} d.`,
        tradeoff: `Belastar central logistik 5–7d. Politisk synlighet.`,
        affected: exposed.map((s) => s.baseId),
        confidence: 0.82,
      });
    }
  }

  // Sort by priority then by confidence desc
  const order: Record<LogRecPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority] || b.confidence - a.confidence);
}

// ── Per-base ATO load + sortie capacity ──────────────────────────────────────
export type AtoLoadStatus = "nominal" | "tight" | "over_committed" | "infeasible";

export interface BaseAtoLoad {
  baseId: BaseType;
  baseName: string;
  /** Sum of requiredCount for orders launching from this base (non-completed). */
  committedSorties: number;
  /** Number of pending (not yet assigned) ATO orders. */
  pendingOrders: number;
  /** Number of dispatched orders already in the air today. */
  dispatchedOrders: number;
  /** Aircraft already assigned to those orders. */
  aircraftAssigned: number;
  /** Mission-capable aircraft currently sitting at the base. */
  mcAvailable: number;
  /** Total aircraft (including NMC) at the base. */
  acTotal: number;
  bayFree: number;
  bayTotal: number;
  /** Estimated daily sortie ceiling (bayTotal × SORTIES_PER_BAY_PER_DAY_CAP, capped). */
  sortieCeilingPerDay: number;
  /** Negative number = over-committed by that many sorties. */
  capacityMargin: number;
  status: AtoLoadStatus;
  /** Plain Swedish suggestion for the commander (one line). */
  recommendation?: string;
  /** Aircraft types over-allocated, if any (used for diagnostics). */
  typesShort: string[];
}

export function computeAtoLoad(state: GameState): BaseAtoLoad[] {
  return state.bases.map((base) => baseAtoLoad(base, state.atoOrders));
}

function baseAtoLoad(base: Base, atos: ATOOrder[]): BaseAtoLoad {
  const baseOrders = atos.filter(
    (o) => o.launchBase === base.id && o.status !== "completed",
  );
  const committedSorties = baseOrders.reduce((s, o) => s + o.requiredCount, 0);
  const pendingOrders = baseOrders.filter((o) => o.status === "pending").length;
  const dispatchedOrders = baseOrders.filter((o) => o.status === "dispatched").length;
  const aircraftAssigned = baseOrders.reduce((s, o) => s + o.assignedAircraft.length, 0);

  const aircraft = base.units.filter(isAircraft);
  const mcAvailable = aircraft.filter((a) => a.status === "ready").length;
  const acTotal = aircraft.length;
  const bayFree = base.maintenanceBays.total - base.maintenanceBays.occupied;
  const bayTotal = base.maintenanceBays.total;

  // Per-bay parallel sortie throughput, then divided by turnaround/24 to convert to per-day.
  const rawCeiling = bayTotal > 0
    ? Math.round((bayTotal * 24) / SORTIE_TURNAROUND_HOURS)
    : 0;
  const sortieCeilingPerDay = Math.min(
    rawCeiling,
    bayTotal * SORTIES_PER_BAY_PER_DAY_CAP,
  );
  const capacityMargin = sortieCeilingPerDay - committedSorties;

  // Type coverage check — ATO sometimes specifies aircraftType
  const typesShort: string[] = [];
  for (const o of baseOrders) {
    if (!o.aircraftType) continue;
    const ofType = aircraft.filter((a) => a.type === o.aircraftType && a.status === "ready").length;
    if (ofType < o.requiredCount) {
      typesShort.push(`${o.aircraftType} (${ofType}/${o.requiredCount})`);
    }
  }

  let status: AtoLoadStatus;
  if (committedSorties > sortieCeilingPerDay && bayFree === 0 && mcAvailable < pendingOrders) {
    status = "infeasible";
  } else if (committedSorties > sortieCeilingPerDay) {
    status = "over_committed";
  } else if (sortieCeilingPerDay > 0 && committedSorties >= sortieCeilingPerDay * 0.85) {
    status = "tight";
  } else {
    status = "nominal";
  }

  let recommendation: string | undefined;
  if (status === "infeasible") {
    recommendation = `Skjut upp ${Math.max(1, committedSorties - sortieCeilingPerDay)} sorties eller rebasa till bas med ledig kapacitet.`;
  } else if (status === "over_committed") {
    recommendation = `Reducera ATO-belastning med ${committedSorties - sortieCeilingPerDay} sorties eller förläng prep-fönster.`;
  } else if (status === "tight" && pendingOrders > 0) {
    recommendation = `Liten marginal — undvik att lägga in nya uppdrag idag.`;
  } else if (typesShort.length > 0) {
    recommendation = `Brist på ${typesShort.join(", ")} — överväg omfördelning.`;
  }

  return {
    baseId: base.id,
    baseName: base.name,
    committedSorties,
    pendingOrders,
    dispatchedOrders,
    aircraftAssigned,
    mcAvailable,
    acTotal,
    bayFree,
    bayTotal,
    sortieCeilingPerDay,
    capacityMargin,
    status,
    recommendation,
    typesShort,
  };
}

// ── Contingency / worst-case scenarios ───────────────────────────────────────
export type ContingencyVerdict = "nominal" | "marginal" | "critical";

export type ContingencyId =
  | `lose_${BaseType}`
  | "lose_fuel_resupply"
  | "lose_ammo_resupply"
  | "phase_escalation";

export interface ContingencyOutcome {
  id: ContingencyId;
  /** Human Swedish label, e.g. "Förlust av MOB". */
  label: string;
  /** Short kind classifier for icon selection in the UI. */
  kind: "base_loss" | "supply_loss" | "phase";
  /** Bases that remain operational under this scenario. */
  remainingBases: BaseType[];
  /** Aircraft remaining across surviving bases. */
  acAircraftRemaining: number;
  /** MC-rate aircraft remaining. */
  mcRemaining: number;
  /** Worst single-base fuel DOS in the surviving set. */
  worstFuelDOS: number;
  /** Aggregate average DOS across surviving bases. */
  avgFuelDOS: number;
  /** Sorties that would have to be re-routed (sum from lost base's ATO). */
  reroutedSorties: number;
  /** Combined sortie-ceiling across surviving bases. */
  reroutedCapacity: number;
  /** Margin = capacity − rerouted commitments (negative = infeasible). */
  capacityMargin: number;
  /** Days until operations halt under this scenario at current burn rate. */
  daysUntilHalt: number;
  verdict: ContingencyVerdict;
  /** One-line implication for commander. */
  implication: string;
  /** Specific ATO mission types that become infeasible. */
  brokenMissions: string[];
}

export function computeContingencies(state: GameState): ContingencyOutcome[] {
  const phase = state.phase;
  const fuelDailyDrop = FUEL_BURN_PCT_PER_HOUR[phase] * 24;
  const ammoDailyDrop = AMMO_BURN_PCT_PER_DAY[phase];

  const all = state.bases;
  const allLoad = computeAtoLoad(state);
  const out: ContingencyOutcome[] = [];

  // ── A) Loss of each base ────────────────────────────────────────────────
  for (const lost of all) {
    const remaining = all.filter((b) => b.id !== lost.id);
    const remainingLoad = allLoad.filter((l) => l.baseId !== lost.id);
    const lostLoad = allLoad.find((l) => l.baseId === lost.id);

    const acAircraftRemaining = remaining.reduce(
      (s, b) => s + b.units.filter(isAircraft).length, 0,
    );
    const mcRemaining = remaining.reduce(
      (s, b) => s + b.units.filter(isAircraft).filter((a) => a.status === "ready").length, 0,
    );
    const fuelDosArr = remaining.map((b) =>
      fuelDailyDrop > 0 ? (b.fuel / fuelDailyDrop) : Infinity,
    );
    const worstFuelDOS = fuelDosArr.length > 0 ? Math.min(...fuelDosArr) : 0;
    const avgFuelDOS = fuelDosArr.length > 0
      ? fuelDosArr.reduce((s, x) => s + x, 0) / fuelDosArr.length : 0;
    const reroutedSorties = lostLoad?.committedSorties ?? 0;
    const reroutedCapacity = remainingLoad.reduce((s, l) => s + l.sortieCeilingPerDay, 0);
    const capacityMargin = reroutedCapacity - remainingLoad.reduce((s, l) => s + l.committedSorties, 0) - reroutedSorties;

    // Broken missions = ATO at lost base requiring an aircraft type no surviving base has ready
    const brokenMissions: string[] = [];
    for (const o of state.atoOrders.filter((x) => x.launchBase === lost.id && x.status !== "completed")) {
      if (!o.aircraftType) continue;
      const survivingHasType = remaining.some((b) =>
        b.units.filter(isAircraft).some((a) => a.type === o.aircraftType && a.status === "ready"),
      );
      if (!survivingHasType) brokenMissions.push(`${o.missionType} (${o.aircraftType})`);
    }

    let verdict: ContingencyVerdict;
    if (worstFuelDOS < 1.5 || capacityMargin < -3 || brokenMissions.length > 0) verdict = "critical";
    else if (worstFuelDOS < 3 || capacityMargin < 0) verdict = "marginal";
    else verdict = "nominal";

    const implication = verdict === "critical"
      ? `${reroutedSorties} sorties förlorade. Återstående baser har ${capacityMargin < 0 ? `${-capacityMargin} sorties överbelastning` : "begränsad kapacitet"}.${brokenMissions.length > 0 ? ` ${brokenMissions.length} uppdragstyper omöjliga utan ${lost.id}.` : ""}`
      : verdict === "marginal"
      ? `Kapacitet räcker men marginalen är liten — ${worstFuelDOS.toFixed(1)}d worst-DOS.`
      : `Återstående baser kan absorbera lasten. Operativ förmåga bibehålls.`;

    out.push({
      id: `lose_${lost.id}` as ContingencyId,
      label: `Förlust av ${lost.id}`,
      kind: "base_loss",
      remainingBases: remaining.map((b) => b.id),
      acAircraftRemaining,
      mcRemaining,
      worstFuelDOS,
      avgFuelDOS,
      reroutedSorties,
      reroutedCapacity,
      capacityMargin,
      daysUntilHalt: worstFuelDOS,
      verdict,
      implication,
      brokenMissions,
    });
  }

  // ── B) Loss of central fuel resupply (no convoys arrive) ────────────────
  {
    const dosArr = all.map((b) => fuelDailyDrop > 0 ? b.fuel / fuelDailyDrop : Infinity);
    const worst = Math.min(...dosArr);
    const avg = dosArr.reduce((s, x) => s + x, 0) / dosArr.length;
    const verdict: ContingencyVerdict = worst < 1.5 ? "critical" : worst < 3 ? "marginal" : "nominal";
    out.push({
      id: "lose_fuel_resupply",
      label: "Avbrott i bränsleflöde (RESMAT)",
      kind: "supply_loss",
      remainingBases: all.map((b) => b.id),
      acAircraftRemaining: all.reduce((s, b) => s + b.units.filter(isAircraft).length, 0),
      mcRemaining: all.reduce((s, b) => s + b.units.filter(isAircraft).filter((a) => a.status === "ready").length, 0),
      worstFuelDOS: worst,
      avgFuelDOS: avg,
      reroutedSorties: 0,
      reroutedCapacity: 0,
      capacityMargin: 0,
      daysUntilHalt: worst,
      verdict,
      implication: `Worst-case bas tappar bränsle om ${worst.toFixed(1)}d vid ${phase}-burn ${(fuelDailyDrop).toFixed(1)} %/dag.`,
      brokenMissions: [],
    });
  }

  // ── C) Loss of central ammo resupply ────────────────────────────────────
  {
    const ammoDosByType: Record<string, number> = {};
    for (const b of all) {
      for (const a of b.ammunition) {
        const dos = a.max > 0 && ammoDailyDrop > 0
          ? (a.quantity / a.max) * 100 / ammoDailyDrop : Infinity;
        ammoDosByType[a.type] = Math.min(ammoDosByType[a.type] ?? Infinity, dos);
      }
    }
    const finiteDos = Object.values(ammoDosByType).filter((x) => Number.isFinite(x));
    const worst = finiteDos.length > 0 ? Math.min(...finiteDos) : Infinity;
    const verdict: ContingencyVerdict = worst < 2 ? "critical" : worst < 5 ? "marginal" : "nominal";
    const worstType = Object.entries(ammoDosByType).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "okänd typ";
    out.push({
      id: "lose_ammo_resupply",
      label: "Avbrott i ammunitionsflöde",
      kind: "supply_loss",
      remainingBases: all.map((b) => b.id),
      acAircraftRemaining: 0,
      mcRemaining: 0,
      worstFuelDOS: 0,
      avgFuelDOS: 0,
      reroutedSorties: 0,
      reroutedCapacity: 0,
      capacityMargin: 0,
      daysUntilHalt: Number.isFinite(worst) ? worst : 0,
      verdict,
      implication: `${worstType} först ut, ${Number.isFinite(worst) ? worst.toFixed(1) : "∞"}d kvar vid ${phase}-burn.`,
      brokenMissions: [],
    });
  }

  // ── D) Phase escalation projection ──────────────────────────────────────
  if (phase !== "KRIG") {
    const nextPhase: ScenarioPhase = phase === "FRED" ? "KRIS" : "KRIG";
    const nextDailyDrop = FUEL_BURN_PCT_PER_HOUR[nextPhase] * 24;
    const exposed = all.filter((b) => b.fuel < RESERVE_TARGET_PCT[nextPhase]);
    const worstAfter = Math.min(...all.map((b) => b.fuel / nextDailyDrop));
    const verdict: ContingencyVerdict = exposed.length >= 2 ? "critical" : exposed.length === 1 ? "marginal" : "nominal";
    out.push({
      id: "phase_escalation",
      label: `Eskalering ${phase} → ${nextPhase}`,
      kind: "phase",
      remainingBases: all.map((b) => b.id),
      acAircraftRemaining: 0,
      mcRemaining: 0,
      worstFuelDOS: worstAfter,
      avgFuelDOS: 0,
      reroutedSorties: 0,
      reroutedCapacity: 0,
      capacityMargin: 0,
      daysUntilHalt: worstAfter,
      verdict,
      implication: `${exposed.length} av ${all.length} baser under ${nextPhase}-doktrin (≥${RESERVE_TARGET_PCT[nextPhase]}%). Worst-DOS faller till ${worstAfter.toFixed(1)}d.`,
      brokenMissions: [],
    });
  }

  // Sort: critical first, then marginal, then nominal
  const order: Record<ContingencyVerdict, number> = { critical: 0, marginal: 1, nominal: 2 };
  return out.sort((a, b) => order[a.verdict] - order[b.verdict]);
}

/** Single point of failure: the base whose loss yields the worst verdict. */
export function singlePointOfFailure(scenarios: ContingencyOutcome[]): ContingencyOutcome | null {
  const baseLoss = scenarios.filter((s) => s.kind === "base_loss");
  if (baseLoss.length === 0) return null;
  const order: Record<ContingencyVerdict, number> = { critical: 0, marginal: 1, nominal: 2 };
  return [...baseLoss].sort((a, b) =>
    order[a.verdict] - order[b.verdict]
    || a.daysUntilHalt - b.daysUntilHalt
    || a.capacityMargin - b.capacityMargin,
  )[0];
}

// ── Per-base fuel forecast (one line per base) ───────────────────────────────
export interface PerBaseFuelPoint {
  day: number;
  label: string;
  reserveFloor: number;
  /** baseId → fuel %. */
  [baseId: string]: number | string;
}

export function forecastFuelPerBase(state: GameState, days = 14): PerBaseFuelPoint[] {
  const phase = state.phase;
  const dailyDrop = FUEL_BURN_PCT_PER_HOUR[phase] * 24;
  const out: PerBaseFuelPoint[] = [];
  for (let d = 0; d <= days; d++) {
    const point: PerBaseFuelPoint = {
      day: d,
      label: d === 0 ? "Idag" : `D+${d}`,
      reserveFloor: RESERVE_TARGET_PCT[phase],
    };
    for (const b of state.bases) {
      const pct = b.maxFuel > 0 ? (b.fuel / b.maxFuel) * 100 : 0;
      point[b.id] = Math.max(0, Math.round(pct - dailyDrop * d));
    }
    out.push(point);
  }
  return out;
}

// ── Per-base ground-vehicle allocation ───────────────────────────────────────
export interface BaseFleetAllocation {
  baseId: BaseType;
  baseName: string;
  bowsers: number;
  trucks: number;
  armored: number;
  /** Total deliverable fuel in litres if every bowser ran one full load (6000 L/each typical). */
  bowserCapacityLiters: number;
}

const BOWSER_LITERS_PER_RUN = 6000;

export function fleetAllocationPerBase(state: GameState): BaseFleetAllocation[] {
  return state.bases.map((b) => {
    const gv = b.units.filter(isGroundVehicle);
    const bowsers = gv.filter((v) => v.type === "FUEL_BOWSER").length;
    const trucks = gv.filter((v) => v.type === "LOGISTICS_TRUCK").length;
    const armored = gv.filter((v) => v.type === "ARMORED_TRANSPORT").length;
    return {
      baseId: b.id,
      baseName: b.name,
      bowsers, trucks, armored,
      bowserCapacityLiters: bowsers * BOWSER_LITERS_PER_RUN,
    };
  });
}

/**
 * "Best convoy right now" — donor base with healthiest fuel + bowsers,
 * delivering to acceptor base with lowest fuel %. Returns null if no useful move.
 */
export interface SuggestedConvoy {
  donor: BaseType;
  acceptor: BaseType;
  bowsersAvailable: number;
  liters: number;
  /** DOS gain at acceptor in days. */
  dosGainDays: number;
  /** DOS cost at donor in days. */
  dosCostDays: number;
}

export function suggestBestConvoy(state: GameState): SuggestedConvoy | null {
  const phase = state.phase;
  const fuelDailyDrop = FUEL_BURN_PCT_PER_HOUR[phase] * 24;
  const fleet = fleetAllocationPerBase(state);
  const snaps = state.bases.map((b) => snapshotBase(b, phase));

  const donorCandidates = fleet
    .filter((f) => f.bowsers > 0)
    .map((f) => ({ ...f, snap: snaps.find((s) => s.baseId === f.baseId)! }))
    .filter((f) => f.snap.fuelPct >= 60)
    .sort((a, b) => b.snap.fuelPct - a.snap.fuelPct);
  const acceptor = [...snaps].sort((a, b) => a.fuelPct - b.fuelPct)[0];
  if (donorCandidates.length === 0 || !acceptor) return null;
  const donor = donorCandidates.find((d) => d.baseId !== acceptor.baseId);
  if (!donor) return null;
  if (donor.snap.fuelPct - acceptor.fuelPct < 15) return null;

  const liters = donor.bowsers * BOWSER_LITERS_PER_RUN;
  const pctTransfer = liters / 800; // inverse of L = pct * 800 in this sim
  const dosGainDays = pctTransfer / fuelDailyDrop;
  const dosCostDays = pctTransfer / fuelDailyDrop;

  return {
    donor: donor.baseId,
    acceptor: acceptor.baseId,
    bowsersAvailable: donor.bowsers,
    liters,
    dosGainDays,
    dosCostDays,
  };
}
