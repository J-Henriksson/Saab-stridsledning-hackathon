import { useState, useCallback, useEffect } from "react";
import type { GameState } from "@/types/game";

export interface PlanTab {
  id: string;
  name: string;
  snapshot: GameState;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "road2air-plan-tabs";
const MAX_TABS = 8;

function loadFromStorage(): PlanTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlanTab[];
  } catch {
    return [];
  }
}

function saveToStorage(tabs: PlanTab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore quota errors
  }
}

/** Generates a plain-text AI-readable summary of a plan snapshot. */
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
      lines.push(`• ${m.name} (${m.category}) @ ${m.coords.lat.toFixed(3)}, ${m.coords.lng.toFixed(3)}`);
      if (m.estimates) lines.push(`  Styrka: ${m.estimates}`);
      if (m.notes) lines.push(`  Notering: ${m.notes}`);
    }
    lines.push("");
  }

  if (s.roadBases.length > 0) {
    lines.push("VÄGBASER:");
    for (const rb of s.roadBases) {
      lines.push(`• ${rb.name} (${rb.echelon}, ${rb.status}) @ ${rb.coords.lat.toFixed(3)}, ${rb.coords.lng.toFixed(3)}, räckvidd ${rb.rangeRadius} km`);
    }
    lines.push("");
  }

  if (s.deployedUnits.filter((u) => u.affiliation === "friend").length > 0) {
    lines.push("DEPLOYERADE VÄNLIGA ENHETER:");
    for (const u of s.deployedUnits.filter((u) => u.affiliation === "friend")) {
      lines.push(`• ${u.name} (${u.category}) @ ${u.position.lat.toFixed(3)}, ${u.position.lng.toFixed(3)}, hemabas: ${u.currentBase ?? u.lastBase ?? "—"}`);
    }
    lines.push("");
  }

  if (s.enemyBases.length > 0) {
    lines.push("FIENDEPOSITIONER — BASER:");
    for (const eb of s.enemyBases) {
      const threat = { high: "HÖG HOT", medium: "MEDEL HOT", low: "LÅGT HOT", unknown: "OKÄND HOT" }[eb.threatLevel];
      const status = { active: "Aktiv", suspected: "Misstänkt", destroyed: "Neutraliserad", unknown: "Okänd" }[eb.operationalStatus];
      lines.push(`• ${eb.name} (${eb.category}, ${threat}, ${status}) @ ${eb.coords.lat.toFixed(3)}, ${eb.coords.lng.toFixed(3)}`);
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
      lines.push(`• ${ee.name} (${ee.category}, ${threat}) @ ${ee.coords.lat.toFixed(3)}, ${ee.coords.lng.toFixed(3)}`);
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

export function usePlanTabs(liveState: GameState) {
  const [tabs, setTabs] = useState<PlanTab[]>(() => loadFromStorage());
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

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
        snapshot: structuredClone(liveState),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(id);
      return id;
    },
    [tabs.length, liveState]
  );

  const updateActiveSnapshot = useCallback(
    (state: GameState) => {
      if (!activeTabId) return;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, snapshot: state, updatedAt: Date.now() } : t
        )
      );
    },
    [activeTabId]
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

  return { tabs, activeTabId, activeTab, createTab, updateActiveSnapshot, renameTab, deleteTab, switchTab };
}
