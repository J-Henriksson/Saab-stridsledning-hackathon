import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MapGL, { NavigationControl, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";

import { BASE_COORDS, STOCKHOLM_CENTER, TACTICAL_ZOOM, MAP_STYLE } from "./map/constants";
import { SelectedEntity } from "./map/helpers";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftLayer } from "./map/AircraftLayer";
import { BaseDetailPanel } from "./map/BaseDetailPanel";
import { AircraftDetailPanel } from "./map/AircraftDetailPanel";
import { TacticalZonesLayer } from "./map/TacticalZonesLayer";
import { FixedAssetMarkers } from "./map/FixedAssetMarkers";
import { RegionBordersLayer } from "./map/RegionBordersLayer";
import { ZoneToolbar } from "./map/ZoneToolbar";
import { ZoneDetailPanel } from "./map/ZoneDetailPanel";
import { DrawingPreviewOverlay } from "./map/DrawingPreviewOverlay";
import { useZoneDrawing } from "./map/ZoneDrawingTool";
import { Base, AircraftStatus } from "@/types/game";
import type { DrawingMode, TacticalZone, FixedMilitaryAsset, OverlayLayerVisibility } from "@/types/overlay";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";

export default function MapPage() {
  const { state, togglePause, resetGame, dispatch } = useGame();
  const location = useLocation();
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
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

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  const selectedAircraft =
    selected?.kind === "aircraft"
      ? selectedBase?.aircraft.find((a) => a.id === selected.aircraftId)
      : undefined;

  const selectedAircraftId = selected?.kind === "aircraft" ? selected.aircraftId : undefined;

  const selectedZone =
    selected?.kind === "zone"
      ? state.tacticalZones.find((z) => z.id === selected.zoneId)
      : undefined;

  const selectedAsset =
    selected?.kind === "asset"
      ? [...FIXED_MILITARY_ASSETS, ...AMMO_DEPOTS].find((a) => a.id === selected.assetId)
      : undefined;

  // Reset follow state when selection changes
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

  const handleMapClick = useCallback(() => {
    if (drawingMode !== "none") return;
    setSelected(null);
  }, [drawingMode]);

  const handleZoneComplete = useCallback(
    (zoneData: Omit<TacticalZone, "id" | "createdAtHour" | "createdAtDay">) => {
      const ttlHours = 8;
      const rawEndHour = state.hour + ttlHours;
      const expiresAtDay = rawEndHour >= 24 ? state.day + Math.floor(rawEndHour / 24) : state.day;
      const expiresAtHour = rawEndHour % 24;
      dispatch({
        type: "ADD_TACTICAL_ZONE",
        zone: { ...zoneData, expiresAtHour, expiresAtDay },
      });
      setDrawingMode("none");
    },
    [dispatch, state.hour, state.day]
  );

  const drawState = useZoneDrawing({ mode: drawingMode, onZoneComplete: handleZoneComplete });

  const handleToggleVisibility = useCallback(
    (key: keyof OverlayLayerVisibility) => {
      dispatch({
        type: "SET_OVERLAY_VISIBILITY",
        key,
        value: !state.overlayVisibility[key],
      });
    },
    [dispatch, state.overlayVisibility]
  );

  const handleSelectAsset = useCallback((asset: FixedMilitaryAsset) => {
    setSelected({ kind: "asset", assetId: asset.id });
  }, []);

  const userZoneCount = state.tacticalZones.filter((z) => z.category === "user").length;

  // Derive panel title info
  const panelTitle = (() => {
    if (selectedAircraft)
      return { main: selectedAircraft.tailNumber, sub: `${selectedAircraft.type} · ${selectedBase?.name}` };
    if (selectedZone)
      return {
        main: selectedZone.name,
        sub: selectedZone.category === "fixed" ? "Permanent skyddszon" : "Temporär zon",
      };
    if (selectedAsset)
      return { main: selectedAsset.name, sub: selectedAsset.type.replace("_", " ").toUpperCase() };
    if (selectedBase)
      return { main: selectedBase.name ?? selected?.baseId, sub: selectedBase?.type ?? "Reservbas" };
    return null;
  })();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onTogglePause={togglePause} onReset={resetGame} />

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
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: STOCKHOLM_CENTER.lng,
              latitude: STOCKHOLM_CENTER.lat,
              zoom: TACTICAL_ZOOM,
              pitch: 0,
            }}
            mapStyle={MAP_STYLE}
            onClick={handleMapClick}
            onDragStart={() => { isFollowing.current = false; followStartTime.current = null; }}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            {/* County/region borders — base geographic reference layer */}
            <RegionBordersLayer />

            {/* Tactical zone fills (rendered below other layers) */}
            <TacticalZonesLayer
              zones={state.tacticalZones}
              visible={state.overlayVisibility.activeZones}
            />

            <SupplyLinesLayer bases={state.bases} />

            <AircraftLayer
              bases={state.bases}
              currentHour={state.hour}
              currentDay={state.day}
              onSelectAircraft={(baseId, aircraftId) =>
                setSelected({ kind: "aircraft", baseId, aircraftId })
              }
              selectedAircraftId={selectedAircraftId}
              onPositionUpdate={selectedAircraftId ? handlePositionUpdate : undefined}
              tacticalZones={state.tacticalZones}
              dispatch={dispatch}
            />

            {/* Fixed military & civilian asset markers */}
            <FixedAssetMarkers
              showMilitary={state.overlayVisibility.militaryAssets}
              showCivilian={state.overlayVisibility.civilianInfrastructure}
              onSelectAsset={handleSelectAsset}
            />

            {Object.keys(BASE_COORDS).map((id) => (
              <BaseMarker
                key={id}
                id={id}
                base={state.bases.find((b) => b.id === id)}
                isSelected={selected?.kind === "base" || selected?.kind === "aircraft"
                  ? selected.baseId === id
                  : false}
                onClick={() => setSelected({ kind: "base", baseId: id })}
              />
            ))}

            {/* Drawing preview SVG overlay (inside MapGL so it uses map coordinates) */}
            <DrawingPreviewOverlay drawState={drawState} />
          </MapGL>

          {/* Scanline CRT overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />

          {/* Zone toolbar — left edge */}
          <ZoneToolbar
            drawingMode={drawingMode}
            onSetDrawingMode={setDrawingMode}
            visibility={state.overlayVisibility}
            onToggleVisibility={handleToggleVisibility}
            activeZoneCount={userZoneCount}
          />

          {/* Active aircraft bar */}
          <ActiveAircraftBar
            bases={state.bases}
            selectedAircraftId={selectedAircraftId}
            onSelect={(baseId, aircraftId) => setSelected({ kind: "aircraft", baseId, aircraftId })}
          />
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
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
                  {panelTitle ? (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{panelTitle.main}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{panelTitle.sub}</div>
                    </>
                  ) : (
                    <div className="text-xs font-bold text-foreground font-mono">
                      {(selected as any).baseId ?? (selected as any).zoneId ?? (selected as any).assetId}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedAircraft ? (
                <AircraftDetailPanel
                  aircraft={selectedAircraft}
                  onBack={() => setSelected({ kind: "base", baseId: selected!.kind === "aircraft" ? selected.baseId : "" })}
                  onRecall={handleRecall}
                  currentHour={state.hour}
                />
              ) : selectedZone ? (
                <ZoneDetailPanel
                  zone={selectedZone}
                  onDelete={() => {
                    dispatch({ type: "REMOVE_TACTICAL_ZONE", zoneId: selectedZone.id });
                    setSelected(null);
                  }}
                  currentHour={state.hour}
                  currentDay={state.day}
                />
              ) : selectedAsset ? (
                <AssetInfoPanel asset={selectedAsset} />
              ) : selectedBase ? (
                <BaseDetailPanel
                  base={selectedBase}
                  onSelectAircraft={(id) =>
                    setSelected({ kind: "aircraft", baseId: selectedBase.id, aircraftId: id })
                  }
                />
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  Bas ej aktiv i detta scenario.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Asset info panel ───────────────────────────────────────────────────────

function AssetInfoPanel({ asset }: { asset: FixedMilitaryAsset }) {
  const TYPE_LABELS: Record<string, string> = {
    army_regiment:    "Armeregementen",
    marine_regiment:  "Marinregementen",
    naval_base:       "Marinbas",
    airport_civilian: "Civilt flygfält",
    ammo_depot:       "Ammunitionsdepå",
  };

  return (
    <div className="flex-1 p-4 space-y-3">
      <div className="text-[10px] font-mono text-muted-foreground">{TYPE_LABELS[asset.type] ?? asset.type}</div>
      <div className="space-y-2 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Beteckning</span>
          <span className="font-bold">{asset.shortName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Position</span>
          <span className="font-bold">{asset.lat.toFixed(4)}°N {asset.lng.toFixed(4)}°E</span>
        </div>
        {asset.fillLevel !== undefined && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fyllnadsnivå</span>
              <span
                className="font-bold"
                style={{
                  color:
                    asset.fillLevel > 60
                      ? "#22c55e"
                      : asset.fillLevel > 30
                      ? "#eab308"
                      : "#ef4444",
                }}
              >
                {asset.fillLevel}%
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 4, background: "#1e293b" }}
            >
              <div
                style={{
                  width: `${asset.fillLevel}%`,
                  height: "100%",
                  background:
                    asset.fillLevel > 60
                      ? "#22c55e"
                      : asset.fillLevel > 30
                      ? "#eab308"
                      : "#ef4444",
                  borderRadius: "9999px",
                }}
              />
            </div>
          </>
        )}
        {asset.protectionRadiusKm && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Skyddszon</span>
            <span className="font-bold">{asset.protectionRadiusKm} km</span>
          </div>
        )}
      </div>
      <div
        className="text-[9px] font-mono text-muted-foreground border-t border-border pt-2 mt-2"
      >
        PERMANENT SKYDDSOBJEKT — ej redigerbar
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
    base.aircraft
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
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#22c55e" }}
          />
          <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>
            AKTIVA
          </span>
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
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                />
                <span className="font-bold" style={{ color: isSelected ? color : "#e2e8f0" }}>
                  {ac.tailNumber}
                </span>
                {ac.currentMission && (
                  <span style={{ color, opacity: 0.85 }}>{ac.currentMission}</span>
                )}
                <span
                  className="text-[8px] px-1 py-0.5 rounded"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                >
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
