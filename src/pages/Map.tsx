import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Satellite, Wind, Cloud, TriangleAlert, ChevronRight, Layers3, PenLine, Crosshair, Swords } from "lucide-react";

import { BASE_COORDS, SWEDEN_CENTER, INITIAL_ZOOM, MAP_STYLE } from "./map/constants";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftLayer } from "./map/AircraftLayer";
import { CloudLayer, CloudSummary } from "./map/CloudLayer";
import { ACTIVE_SATELLITE_DEFS, SatelliteLayer, SatelliteLiveState } from "./map/SatelliteLayer";
import { SatelliteDetailPanel } from "./map/SatelliteDetailPanel";
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

type SelectedEntity =
  | { kind: "base"; baseId: string }
  | { kind: "aircraft"; baseId: string; aircraftId: string }
  | { kind: "satellite"; satelliteId: string }
  | { kind: "enemy_base"; id: string }
  | { kind: "enemy_entity"; id: string }
  | { kind: "unit"; unitId: string }
  | null;

type MapViewKey = "satelliter" | "vind" | "moln" | "hotzoner";

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

const MAP_MODE_OPTIONS: {
  id: MapViewKey;
  label: string;
  icon: typeof Satellite;
  available: boolean;
}[] = [
  { id: "satelliter", label: "Satelliter", icon: Satellite, available: true },
  { id: "vind", label: "Vind", icon: Wind, available: true },
  { id: "moln", label: "Moln", icon: Cloud, available: true },
  { id: "hotzoner", label: "Hotzoner", icon: TriangleAlert, available: false },
];

const SEA_LABELS = [
  { id: "nordsjon", label: "Nordsjön", lat: 58.7, lng: 3.6 },
  { id: "ostersjon", label: "Östersjön", lat: 58.8, lng: 19.7 },
  { id: "bottniska_viken", label: "Bottniska viken", lat: 63.6, lng: 20.3 },
];

function isMarineLabelLayer(layer: {
  id: string;
  type?: string;
  layout?: Record<string, unknown>;
  source?: string;
  ["source-layer"]?: string;
}) {
  if (layer.type !== "symbol") return false;

  const textField = typeof layer.layout?.["text-field"] === "string"
    ? layer.layout["text-field"]
    : JSON.stringify(layer.layout?.["text-field"] ?? "");
  const haystack = [
    layer.id,
    layer.source,
    layer["source-layer"],
    textField,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const mentionsMarineArea =
    haystack.includes("water") ||
    haystack.includes("marine") ||
    haystack.includes("ocean") ||
    haystack.includes("sea");

  const mentionsLabel =
    haystack.includes("name") ||
    haystack.includes("label") ||
    haystack.includes("text");

  return mentionsMarineArea && mentionsLabel;
}

export default function MapPage() {
  const { state, togglePause, setGameSpeed, resetGame, dispatch } = useGame();
  const location = useLocation();
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [isModePanelOpen, setIsModePanelOpen] = useState(false);
  const [visibleViews, setVisibleViews] = useState<Record<MapViewKey, boolean>>({
    satelliter: true,
    vind: false,
    moln: false,
    hotzoner: false,
  });
  const [cloudSummary, setCloudSummary] = useState<CloudSummary>({
    activeFields: 0,
    dominantDrift: "Östlig drift",
    coverageLabel: "Lätt täckning",
  });
  const [liveSatellites, setLiveSatellites] = useState<SatelliteLiveState[]>(
    ACTIVE_SATELLITE_DEFS.map((satellite) => ({
      id: satellite.id,
      name: satellite.name,
      lat: satellite.startLat,
      lng: satellite.startLng,
      heading: satellite.trackDeg,
      speedKmh: Math.round(satellite.speedDegPerSec * 32000),
      altitudeKm: satellite.altitudeKm,
      orbitClass: satellite.orbitClass,
      status: satellite.status,
      signalStrength: 80,
      region: "Mellansverige",
      nextPassMinutes: 8,
      role: satellite.role,
      readiness: satellite.readiness,
      observationFocus: satellite.observationFocus,
      recommendedAction: satellite.recommendedAction,
      limitation: satellite.limitation,
      footprintWidthKm: satellite.footprintWidthKm,
      footprintLengthKm: satellite.footprintLengthKm,
      visibilityQuality: "God",
      swedishInterestCoverage: "Täcker",
    })),
  );
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
  const selectedSatelliteId = selected?.kind === "satellite" ? selected.satelliteId : undefined;

  const selectedUnit = selected?.kind === "unit"
    ? allUnits.find((u) => u.id === selected.unitId)
    : undefined;
  const selectedSatellite = selected?.kind === "satellite"
    ? liveSatellites.find((satellite) => satellite.id === selected.satelliteId)
    : undefined;

  useEffect(() => {
    isFollowing.current = false;
    followStartTime.current = null;
  }, [selectedAircraftId, selectedSatelliteId]);

  useEffect(() => {
    if (!visibleViews.satelliter && selected?.kind === "satellite") {
      setSelected(null);
    }
  }, [visibleViews.satelliter, selected]);

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

  const handleSatellitePositionUpdate = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    const now = performance.now();
    if (!followStartTime.current) {
      followStartTime.current = now;
      isFollowing.current = true;
      map.flyTo({ center: [lng, lat], zoom: 7.2, duration: 1100, pitch: 18 });
      return;
    }
    if (now - followStartTime.current < 1100) return;
    map.easeTo({ center: [lng, lat], duration: 180 });
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

  const handleSatelliteUpdate = useCallback((satellites: SatelliteLiveState[]) => {
    setLiveSatellites(satellites);
  }, []);
  const toggleView = useCallback((view: MapViewKey) => {
    setVisibleViews((current) => ({ ...current, [view]: !current[view] }));
  }, []);
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    const style = map?.getStyle();
    if (!map || !style?.layers) return;

    for (const layer of style.layers) {
      if (!("id" in layer) || !("type" in layer)) continue;
      if (!isMarineLabelLayer(layer)) continue;

      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } catch {
        // Ignore third-party style layers that cannot be adjusted safely.
      }
    }
  }, []);

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
            onLoad={handleMapLoad}
            onDragStart={() => { isFollowing.current = false; followStartTime.current = null; }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            <SupplyLinesLayer bases={state.bases} />
            {visibleViews.moln && <CloudLayer onUpdate={setCloudSummary} />}
            {visibleViews.satelliter && (
              <SatelliteLayer
                onUpdate={handleSatelliteUpdate}
                onSelectSatellite={(satelliteId) => setSelected({ kind: "satellite", satelliteId })}
                selectedSatelliteId={selectedSatelliteId}
                onPositionUpdate={selectedSatelliteId ? handleSatellitePositionUpdate : undefined}
              />
            )}
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

            {SEA_LABELS.map((sea) => (
              <Marker key={sea.id} longitude={sea.lng} latitude={sea.lat} anchor="center" style={{ zIndex: 0 }}>
                <div
                  className="pointer-events-none select-none text-center italic leading-tight"
                  style={{
                    color: "rgba(226,232,240,0.58)",
                    textShadow: "0 1px 2px rgba(2,6,23,0.95), 0 0 1px rgba(2,6,23,0.95)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "11px",
                    letterSpacing: "0.02em",
                    width: "96px",
                  }}
                >
                  {sea.label}
                </div>
              </Marker>
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

          {/* Wind particle flow field — shown when vind tab is active */}
          {visibleViews.vind && <WindLayer active={true} />}

          {/* Scanline CRT overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />

          <MapModeSidebar
            visibleViews={visibleViews}
            isOpen={isModePanelOpen}
            onToggle={() => setIsModePanelOpen((current) => !current)}
            onToggleView={toggleView}
            satellites={liveSatellites}
            cloudSummary={cloudSummary}
            selectedSatelliteId={selectedSatelliteId}
            onSelectSatellite={(satelliteId) => setSelected({ kind: "satellite", satelliteId })}
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
                  {selectedSatellite ? (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedSatellite.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {selectedSatellite.role} · {selectedSatellite.orbitClass}
                      </div>
                    </>
                  ) : selectedUnit ? (
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
              ) : selectedSatellite ? (
                <SatelliteDetailPanel satellite={selectedSatellite} />
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

function MapModeSidebar({
  visibleViews,
  isOpen,
  onToggle,
  onToggleView,
  satellites,
  cloudSummary,
  selectedSatelliteId,
  onSelectSatellite,
}: {
  visibleViews: Record<MapViewKey, boolean>;
  isOpen: boolean;
  onToggle: () => void;
  onToggleView: (mode: MapViewKey) => void;
  satellites: SatelliteLiveState[];
  cloudSummary: CloudSummary;
  selectedSatelliteId?: string;
  onSelectSatellite: (satelliteId: string) => void;
}) {
  const modeAccent = (mode: MapViewKey) => {
    if (mode === "hotzoner") return "#f87171";
    if (mode === "moln") return "#cbd5e1";
    return "#67e8f9";
  };

  return (
    <div className="absolute left-3 top-3 z-20 pointer-events-none sm:left-4 sm:top-4">
      <div className="flex items-start gap-2">
        <div
          className="pointer-events-auto flex w-[64px] flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
          style={{
            background: "linear-gradient(180deg, rgba(7,12,24,0.94), rgba(4,8,16,0.88))",
            borderColor: "rgba(100,116,139,0.26)",
            boxShadow: "0 24px 50px rgba(2,6,23,0.5), inset 0 1px 0 rgba(103,232,249,0.08)",
          }}
        >
          <button
            onClick={onToggle}
            className="flex h-14 items-center justify-center border-b transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(103,232,249,0.12)" }}
            aria-label={isOpen ? "Stäng lägespanel" : "Öppna lägespanel"}
          >
            <Layers3 className="h-4 w-4" style={{ color: "#67e8f9" }} />
          </button>

          <div className="flex flex-col gap-2 px-2 py-3">
            {MAP_MODE_OPTIONS.map((mode) => {
              const Icon = mode.icon;
              const isActive = visibleViews[mode.id];
              const accent = modeAccent(mode.id);

              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onToggleView(mode.id);
                    if (!isOpen) onToggle();
                  }}
                  className="group relative flex h-11 items-center justify-center rounded-xl border transition-all"
                  style={{
                    borderColor: isActive ? `${accent}73` : "rgba(148,163,184,0.14)",
                    background: isActive
                      ? mode.id === "hotzoner"
                        ? "linear-gradient(180deg, rgba(127,29,29,0.32), rgba(69,10,10,0.4))"
                        : "linear-gradient(180deg, rgba(8,145,178,0.22), rgba(8,47,73,0.34))"
                      : "rgba(15,23,42,0.46)",
                    boxShadow: isActive ? `inset 0 1px 0 ${accent}22, 0 0 18px ${accent}22` : "none",
                  }}
                  aria-label={`Välj ${mode.label}`}
                >
                  <Icon className="h-4 w-4" style={{ color: isActive ? accent : "#94a3b8" }} />
                  {!mode.available && !isActive && (
                    <span
                      className="absolute bottom-1 h-1.5 w-1.5 rounded-full"
                      style={{ background: "rgba(148,163,184,0.55)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -18, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="pointer-events-auto w-[290px] max-w-[calc(100vw-6rem)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl sm:w-[320px]"
              style={{
                background: "linear-gradient(180deg, rgba(8,17,32,0.95), rgba(4,10,20,0.88))",
                borderColor: "rgba(215,171,58,0.18)",
                boxShadow: "0 28px 60px rgba(2,6,23,0.52), inset 0 1px 0 rgba(103,232,249,0.08)",
              }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "rgba(103,232,249,0.12)" }}
              >
                <div>
                  <div className="text-[9px] tracking-[0.34em]" style={{ color: "#67e8f9" }}>
                    STRIDSLEDNING
                  </div>
                  <div className="mt-1 text-sm font-bold tracking-[0.14em]" style={{ color: "#f8fafc" }}>
                    KARTLAGER
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-white/5"
                  style={{ borderColor: "rgba(148,163,184,0.18)", color: "#cbd5e1" }}
                  aria-label="Stäng lägespanel"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b px-3 py-3" style={{ borderColor: "rgba(103,232,249,0.1)" }}>
                <div className="grid grid-cols-2 gap-2">
                  {MAP_MODE_OPTIONS.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = visibleViews[mode.id];
                    const accent = modeAccent(mode.id);

                    return (
                      <button
                        key={mode.id}
                        onClick={() => onToggleView(mode.id)}
                        className="rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-[1px]"
                        style={{
                          borderColor: isActive ? `${accent}73` : "rgba(148,163,184,0.14)",
                          background: isActive
                            ? mode.id === "hotzoner"
                              ? "linear-gradient(180deg, rgba(127,29,29,0.72), rgba(69,10,10,0.88))"
                              : "linear-gradient(180deg, rgba(10,65,92,0.65), rgba(6,26,43,0.88))"
                            : "rgba(15,23,42,0.45)",
                          boxShadow: isActive ? `0 0 22px ${accent}22` : "none",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Icon className="h-4 w-4" style={{ color: isActive ? accent : "#94a3b8" }} />
                          <span
                            className="rounded-full border px-1.5 py-0.5 text-[8px] tracking-[0.18em]"
                            style={{
                              color: isActive ? "#4ade80" : "#94a3b8",
                              borderColor: isActive ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.2)",
                              background: isActive ? "rgba(34,197,94,0.08)" : "rgba(148,163,184,0.08)",
                            }}
                          >
                            {isActive ? "PÅ" : "AV"}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] font-bold tracking-[0.1em]" style={{ color: "#f8fafc" }}>
                          {mode.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {visibleViews.satelliter ? (
                <SatelliteModePanel
                  satellites={satellites}
                  selectedSatelliteId={selectedSatelliteId}
                  onSelectSatellite={onSelectSatellite}
                />
              ) : null}

              {visibleViews.moln ? <CloudModePanel summary={cloudSummary} /> : null}

              {visibleViews.vind ? <WindModePanel /> : null}

              {(["hotzoner"] as const)
                .filter((mode) => visibleViews[mode])
                .map((mode) => (
                  <PlaceholderModePanel key={mode} mode={mode} />
                ))}

              {!visibleViews.satelliter &&
              !(visibleViews.vind || visibleViews.moln || visibleViews.hotzoner) ? (
                <div className="px-4 py-5 font-mono">
                  <div
                    className="rounded-2xl border px-4 py-5"
                    style={{
                      borderColor: "rgba(148,163,184,0.16)",
                      background: "linear-gradient(180deg, rgba(15,23,42,0.64), rgba(15,23,42,0.4))",
                    }}
                  >
                    <div className="text-[9px] tracking-[0.3em]" style={{ color: "#94a3b8" }}>
                      KARTLAGER
                    </div>
                    <div className="mt-2 text-lg font-bold tracking-[0.12em]" style={{ color: "#f8fafc" }}>
                      Inga vyer aktiva
                    </div>
                    <p className="mt-3 text-[11px] leading-5" style={{ color: "#cbd5e1" }}>
                      Slå på ett lager i sidofältet för att visa satelliter eller andra kartvyer.
                    </p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WindModePanel() {
  return (
    <div className="px-4 py-4 text-[10px] font-mono border-t" style={{ borderColor: "rgba(103,232,249,0.08)" }}>
      <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "rgba(103,232,249,0.14)" }}>
        <div>
          <div className="text-[9px] tracking-[0.35em]" style={{ color: "#67e8f9" }}>
            METEOROLOGI
          </div>
          <div className="mt-1 text-xs font-bold tracking-[0.18em]" style={{ color: "#f8fafc" }}>
            VIND
          </div>
        </div>
        <div className="rounded-sm border px-2 py-1 text-[9px] tracking-[0.24em]" style={{ borderColor: "rgba(34,211,238,0.35)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
          AKTIV
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TelemetryStat label="RIKTNING" value="NNV" accent="#67e8f9" />
        <TelemetryStat label="STYRKA" value="12 KT" accent="#67e8f9" />
        <TelemetryStat label="BY" value="18 KT" accent="#f59e0b" />
        <TelemetryStat label="TURBULENS" value="LÅG" accent="#22c55e" />
      </div>

      <div
        className="mt-3 rounded-2xl border px-3 py-3"
        style={{
          borderColor: "rgba(103,232,249,0.14)",
          background: "linear-gradient(180deg, rgba(30,41,59,0.72), rgba(15,23,42,0.54))",
        }}
      >
        <div className="text-[9px] tracking-[0.2em]" style={{ color: "#94a3b8" }}>
          VINDPARTIKELFLÖDE AKTIVERAT — VISAR LUFTRÖRELSER PÅ LÄGRE HÖJD
        </div>
        <div className="mt-2 text-[10px]" style={{ color: "#cbd5e1" }}>
          Partikelrörelserna representerar vindriktning och relativ styrka baserat på aktuella meteorologiska data.
        </div>
      </div>
    </div>
  );
}

function CloudModePanel({ summary }: { summary: CloudSummary }) {
  return (
    <div className="px-4 py-4 text-[10px] font-mono border-t" style={{ borderColor: "rgba(203,213,225,0.08)" }}>
      <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "rgba(203,213,225,0.14)" }}>
        <div>
          <div className="text-[9px] tracking-[0.35em]" style={{ color: "#cbd5e1" }}>
            ATMOSFÄR
          </div>
          <div className="mt-1 text-xs font-bold tracking-[0.18em]" style={{ color: "#f8fafc" }}>
            MOLN
          </div>
        </div>
        <div className="rounded-sm border px-2 py-1 text-[9px] tracking-[0.24em]" style={{ borderColor: "rgba(203,213,225,0.26)", color: "#e2e8f0", background: "rgba(203,213,225,0.08)" }}>
          DYNAMISK
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TelemetryStat label="FÄLT" value={String(summary.activeFields).padStart(2, "0")} accent="#cbd5e1" />
        <TelemetryStat label="TÄCKNING" value={summary.coverageLabel.toUpperCase()} accent="#94a3b8" />
      </div>

      <div
        className="mt-3 rounded-2xl border px-3 py-3"
        style={{
          borderColor: "rgba(203,213,225,0.14)",
          background: "linear-gradient(180deg, rgba(30,41,59,0.72), rgba(15,23,42,0.54))",
        }}
      >
        <div className="text-[9px] tracking-[0.22em]" style={{ color: "#94a3b8" }}>
          DOMINERANDE DRIFT
        </div>
        <div className="mt-2 text-[12px] font-bold tracking-[0.12em]" style={{ color: "#e2e8f0" }}>
          {summary.dominantDrift}
        </div>
        <p className="mt-3 text-[10px] leading-5" style={{ color: "#cbd5e1" }}>
          Molnlagret är integrerat i kartans geometri och driver över operationsområdet med mjuk, volymetrisk täckning.
        </p>
      </div>
    </div>
  );
}

function SatelliteModePanel({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
}: {
  satellites: SatelliteLiveState[];
  selectedSatelliteId?: string;
  onSelectSatellite: (satelliteId: string) => void;
}) {
  const averageAltitude = Math.round(
    satellites.reduce((sum, satellite) => sum + satellite.altitudeKm, 0) / Math.max(satellites.length, 1),
  );
  const averageSpeed = Math.round(
    satellites.reduce((sum, satellite) => sum + satellite.speedKmh, 0) / Math.max(satellites.length, 1),
  );

  return (
    <div className="px-4 py-4 text-[10px] font-mono">
      <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "rgba(103,232,249,0.14)" }}>
        <div>
          <div className="text-[9px] tracking-[0.35em]" style={{ color: "#67e8f9" }}>
            SENSORNÄT
          </div>
          <div className="mt-1 text-xs font-bold tracking-[0.18em]" style={{ color: "#f8fafc" }}>
            SATELLITER
          </div>
        </div>
        <div className="rounded-sm border px-2 py-1 text-[9px] tracking-[0.24em]" style={{ borderColor: "rgba(34,211,238,0.35)", color: "#67e8f9", background: "rgba(34,211,238,0.08)" }}>
          LIVE
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TelemetryStat label="SPÅR" value={String(satellites.length).padStart(2, "0")} accent="#67e8f9" />
        <TelemetryStat label="AKTIVA" value={String(satellites.length).padStart(2, "0")} accent="#22c55e" />
        <TelemetryStat label="MEDELHAST" value={`${averageSpeed}`} accent="#f59e0b" />
        <TelemetryStat label="MEDELHÖJD" value={`${averageAltitude}KM`} accent="#c084fc" />
      </div>

      <div className="mt-3 rounded-sm border px-2.5 py-2" style={{ borderColor: "rgba(215,171,58,0.14)", background: "rgba(15,23,42,0.52)" }}>
        <div className="flex items-center justify-between text-[9px] tracking-[0.2em]" style={{ color: "#94a3b8" }}>
          <span>UPPDATERING</span>
          <span style={{ color: "#fbbf24" }}>01 SEK</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full w-full"
            style={{
              background: "linear-gradient(90deg, rgba(34,211,238,0.25), rgba(34,211,238,0.95), rgba(251,191,36,0.45))",
              boxShadow: "0 0 10px rgba(34,211,238,0.5)",
            }}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-[42vh] overflow-y-auto pr-1">
        {satellites.map((satellite) => {
          const isSelected = satellite.id === selectedSatelliteId;
          return (
          <button
            key={satellite.id}
            type="button"
            onClick={() => onSelectSatellite(satellite.id)}
            className="w-full rounded-sm border px-2.5 py-2 text-left transition-all"
            style={{
              borderColor: isSelected ? "rgba(103,232,249,0.4)" : "rgba(103,232,249,0.14)",
              background: isSelected
                ? "linear-gradient(180deg, rgba(12,74,110,0.72), rgba(15,23,42,0.72))"
                : "linear-gradient(180deg, rgba(15,23,42,0.72), rgba(15,23,42,0.48))",
              boxShadow: isSelected ? "0 0 18px rgba(34,211,238,0.18)" : "none",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold tracking-[0.12em]" style={{ color: "#e2e8f0" }}>
                  {satellite.name}
                </div>
                <div className="mt-0.5 text-[9px] tracking-[0.16em]" style={{ color: "#67e8f9" }}>
                  {satellite.orbitClass} • {satellite.status}
                </div>
              </div>
              <div className="rounded-sm border px-1.5 py-1 text-[8px]" style={{ borderColor: "rgba(34,197,94,0.3)", color: "#4ade80", background: "rgba(34,197,94,0.08)" }}>
                {isSelected ? "FÖLJER" : "LÅS"}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] leading-relaxed">
              <TelemetryRow label="REGION" value={satellite.region} />
              <TelemetryRow label="KURS" value={`${Math.round(satellite.heading)}°`} />
              <TelemetryRow label="HAST" value={`${satellite.speedKmh} KMH`} />
              <TelemetryRow label="HÖJD" value={`${satellite.altitudeKm} KM`} />
              <TelemetryRow label="SIGNAL" value={`${satellite.signalStrength}%`} />
              <TelemetryRow label="PASSAGE" value={`${satellite.nextPassMinutes} MIN`} />
            </div>
            <div className="mt-2 text-[9px] leading-4" style={{ color: "#cbd5e1" }}>
              {satellite.recommendedAction}
            </div>
          </button>
        )})}
      </div>
    </div>
  );
}

function PlaceholderModePanel({ mode }: { mode: "hotzoner" }) {
  const modeText: Record<"hotzoner", { title: string; description: string }> = {
    hotzoner: {
      title: "Hotzoner",
      description: "Hotzonsläge kommer att visualisera riskområden och konfliktzoner i ett senare steg.",
    },
  };

  const content = modeText[mode];

  return (
    <div className="px-4 py-5 font-mono">
      <div className="rounded-2xl border px-4 py-5" style={{ borderColor: "rgba(148,163,184,0.16)", background: "linear-gradient(180deg, rgba(15,23,42,0.64), rgba(15,23,42,0.4))" }}>
        <div className="text-[9px] tracking-[0.3em]" style={{ color: "#94a3b8" }}>
          KARTLAGER
        </div>
        <div className="mt-2 text-lg font-bold tracking-[0.12em]" style={{ color: "#f8fafc" }}>
          {content.title}
        </div>
        <p className="mt-3 text-[11px] leading-5" style={{ color: "#cbd5e1" }}>
          {content.description}
        </p>
        <div className="mt-5 flex items-center justify-between rounded-xl border px-3 py-2 text-[9px]" style={{ borderColor: "rgba(251,191,36,0.18)", background: "rgba(251,191,36,0.06)" }}>
          <span style={{ color: "#94a3b8" }}>STATUS</span>
          <span style={{ color: "#fbbf24" }}>UNDER FÖRBEREDELSE</span>
        </div>
      </div>
    </div>
  );
}

function TelemetryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-sm border px-2 py-2"
      style={{
        borderColor: `${accent}33`,
        background: "rgba(15,23,42,0.52)",
      }}
    >
      <div className="text-[8px] tracking-[0.22em]" style={{ color: "#94a3b8" }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tracking-[0.14em]" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span className="text-right text-[9px]" style={{ color: "#e2e8f0" }}>
        {value}
      </span>
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
