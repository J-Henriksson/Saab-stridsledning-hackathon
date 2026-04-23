import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import MapGL, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, PenLine, Crosshair, Swords } from "lucide-react";

import { BASE_COORDS, SWEDEN_CENTER, INITIAL_ZOOM, MAP_STYLE } from "./map/constants";
import { SelectedEntity } from "./map/helpers";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftLayer } from "./map/AircraftLayer";
import { BaseDetailPanel } from "./map/BaseDetailPanel";
import { AircraftDetailPanel } from "./map/AircraftDetailPanel";
import { WindLayer } from "./map/WindLayer";
import { PlanModeSidebar, PlacingPayload, PlacingKind } from "./map/PlanModeSidebar";
import { EnemyMarker } from "./map/EnemyMarker";
import { EnemyEntityMarker } from "./map/EnemyEntityMarker";
import { FriendlyMarkerPin, FriendlyEntityPin } from "./map/FriendlyPlanMarker";
import { EnemyBaseDetailPanel, EnemyEntityDetailPanel } from "./map/EnemyDetailPanel";
import { UnitsLayer } from "./map/UnitsLayer";
import { UnitDetailPanel } from "./map/UnitDetailPanel";
import { Base, AircraftStatus } from "@/types/game";
import { getAircraft } from "@/core/units/helpers";

interface PlacingMode {
  kind: PlacingKind;
  data: Record<string, string>;
}

const PLACING_LABEL: Record<PlacingKind, string> = {
  friendly_base:   "vänlig bas",
  friendly_entity: "vänlig enhet",
  enemy_base:      "fiendens bas",
  enemy_entity:    "fiendens enhet",
};

export default function MapPage() {
  const { state, togglePause, setGameSpeed, resetGame, dispatch } = useGame();
  const location = useLocation();
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [placingMode, setPlacingMode] = useState<PlacingMode | null>(null);
  const mapRef = useRef<MapRef>(null);
  const isFollowing = useRef(false);
  const followStartTime = useRef<number | null>(null);

  // Pre-select aircraft when navigated here from basöversikt
  useEffect(() => {
    const s = location.state as { aircraftId?: string; baseId?: string } | null;
    if (s?.aircraftId && s?.baseId) {
      setSelected({ kind: "aircraft", baseId: s.baseId, aircraftId: s.aircraftId });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allUnits = useMemo(
    () => [...state.bases.flatMap((b) => b.units), ...state.deployedUnits],
    [state.bases, state.deployedUnits]
  );

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  const selectedAircraft =
    selected?.kind === "aircraft"
      ? (selectedBase ? getAircraft(selectedBase).find((a) => a.id === selected.aircraftId) : undefined)
      : undefined;

  const selectedEnemyBase =
    selected?.kind === "enemy_base"
      ? state.enemyBases.find((b) => b.id === selected.id)
      : undefined;

  const selectedEnemyEntity =
    selected?.kind === "enemy_entity"
      ? state.enemyEntities.find((e) => e.id === selected.id)
      : undefined;

  const selectedAircraftId = selected?.kind === "aircraft" ? selected.aircraftId : undefined;

  const selectedUnit = selected?.kind === "unit"
    ? allUnits.find((u) => u.id === selected.unitId)
    : undefined;

  useEffect(() => {
    isFollowing.current = false;
    followStartTime.current = null;
  }, [selectedAircraftId]);

  const handlePositionUpdate = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const now = performance.now();
    if (!followStartTime.current) {
      followStartTime.current = now;
      isFollowing.current = true;
      map.flyTo({ center: [lng, lat], zoom: 12, duration: 900, pitch: 30 });
      return;
    }
    if (now - followStartTime.current < 1000) return;
    map.easeTo({ center: [lng, lat], duration: 150 });
  }, []);

  const handleRecall = useCallback(() => {
    if (selected?.kind !== "aircraft") return;
    dispatch({
      type: "COMPLETE_LANDING_CHECK",
      baseId: selected.baseId as import("@/types/game").BaseType,
      aircraftId: selected.aircraftId,
      sendToMaintenance: false,
    });
  }, [selected, dispatch]);

  const handleStartPlacement = useCallback((payload: PlacingPayload) => {
    setPlacingMode(payload);
    setSelected(null);
  }, []);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (placingMode && e.lngLat) {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const d = placingMode.data;
      switch (placingMode.kind) {
        case "enemy_base":
          dispatch({ type: "PLAN_ADD_ENEMY_BASE", base: { name: d.name, category: d.category as any, threatLevel: d.threatLevel as any, operationalStatus: d.operationalStatus as any, estimates: d.estimates ?? "", notes: d.notes ?? "", coords } });
          break;
        case "enemy_entity":
          dispatch({ type: "PLAN_ADD_ENEMY_ENTITY", entity: { name: d.name, category: d.category as any, threatLevel: d.threatLevel as any, operationalStatus: d.operationalStatus as any, estimates: d.estimates ?? "", notes: d.notes ?? "", coords } });
          break;
        case "friendly_base":
          dispatch({ type: "PLAN_ADD_FRIENDLY_MARKER", marker: { name: d.name, category: d.category as any, estimates: d.estimates ?? "", notes: d.notes ?? "", coords } });
          break;
        case "friendly_entity":
          dispatch({ type: "PLAN_ADD_FRIENDLY_ENTITY", entity: { name: d.name, category: d.category as any, notes: d.notes ?? "", coords } });
          break;
      }
      setPlacingMode(null);
      return;
    }
    setSelected(null);
  }, [placingMode, dispatch]);

  // Panel header content
  const panelTitle = (() => {
    if (selectedAircraft) return { main: selectedAircraft.tailNumber, sub: `${selectedAircraft.type} · ${selectedBase?.name}` };
    if (selected?.kind === "base") return { main: selectedBase?.name ?? selected.baseId, sub: selectedBase?.type ?? "Reservbas" };
    if (selected?.kind === "enemy_base" && selectedEnemyBase) return { main: selectedEnemyBase.name, sub: "Fiendens bas" };
    if (selected?.kind === "enemy_entity" && selectedEnemyEntity) return { main: selectedEnemyEntity.name, sub: "Fiendens enhet" };
    return null;
  })();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onTogglePause={togglePause} onSetSpeed={setGameSpeed} onReset={resetGame} />

      {/* Sub-header */}
      <div className="border-b border-border bg-card px-6 py-2.5 flex items-center gap-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">
          TAKTISK KARTA — FLYGBASGRUPP
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground ml-2">
          Dag {state.day} · Fas: {state.phase}
        </span>
        <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-green inline-block" /> Hög beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-yellow inline-block" /> Medel beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-red inline-block" /> Låg beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Inaktiv bas</span>
          <button
            onClick={() => { setIsPlanMode((v) => !v); setPlacingMode(null); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border font-bold transition-all ${
              isPlanMode
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            PLANLÄGE {isPlanMode ? "PÅ" : "AV"}
          </button>
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* Plan mode sidebar */}
        <AnimatePresence>
          {isPlanMode && (
            <motion.div
              key="plan-sidebar"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[300px] flex-shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col"
            >
              <PlanModeSidebar
                state={state}
                dispatch={dispatch}
                onStartPlacement={handleStartPlacement}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map area */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ cursor: placingMode ? "crosshair" : undefined }}
        >
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: BASE_COORDS.MOB.lng,
              latitude: BASE_COORDS.MOB.lat,
              zoom: 9,
              pitch: 30,
            }}
            mapStyle={MAP_STYLE}
            onClick={handleMapClick}
            onDragStart={() => { isFollowing.current = false; followStartTime.current = null; }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            <SupplyLinesLayer bases={state.bases} />
            <AircraftLayer
              bases={state.bases}
              currentHour={state.hour}
              onSelectAircraft={(baseId, aircraftId) =>
                setSelected({ kind: "aircraft", baseId, aircraftId })
              }
              selectedAircraftId={selectedAircraftId}
              onPositionUpdate={selectedAircraftId ? handlePositionUpdate : undefined}
            />

            <UnitsLayer
              units={allUnits}
              onSelectUnit={(unitId) => setSelected({ kind: "unit", unitId })}
              selectedUnitId={selected?.kind === "unit" ? selected.unitId : null}
            />

            {Object.keys(BASE_COORDS).map((id) => (
              <BaseMarker
                key={id}
                id={id}
                base={state.bases.find((b) => b.id === id)}
                isSelected={
                  (selected?.kind === "base" || selected?.kind === "aircraft") && selected.baseId === id
                }
                onClick={() => setSelected({ kind: "base", baseId: id })}
              />
            ))}

            {state.enemyBases.map((eb) => (
              <EnemyMarker
                key={eb.id}
                base={eb}
                isSelected={selected?.kind === "enemy_base" && selected.id === eb.id}
                onClick={() => setSelected({ kind: "enemy_base", id: eb.id })}
              />
            ))}
            {state.enemyEntities.map((ee) => (
              <EnemyEntityMarker
                key={ee.id}
                entity={ee}
                isSelected={selected?.kind === "enemy_entity" && selected.id === ee.id}
                onClick={() => setSelected({ kind: "enemy_entity", id: ee.id })}
              />
            ))}
            {state.friendlyMarkers.map((fm) => (
              <FriendlyMarkerPin key={fm.id} marker={fm} />
            ))}
            {state.friendlyEntities.map((fe) => (
              <FriendlyEntityPin key={fe.id} entity={fe} />
            ))}
          </MapGL>

          {/* Placement mode banner */}
          {placingMode && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pointer-events-none">
              <div className="mt-4 px-4 py-2 bg-amber-500/20 border border-amber-500/60 rounded font-mono text-xs text-amber-400 flex items-center gap-3">
                <span>Klicka på kartan för att placera {PLACING_LABEL[placingMode.kind]}</span>
                <button
                  className="underline pointer-events-auto hover:text-amber-300"
                  onClick={() => setPlacingMode(null)}
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {/* Wind particle flow field — paused in plan mode */}
          <WindLayer active={!isPlanMode} />

          {/* Scanline CRT overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />

          {/* Active aircraft bar */}
          <ActiveAircraftBar
            bases={state.bases}
            selectedAircraftId={selectedAircraftId}
            onSelect={(baseId, aircraftId) => setSelected({ kind: "aircraft", baseId, aircraftId })}
          />
        </div>

        {/* Detail panel — friendly base/aircraft or enemy */}
        <AnimatePresence>
          {selected && panelTitle && (
            <motion.div
              key="detail"
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[340px] flex-shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col"
            >
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  {selectedUnit ? (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedUnit.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{selectedUnit.category} · {selectedUnit.affiliation}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        {(selected?.kind === "enemy_base" || selected?.kind === "enemy_entity") && (
                          selected.kind === "enemy_base"
                            ? <Crosshair className="h-3.5 w-3.5 text-red-400" />
                            : <Swords className="h-3.5 w-3.5 text-red-300" />
                        )}
                        <div className="text-xs font-bold text-foreground font-mono">{panelTitle?.main}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">{panelTitle?.sub}</div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedUnit ? (
                <UnitDetailPanel
                  unit={selectedUnit}
                  isAtBase={state.bases.some((b) => b.units.some((u) => u.id === selectedUnit.id))}
                  allBases={state.bases.map((b) => ({ id: b.id, name: b.name }))}
                />
              ) : selectedAircraft && selected.kind === "aircraft" ? (
                <AircraftDetailPanel
                  aircraft={selectedAircraft}
                  onBack={() => setSelected({ kind: "base", baseId: (selected as any).baseId })}
                  onRecall={handleRecall}
                  currentHour={state.hour}
                />
              ) : selected?.kind === "base" && selectedBase ? (
                <BaseDetailPanel
                  base={selectedBase}
                  onSelectAircraft={(id) => setSelected({ kind: "aircraft", baseId: selectedBase.id, aircraftId: id })}
                />
              ) : selected?.kind === "base" ? (
                <div className="p-4 text-xs text-muted-foreground">
                  Bas ej aktiv i detta scenario.
                </div>
              ) : selected?.kind === "enemy_base" && selectedEnemyBase ? (
                <EnemyBaseDetailPanel base={selectedEnemyBase} />
              ) : selected?.kind === "enemy_entity" && selectedEnemyEntity ? (
                <EnemyEntityDetailPanel entity={selectedEnemyEntity} />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Active aircraft bar ────────────────────────────────────────────────────

const ACTIVE_STATUSES: AircraftStatus[] = ["on_mission", "returning", "in_preparation", "awaiting_launch", "allocated"];

const STATUS_LABEL: Record<string, string> = {
  on_mission:      "UPP",
  returning:       "RET",
  in_preparation:  "KLAR",
  awaiting_launch: "VÄNT",
  allocated:       "TILL",
};

const STATUS_COLOR: Record<string, string> = {
  on_mission:      "#22c55e",
  returning:       "#a78bfa",
  in_preparation:  "#eab308",
  awaiting_launch: "#22d3ee",
  allocated:       "#3b82f6",
};

function ActiveAircraftBar({
  bases,
  selectedAircraftId,
  onSelect,
}: {
  bases: Base[];
  selectedAircraftId: string | undefined;
  onSelect: (baseId: string, aircraftId: string) => void;
}) {
  const activeAircraft = bases.flatMap((base) =>
    getAircraft(base)
      .filter((ac) => ACTIVE_STATUSES.includes(ac.status))
      .map((ac) => ({ ac, baseId: base.id, baseName: base.name }))
  );

  if (activeAircraft.length === 0) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="h-6 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(5,10,20,0.85))" }}
      />

      <div
        className="flex items-center gap-0 overflow-x-auto"
        style={{
          background: "rgba(5,10,20,0.92)",
          borderTop: "1px solid rgba(215,171,58,0.25)",
          backdropFilter: "blur(6px)",
          scrollbarWidth: "none",
        }}
      >
        <div
          className="shrink-0 px-3 py-2 border-r flex items-center gap-1.5"
          style={{ borderColor: "rgba(215,171,58,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>AKTIVA</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1.5 flex-nowrap">
          {activeAircraft.map(({ ac, baseId, baseName }) => {
            const isSelected = ac.id === selectedAircraftId;
            const color = STATUS_COLOR[ac.status] ?? "#94a3b8";
            const label = STATUS_LABEL[ac.status] ?? ac.status;

            return (
              <button
                key={ac.id}
                onClick={(e) => { e.stopPropagation(); onSelect(baseId, ac.id); }}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[10px] transition-all"
                style={{
                  background: isSelected ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? color : "rgba(255,255,255,0.08)"}`,
                  boxShadow: isSelected ? `0 0 8px ${color}55` : "none",
                  color: isSelected ? color : "#94a3b8",
                  transform: isSelected ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="font-bold" style={{ color: isSelected ? color : "#e2e8f0" }}>{ac.tailNumber}</span>
                {ac.currentMission && <span style={{ color, opacity: 0.85 }}>{ac.currentMission}</span>}
                <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                  {label}
                </span>
                <span className="text-[8px] opacity-50">{baseName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
