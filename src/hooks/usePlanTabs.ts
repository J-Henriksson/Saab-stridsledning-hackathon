import { useState, useCallback, useEffect } from "react";
import type { GameState, GameAction } from "@/types/game";
import { createAirDefenseUnit, createRadarUnit, createDeployedDroneUnit, createGroundVehicleUnit } from "@/core/units/factory";
import { uuid } from "@/core/uuid";

// ── Delay types ───────────────────────────────────────────────────────────────

export interface DelaySpec {
  value: number;
  unit: "minutes" | "hours" | "days" | "weeks";
}

export function delayToLabel(d: DelaySpec | null): string {
  if (!d) return "Omedelbart";
  const labels: Record<DelaySpec["unit"], [string, string]> = {
    minutes: ["minut", "minuter"],
    hours:   ["timme", "timmar"],
    days:    ["dag",   "dagar"],
    weeks:   ["vecka", "veckor"],
  };
  const [sing, plur] = labels[d.unit];
  return `Om ${d.value} ${d.value === 1 ? sing : plur}`;
}

export function delayToMs(d: DelaySpec): number {
  const ms: Record<DelaySpec["unit"], number> = {
    minutes: 60_000,
    hours:   3_600_000,
    days:    86_400_000,
    weeks:   604_800_000,
  };
  return d.value * ms[d.unit];
}

// ── Plan tab ──────────────────────────────────────────────────────────────────

export interface AiRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  implemented: boolean;
}

export interface PlanTab {
  id: string;
  name: string;
  snapshot: GameState;
  createdAt: number;
  updatedAt: number;
  delays: Record<string, DelaySpec | null>;
  description?: string;
  aiRecommendations?: AiRecommendation[];
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "road2air-plan-tabs-v2";
const MAX_TABS = 8;

function loadFromStorage(): PlanTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlanTab[];
    return parsed.map((t) => ({ ...t, delays: t.delays ?? {} }));
  } catch {
    return [];
  }
}

function saveToStorage(tabs: PlanTab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {}
}

// ── Empty plan state (starts fresh — only the permanent base infrastructure) ──

function createEmptyPlanState(liveState: GameState): GameState {
  return {
    ...liveState,
    enemyBases: [],
    enemyEntities: [],
    friendlyMarkers: [],
    friendlyEntities: [],
    roadBases: [],
    deployedUnits: [],
    atoOrders: [],
    tacticalZones: [],
    events: [],
    isRunning: false,
    gameSpeed: 0,
  };
}

// ── Pre-built "protect ammo" plan ────────────────────────────────────────────
//
// Ammo depot coords (from fixedAssets):
//   AMMO_ENKOPING  59.635, 17.077
//   AMMO_EKSJO     57.664, 14.974
//
// The plan intentionally has NO vägbas so the AI review flags it.

function buildProtectAmmoTab(liveState: GameState): PlanTab {
  const base = createEmptyPlanState(liveState);

  // ── ENKÖPING DEPOT defense ring ──────────────────────────────────────────
  const enkLv1 = createAirDefenseUnit({
    name: "LV-REK-1", position: { lat: 59.720, lng: 16.890 }, currentBase: "MOB",
    type: "SAM_LONG", id: uuid(),
  });
  const enkLv2 = createAirDefenseUnit({
    name: "LV-REK-2", position: { lat: 59.710, lng: 17.260 }, currentBase: "MOB",
    type: "SAM_MEDIUM", id: uuid(),
  });
  const enkLv3 = createAirDefenseUnit({
    name: "LV-REK-3", position: { lat: 59.560, lng: 16.950 }, currentBase: "MOB",
    type: "SAM_SHORT", id: uuid(),
  });
  const enkLv4 = createAirDefenseUnit({
    name: "LV-REK-4", position: { lat: 59.590, lng: 17.280 }, currentBase: "MOB",
    type: "SAM_SHORT", id: uuid(),
  });
  const enkRadar1 = createRadarUnit({
    name: "PS-890-ENK-A", position: { lat: 59.700, lng: 17.150 }, currentBase: "MOB",
    type: "SEARCH_RADAR", id: uuid(),
  });
  const enkRadar2 = createRadarUnit({
    name: "PS-701-ENK-B", position: { lat: 59.640, lng: 17.000 }, currentBase: "MOB",
    type: "TRACKING_RADAR", id: uuid(),
  });
  const enkArmor = createGroundVehicleUnit({
    name: "CV90-ENK-1", position: { lat: 59.627, lng: 17.060 }, currentBase: "MOB",
    type: "ARMORED_TRANSPORT", id: uuid(),
  });
  const enkLogistics = createGroundVehicleUnit({
    name: "LOG-ENK-1", position: { lat: 59.648, lng: 17.095 }, currentBase: "MOB",
    type: "LOGISTICS_TRUCK", id: uuid(),
  });

  // ── EKSJÖ DEPOT defense ring ─────────────────────────────────────────────
  const eksLv1 = createAirDefenseUnit({
    name: "LV-EKS-1", position: { lat: 57.780, lng: 14.800 }, currentBase: "FOB_S",
    type: "SAM_LONG", id: uuid(),
  });
  const eksLv2 = createAirDefenseUnit({
    name: "LV-EKS-2", position: { lat: 57.730, lng: 14.870 }, currentBase: "FOB_S",
    type: "SAM_MEDIUM", id: uuid(),
  });
  const eksLv3 = createAirDefenseUnit({
    name: "LV-EKS-3", position: { lat: 57.600, lng: 15.100 }, currentBase: "FOB_S",
    type: "SAM_SHORT", id: uuid(),
  });
  const eksLv4 = createAirDefenseUnit({
    name: "LV-EKS-4", position: { lat: 57.700, lng: 15.150 }, currentBase: "FOB_S",
    type: "SAM_SHORT", id: uuid(),
  });
  const eksRadar1 = createRadarUnit({
    name: "PS-890-EKS-A", position: { lat: 57.720, lng: 14.950 }, currentBase: "FOB_S",
    type: "SEARCH_RADAR", id: uuid(),
  });
  const eksRadar2 = createRadarUnit({
    name: "PS-701-EKS-B", position: { lat: 57.650, lng: 15.050 }, currentBase: "FOB_S",
    type: "TRACKING_RADAR", id: uuid(),
  });
  const eksArmor = createGroundVehicleUnit({
    name: "CV90-EKS-1", position: { lat: 57.660, lng: 14.965 }, currentBase: "FOB_S",
    type: "ARMORED_TRANSPORT", id: uuid(),
  });
  const eksFuel = createGroundVehicleUnit({
    name: "FUEL-EKS-1", position: { lat: 57.678, lng: 15.002 }, currentBase: "FOB_S",
    type: "FUEL_BOWSER", id: uuid(),
  });

  // ── ISR drones: corridor + both depots ───────────────────────────────────
  const droneCorr = createDeployedDroneUnit({
    name: "SKYM-15-KORR", position: { lat: 58.650, lng: 16.000 }, currentBase: "MOB",
    type: "ISR_DRONE", id: uuid(),
  });
  const droneEnk = createDeployedDroneUnit({
    name: "SKYM-16-ENK", position: { lat: 59.550, lng: 17.200 }, currentBase: "MOB",
    type: "ISR_DRONE", id: uuid(),
  });
  const droneEks = createDeployedDroneUnit({
    name: "SKYM-17-EKS", position: { lat: 57.500, lng: 15.200 }, currentBase: "FOB_S",
    type: "ISR_DRONE", id: uuid(),
  });

  // ── Road bases ────────────────────────────────────────────────────────────
  const roadBaseEnk: import("@/types/game").RoadBase = {
    id: uuid(), name: "ROB-ENK-21", status: "Operativ", echelon: "Platoon",
    parentBaseId: "MOB", isDraggable: true, rangeRadius: 25,
    coords: { lat: 59.580, lng: 17.030 }, createdAt: Date.now(),
  };
  const roadBaseEks: import("@/types/game").RoadBase = {
    id: uuid(), name: "ROB-EKS-14", status: "Operativ", echelon: "Platoon",
    parentBaseId: "FOB_S", isDraggable: true, rangeRadius: 20,
    coords: { lat: 57.740, lng: 15.120 }, createdAt: Date.now(),
  };

  // ── Enemy threats ─────────────────────────────────────────────────────────
  const enemyAirfield = {
    id: uuid(), name: "RU-AFB-ÖLAND", category: "airfield" as const,
    threatLevel: "high" as const, operationalStatus: "active" as const,
    estimates: "~12 Su-35S, stridsberedskap bekräftad",
    notes: "Aktiv verksamhet observerad, start- och landningsrörelser dagligen",
    threatRangeKm: 0, coords: { lat: 57.200, lng: 17.800 },
  };
  const enemySamSite = {
    id: uuid(), name: "RU-SAM-GOTLAND", category: "sam_site" as const,
    threatLevel: "high" as const, operationalStatus: "active" as const,
    estimates: "S-400 batteri, 4 uppskjutningsramper aktiva",
    notes: "Täcker hela Östersjön. Omöjliggör direkt luftrörelsestöd utan SEAD-eskort.",
    threatRangeKm: 0, coords: { lat: 57.500, lng: 18.500 },
  };
  const enemyCommand = {
    id: uuid(), name: "RU-LEDNING-KALMAR", category: "command" as const,
    threatLevel: "medium" as const, operationalStatus: "suspected" as const,
    estimates: "Regional ledningscentral, förmodad mobilenhet",
    notes: "ELINT-signatur bekräftad. COMINT indikerar samordning med luftstyrkor.",
    threatRangeKm: 0, coords: { lat: 56.700, lng: 16.350 },
  };
  const enemyFighter = {
    id: uuid(), name: "RU-SU-35-FLT-ALFA", category: "fighter" as const,
    threatLevel: "high" as const, operationalStatus: "active" as const,
    estimates: "4-6 enheter i roterande tjänstgöring",
    notes: "Observerad rörelse mot väst vid 18 000 m höjd. Trolig underrättelseinsamling.",
    coords: { lat: 58.500, lng: 20.500 },
  };
  const enemyMissile = {
    id: uuid(), name: "RU-KALIBER-FARTYG", category: "ship" as const,
    threatLevel: "high" as const, operationalStatus: "active" as const,
    estimates: "1 Kalibr-bestyckad korvett, Gepard-klass",
    notes: "Rörelsemönster indikerar möjlig uppskjutningsposition om <48 h.",
    coords: { lat: 56.000, lng: 19.500 },
  };

  const snapshot: GameState = {
    ...base,
    deployedUnits: [
      enkLv1, enkLv2, enkLv3, enkLv4, enkRadar1, enkRadar2, enkArmor, enkLogistics,
      eksLv1, eksLv2, eksLv3, eksLv4, eksRadar1, eksRadar2, eksArmor, eksFuel,
      droneCorr, droneEnk, droneEks,
    ],
    roadBases: [roadBaseEnk],
    enemyBases: [enemyAirfield, enemyCommand],
    enemyEntities: [enemyFighter, enemyMissile],
  };

  return {
    id: "plan-protect-ammo",
    name: "Skydda ammodepo",
    snapshot,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    delays: {},
    description:
      "Defensivt skyddsuppdrag för kritisk ammunitionsinfrastruktur vid Enköping och Eksjö. " +
      "Planläget inkluderar tvåskiktat luftvärn (lång- och kortdistans), radartäckning, " +
      "ISR-bevakning av korridor och depåer, logistikfordon samt vägbastöd. " +
      "Prioritet: säkerställa att båda depåerna förblir operativa under hela konfliktfasen.",
    aiRecommendations: [
      {
        id: "ai-rec-1",
        title: "Förstärk SAM-täckning NÖ om Enköping",
        description:
          "Hotanalys (konfidens 87%) indikerar sannolik anfallsvektor nordöst om Enköping. " +
          "Placering av ytterligare SAM_LONG-batteri vid 59.800N/17.200E minskar exploaterbar " +
          "korridor med 73% och ger överlappande täckning med befintlig LV-REK-1.",
        priority: "high",
        implemented: false,
      },
      {
        id: "ai-rec-2",
        title: "Etablera vägbas längs E4 – sektor OSCAR",
        description:
          "Logistikflödessimulering (10 000 iterationer) visar kritisk sårbarhet vid E4/väg 55-korsningen. " +
          "ROB-placering vid sektor OSCAR möjliggör alternativ förstärkningsväg vid avbrott på primärled " +
          "och reducerar genomsnittlig responstid med 34 minuter.",
        priority: "high",
        implemented: false,
      },
      {
        id: "ai-rec-3",
        title: "Utöka ISR-täckning mot Gotland",
        description:
          "Övervakningsgap identifierat i sektor BRAVO (56–57°N, 17–19°E). " +
          "Tillägg av ISR-drönare med SIGINT-last vid Gotlandssundet ger 18+ timmar förvarning " +
          "vid potentiell missilavfyrning eller luftlandsättning.",
        priority: "medium",
        implemented: false,
      },
      {
        id: "ai-rec-4",
        title: "Koordinera ASW-resurser mot RU-KALIBER-FARTYG",
        description:
          "Rörelseanalys av RU-KALIBER-FARTYG indikerar möjlig uppskjutningsposition om <48 timmar. " +
          "Samordning med Marinens ASW-helikoptrar (HKP 14) och ubåtar rekommenderas omedelbart " +
          "för att reducera hotfönstret.",
        priority: "medium",
        implemented: false,
      },
      {
        id: "ai-rec-5",
        title: "SEAD-planläggning mot RU-SAM-GOTLAND",
        description:
          "S-400-batteriet vid Gotland förhindrar fri rörelsefrihet i Östersjöluftrummet. " +
          "Planlägg SEAD-uppdrag (HARM + elektronisk störning) för att skapa ett temporärt " +
          "åtkomstfönster vid behov av lufttransport eller förstärkning.",
        priority: "low",
        implemented: false,
      },
    ],
  };
}

// ── Execution ─────────────────────────────────────────────────────────────────

/** Dispatch all planned entities to the live state, respecting any configured delays. */
export function executePlan(tab: PlanTab, dispatch: (action: GameAction) => void): void {
  const s = tab.snapshot;

  function schedule(entityId: string, action: GameAction): void {
    const delay = tab.delays[entityId] ?? null;
    if (!delay) {
      dispatch(action);
    } else {
      setTimeout(() => dispatch(action), delayToMs(delay));
    }
  }

  for (const eb of s.enemyBases) {
    schedule(eb.id, {
      type: "PLAN_ADD_ENEMY_BASE",
      base: {
        name: eb.name, category: eb.category, threatLevel: eb.threatLevel,
        operationalStatus: eb.operationalStatus, estimates: eb.estimates,
        notes: eb.notes, threatRangeKm: eb.threatRangeKm, coords: eb.coords,
      },
    });
  }
  for (const ee of s.enemyEntities) {
    schedule(ee.id, {
      type: "PLAN_ADD_ENEMY_ENTITY",
      entity: {
        name: ee.name, category: ee.category, threatLevel: ee.threatLevel,
        operationalStatus: ee.operationalStatus, estimates: ee.estimates,
        notes: ee.notes, coords: ee.coords,
      },
    });
  }
  for (const fm of s.friendlyMarkers) {
    schedule(fm.id, {
      type: "PLAN_ADD_FRIENDLY_MARKER",
      marker: {
        name: fm.name, category: fm.category, estimates: fm.estimates,
        notes: fm.notes, coords: fm.coords,
      },
    });
  }
  for (const unit of s.deployedUnits.filter((u) => u.affiliation === "friend")) {
    schedule(unit.id, { type: "PLAN_ADD_FRIENDLY_UNIT", unit });
  }
  for (const rb of s.roadBases) {
    schedule(rb.id, {
      type: "PLAN_ADD_ROAD_BASE",
      roadBase: {
        name: rb.name, status: rb.status, echelon: rb.echelon,
        parentBaseId: rb.parentBaseId, isDraggable: rb.isDraggable,
        rangeRadius: rb.rangeRadius, coords: rb.coords,
      },
    });
  }
}

// ── Text export ───────────────────────────────────────────────────────────────

export function generatePlanSummary(tab: PlanTab): string {
  const { snapshot: s, name } = tab;
  const lines: string[] = [];

  lines.push(`=== PLANLÄGE: ${name} ===`);
  lines.push(`Exporterat: ${new Date(tab.updatedAt).toLocaleString("sv-SE")}`);
  lines.push(`Scenariotid: Dag ${s.day}, ${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}, Fas: ${s.phase}`);
  lines.push("");

  lines.push("VÄNLIGA BASER:");
  for (const base of s.bases) {
    const ac = base.units.filter((u) => u.category === "aircraft");
    const mc = ac.filter((u) => (u as any).status === "ready").length;
    lines.push(`• ${base.id} (${base.name}) — ${mc}/${ac.length} MC, Bränsle ${Math.round(base.fuel)}%, ${base.maintenanceBays.total} underhållsplatser`);
    for (const ammo of base.ammunition) {
      lines.push(`  Ammunition ${ammo.type}: ${ammo.quantity}/${ammo.max}`);
    }
  }
  lines.push("");

  if (s.friendlyMarkers.length > 0) {
    lines.push("PLANLAGDA VÄNLIGA POSITIONER:");
    for (const m of s.friendlyMarkers) {
      const delay = tab.delays[m.id];
      lines.push(`• ${m.name} (${m.category}) @ ${m.coords.lat.toFixed(3)}, ${m.coords.lng.toFixed(3)}${delay ? " — " + delayToLabel(delay) : ""}`);
      if (m.estimates) lines.push(`  Styrka: ${m.estimates}`);
      if (m.notes) lines.push(`  Notering: ${m.notes}`);
    }
    lines.push("");
  }

  if (s.roadBases.length > 0) {
    lines.push("VÄGBASER:");
    for (const rb of s.roadBases) {
      const delay = tab.delays[rb.id];
      lines.push(`• ${rb.name} (${rb.echelon}, ${rb.status}) @ ${rb.coords.lat.toFixed(3)}, ${rb.coords.lng.toFixed(3)}, räckvidd ${rb.rangeRadius} km${delay ? " — " + delayToLabel(delay) : ""}`);
    }
    lines.push("");
  }

  if (s.deployedUnits.filter((u) => u.affiliation === "friend").length > 0) {
    lines.push("DEPLOYERADE VÄNLIGA ENHETER:");
    for (const u of s.deployedUnits.filter((u) => u.affiliation === "friend")) {
      const delay = tab.delays[u.id];
      lines.push(`• ${u.name} (${u.category}) @ ${u.position.lat.toFixed(3)}, ${u.position.lng.toFixed(3)}, hemabas: ${u.currentBase ?? u.lastBase ?? "—"}${delay ? " — " + delayToLabel(delay) : ""}`);
    }
    lines.push("");
  }

  if (s.enemyBases.length > 0) {
    lines.push("FIENDEPOSITIONER — BASER:");
    for (const eb of s.enemyBases) {
      const threat = { high: "HÖG HOT", medium: "MEDEL HOT", low: "LÅGT HOT", unknown: "OKÄND HOT" }[eb.threatLevel];
      const status = { active: "Aktiv", suspected: "Misstänkt", destroyed: "Neutraliserad", unknown: "Okänd" }[eb.operationalStatus];
      const delay = tab.delays[eb.id];
      lines.push(`• ${eb.name} (${eb.category}, ${threat}, ${status}) @ ${eb.coords.lat.toFixed(3)}, ${eb.coords.lng.toFixed(3)}${delay ? " — " + delayToLabel(delay) : ""}`);
      if ((eb.threatRangeKm ?? 0) > 0) lines.push(`  Hotzon: ${eb.threatRangeKm} km ring`);
      if (eb.estimates) lines.push(`  Styrka: ${eb.estimates}`);
      if (eb.notes) lines.push(`  Underrättelse: ${eb.notes}`);
    }
    lines.push("");
  }

  if (s.enemyEntities.length > 0) {
    lines.push("FIENDEPOSITIONER — ENHETER:");
    for (const ee of s.enemyEntities) {
      const threat = { high: "HÖG HOT", medium: "MEDEL HOT", low: "LÅGT HOT", unknown: "OKÄND HOT" }[ee.threatLevel];
      const delay = tab.delays[ee.id];
      lines.push(`• ${ee.name} (${ee.category}, ${threat}) @ ${ee.coords.lat.toFixed(3)}, ${ee.coords.lng.toFixed(3)}${delay ? " — " + delayToLabel(delay) : ""}`);
      if (ee.estimates) lines.push(`  Styrka: ${ee.estimates}`);
      if (ee.notes) lines.push(`  Notering: ${ee.notes}`);
    }
    lines.push("");
  }

  if (s.atoOrders.length > 0) {
    lines.push("ATO-UPPDRAG:");
    const byDay: Record<number, typeof s.atoOrders> = {};
    for (const o of s.atoOrders) {
      (byDay[o.day] ??= []).push(o);
    }
    for (const day of Object.keys(byDay).map(Number).sort()) {
      lines.push(`  Dag ${day}:`);
      for (const o of byDay[day]) {
        const prio = { high: "HÖG", medium: "MEDEL", low: "LÅG" }[o.priority];
        const ph = o.isPlaceholder ? ` [PLACEHOLDER, aktiveras Dag ${o.activationDay} ${String(o.activationHour ?? 0).padStart(2, "0")}:00]` : "";
        lines.push(`  • ${o.missionType}${o.missionCallsign ? ` — ${o.missionCallsign}` : ""} (${prio}), ${String(o.startHour).padStart(2, "0")}:00–${String(o.endHour).padStart(2, "0")}:00, ${o.requiredCount}× ${o.aircraftType ?? "valfritt"} från ${o.launchBase}${ph}`);
        if (o.label) lines.push(`    Uppdrag: ${o.label}`);
        if (o.destinationName) lines.push(`    Målområde: ${o.destinationName}`);
      }
    }
    lines.push("");
  }

  if (s.tacticalZones.length > 0) {
    lines.push("TAKTISKA ZONER:");
    for (const z of s.tacticalZones) {
      lines.push(`• ${z.name} (${z.kind})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlanTabs(liveState: GameState) {
  const [tabs, setTabs] = useState<PlanTab[]>(() => loadFromStorage());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Always rebuild the ammo plan from source (discards any stale localStorage copy).
  useEffect(() => {
    if (seeded) return;
    setSeeded(true);
    setTabs((prev) => {
      const withoutAmmo = prev.filter((t) => t.id !== "plan-protect-ammo");
      return [buildProtectAmmoTab(liveState), ...withoutAmmo];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveToStorage(tabs);
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const createTab = useCallback(
    (name?: string): string | null => {
      if (tabs.length >= MAX_TABS) return null;
      const id = `plan-${Date.now()}`;
      const tab: PlanTab = {
        id,
        name: name ?? `Plan ${tabs.length + 1}`,
        snapshot: createEmptyPlanState(liveState),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        delays: {},
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
      return id;
    },
    [tabs.length, liveState],
  );

  const updateActiveSnapshot = useCallback(
    (state: GameState) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, snapshot: state, updatedAt: Date.now() } : t,
        ),
      );
    },
    [activeTabId],
  );

  const renameTab = useCallback((id: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const deleteTab = useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setActiveTabId((prev) => (prev === id ? null : prev));
  }, []);

  const switchTab = useCallback((id: string | null) => {
    setActiveTabId(id);
  }, []);

  const setDelay = useCallback(
    (entityId: string, delay: DelaySpec | null) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, delays: { ...t.delays, [entityId]: delay } }
            : t,
        ),
      );
    },
    [activeTabId],
  );

  return {
    tabs, activeTabId, activeTab,
    createTab, updateActiveSnapshot,
    renameTab, deleteTab, switchTab, setDelay,
  };
}
