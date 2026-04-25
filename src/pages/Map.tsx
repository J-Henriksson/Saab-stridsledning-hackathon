import { useState, useCallback, useRef, useEffect, useMemo, useReducer } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef, Source, Layer } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { useBaseFilter } from "@/context/BaseFilterContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Satellite, Wind, Cloud, TriangleAlert, ChevronRight, Layers3, PenLine, Crosshair, Swords, Mountain, Plane, Shield, Building2, ShieldAlert, Radio, Send, Target, LayoutDashboard, Zap, PlayCircle, TrainFront } from "lucide-react";

import {
  BASE_COORDS, BASE_RINGS, STOCKHOLM_CENTER, TACTICAL_ZOOM,
  MAP_STYLE, DARK_STYLE, TOPO_STYLE, SATELLITE_STYLE, MINIMAL_STYLE,
  TERRARIUM_TILES, OCEAN_TILES, RAILROAD_TILES,
} from "./map/constants";
import { MarkerRingsLayer } from "./map/MarkerRingsLayer";
import { RoadBaseDetailPanel } from "./map/RoadBaseDetailPanel";
import { useMapLayers } from "@/hooks/useMapLayers";
import type { OverlayKey } from "@/hooks/useMapLayers";
import { MapFilterPanel } from "@/components/map/MapFilterPanel";
import { RadarShadowOverlay } from "@/components/map/RadarShadowOverlay";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftIncursionWatcher } from "./map/AircraftIncursionWatcher";
import { CloudLayer, CloudSummary } from "./map/CloudLayer";
import { ACTIVE_SATELLITE_DEFS, SatelliteLayer, SatelliteLiveState } from "./map/SatelliteLayer";
import { SatelliteDetailPanel } from "./map/SatelliteDetailPanel";
import { BaseDetailPanel } from "./map/BaseDetailPanel";
import { AircraftDetailPanel } from "./map/AircraftDetailPanel";
import { WindLayer } from "./map/WindLayer";
import { PlanModeSidebar, PlacingPayload, PlacingKind } from "./map/PlanModeSidebar";
import { DeployModeSidebar } from "./map/DeployModeSidebar";
import { PlanReviewModal } from "@/components/game/PlanReviewModal";
import { EnemyMarker } from "./map/EnemyMarker";
import { EnemyEntityMarker } from "./map/EnemyEntityMarker";
import { FriendlyMarkerPin, FriendlyEntityPin } from "./map/FriendlyPlanMarker";
import { RoadBaseMarker } from "./map/RoadBaseMarker";
import { EnemyBaseDetailPanel, EnemyEntityDetailPanel } from "./map/EnemyDetailPanel";
import { UnitsLayer } from "./map/UnitsLayer";
import { UnitDetailPanel } from "./map/UnitDetailPanel";
import { UnitPathTrailsLayer } from "./map/UnitPathTrailsLayer";
import { NavalUnitsLayer } from "./map/NavalUnitsLayer";
import { NavalDetailPanel } from "./map/NavalDetailPanel";
import { computeFriendlySensorCoverage, detectNavalUnits, detectEnemyBases, detectEnemyEntities } from "@/core/intel/visibility";
import { RadarLayer, RadarControlPanel } from "@/components/radar";
import type { ExtendedRadarUnit } from "@/components/radar";
import { useRadarDetection } from "@/hooks/useRadarDetection";
import { useRadarEngine } from "@/hooks/useRadarEngine";
import { DroneLayer } from "./map/drones/DroneLayer";
import { DroneRangeOverlay } from "./map/drones/DroneRangeOverlay";
import { DroneConnectionLine } from "./map/drones/DroneConnectionLine";
import { DroneDetailPanel } from "./map/drones/DroneDetailPanel";
import { AirDefenseRingsLayer } from "./map/AirDefenseRingsLayer";
import { ThreatRingsLayer } from "./map/ThreatRingsLayer";
import { WTALayer } from "./map/WTALayer";
import { useTacticalMap } from "@/hooks/useTacticalMap";
import { TacticalZonesLayer } from "./map/TacticalZonesLayer";
import { FixedAssetMarkers } from "./map/FixedAssetMarkers";
import { RegionBordersLayer } from "./map/RegionBordersLayer";
import { GeoBoundariesLayer, type BoundaryVisibility } from "./map/GeoBoundariesLayer";
import { useBoundaryCrossing } from "./map/useBoundaryCrossing";
import { RadarPulseLayer } from "./map/RadarPulseLayer";
import { SelectionRangeRing } from "./map/SelectionRangeRing";
import { ZoneDetailPanel } from "./map/ZoneDetailPanel";
import { EventsSidebar } from "./map/EventsSidebar";
import { DrawingPreviewOverlay } from "./map/DrawingPreviewOverlay";
import { CoordinateHUD } from "./map/CoordinateHUD";
import { useZoneDrawing } from "./map/ZoneDrawingTool";
import { Base, AircraftStatus, GameState } from "@/types/game";
import type { DrawingMode, TacticalZone, FixedMilitaryAsset, OverlayLayerVisibility } from "@/types/overlay";
import { isDrone, isAircraft, isAirDefense, isRadar, type UnitCategory } from "@/types/units";
import { TravelRangeOverlay } from "./map/TravelRangeOverlay";
import { BattleIntelOverlay, type TargetIntel } from "./map/BattleIntelOverlay";
import { BattleIntelTooltip } from "./map/BattleIntelTooltip";
import type { TravelRangeMode, BattleIntelSummary } from "./map/TravelRangeSection";
import { DEFAULT_TRAVEL_OPTS, computeTravelRange, etaHoursTo, isTravelRangeUnit } from "@/utils/travelRange";
import { collectThreatRings, classifyTarget, findBestReturnBase, pathCrossesThreatRings, type Reachability, type BestReturnBase } from "@/utils/battleIntel";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import { DUMMY_EVENTS } from "@/data/dummyEvents";
import { getAircraft } from "@/core/units/helpers";
import { createAircraftUnit, createAirDefenseUnit, createDeployedDroneUnit, createGroundVehicleUnit, createRadarUnit } from "@/core/units/factory";
import { gameReducer } from "@/core/engine";
import { initialGameState } from "@/data/initialGameState";
import { usePlanTabs, executePlan } from "@/hooks/usePlanTabs";
import type { RadarUnit } from "@/types/units";
import { useScenario } from "@/scenarios/baltic-incursion/useScenario";
import { ScenarioBrief } from "@/scenarios/baltic-incursion/brief";
import { AIActionCard } from "@/scenarios/baltic-incursion/actionCard";
import { ScenarioOverlay } from "@/scenarios/baltic-incursion/scenarioOverlay";

const PLACEMENT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 2C9.03 2 5 6.03 5 11c0 6.56 7.4 14.06 8.09 14.75a1.3 1.3 0 0 0 1.82 0C15.6 25.06 23 17.56 23 11c0-4.97-4.03-9-9-9Z' fill='%2360a5fa' stroke='%230c234c' stroke-width='1.6'/%3E%3Ccircle cx='14' cy='11' r='3.6' fill='%23dbeafe' stroke='%230c234c' stroke-width='1.2'/%3E%3C/svg%3E") 14 26, auto`;

type SelectedEntity =
  | { kind: "base"; baseId: string }
  | { kind: "aircraft"; baseId: string; aircraftId: string }
  | { kind: "satellite"; satelliteId: string }
  | { kind: "enemy_base"; id: string }
  | { kind: "enemy_entity"; id: string }
  | { kind: "unit"; unitId: string }
  | { kind: "radar"; radarId: string }
  | { kind: "zone"; zoneId: string }
  | { kind: "asset"; assetId: string }
  | { kind: "road_base"; id: string }
  | { kind: "naval"; id: string }
  | null;

type MapViewKey = "satelliter" | "vind" | "moln" | "hotzoner";

interface PlacingMode {
  kind: PlacingKind;
  data: Record<string, string>;
}

interface DraggingUnitState {
  unitId: string;
  unitName: string;
}

const PLACING_LABEL: Record<PlacingKind, string> = {
  friendly_base:   "vänlig bas",
  friendly_entity: "vänlig enhet",
  friendly_unit:   "vänlig enhet",
  enemy_base:      "fiendens bas",
  enemy_entity:    "fiendens enhet",
  road_base:       "vägbas",
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

const MILITARY_GREEN = "#2D5A27";
const RADAR_TEAL = "#00E5C7";

const DRAW_TOOLS: { mode: DrawingMode; label: string; color: string }[] = [
  { mode: "circle_restricted", label: "Restriktionszon", color: "#D9192E" },
  { mode: "circle_surveillance", label: "Övervakningszon", color: "#D97706" },
  { mode: "circle_logistics",    label: "Logistikzon",     color: "#2563eb" },
  { mode: "polygon_roadstrip",   label: "Vägstripzon",     color: "#0891b2" },
];

const LAYER_ITEMS: {
  key: keyof OverlayLayerVisibility;
  label: string;
  Icon: typeof Plane;
  color: string;
  solo?: boolean;
}[] = [
  { key: "flygvapnet", label: "Flygvapnet / Flygbaser", Icon: Plane, color: MILITARY_GREEN, solo: true },
  { key: "militaryBases", label: "Militära baser", Icon: Shield, color: MILITARY_GREEN },
  { key: "criticalInfra", label: "Kritisk infrastruktur", Icon: Building2, color: "#708090" },
  { key: "skyddsobjekt", label: "Skyddsobjekt", Icon: ShieldAlert, color: "#D97706" },
  { key: "radarUnits", label: "Radarstationer", Icon: Radio as any, color: RADAR_TEAL },
  { key: "activeZones", label: "Aktiva zoner", Icon: MapPin as any, color: "#2563eb" },
  { key: "drones", label: "Drönare (UAV)", Icon: Send, color: "#a855f7" },
  { key: "railroad", label: "Järnväg", Icon: TrainFront, color: "#78350f" },
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
  const { state, togglePause, setGameSpeed, resetGame, dispatch, recallDrone, updateDroneWaypoints, setDroneOverlay } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [visibleViews, setVisibleViews] = useState<Record<MapViewKey, boolean>>({
    satelliter: false,
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
  const [planState, planDispatch] = useReducer(gameReducer, initialGameState);
  const { tabs, activeTabId, activeTab, createTab, updateActiveSnapshot, renameTab, deleteTab, switchTab, setDelay } = usePlanTabs(state);
  const [dragOverExecute, setDragOverExecute] = useState(false);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const isPlanMode = activeTabId !== null;
  const [showPlanReview, setShowPlanReview] = useState(false);
  const [showPlanRings, setShowPlanRings] = useState(false);
  const [isDeployMode, setIsDeployMode] = useState(false);
  const [placingMode, setPlacingMode] = useState<PlacingMode | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [terrainFilterOpen, setTerrainFilterOpen] = useState(false);
  const [hoveredOverlayKey, setHoveredOverlayKey] = useState<OverlayKey | null>(null);
  const [draggingUnit, setDraggingUnit] = useState<DraggingUnitState | null>(null);
  const [dropCandidate, setDropCandidate] = useState<{ lat: number; lng: number } | null>(null);
  const [hudCursor, setHudCursor] = useState<{ lat: number; lng: number } | null>(null);
  const { mapLayerState, setBaseMap, toggleOverlay, setOverlayOpacity, toggleDampColors } = useMapLayers();
  const [aorOverrides, setAorOverrides] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(TACTICAL_ZOOM);
  const { updateRadarStatus, updateRadarPosition } = useRadarEngine();
  const { focusedBaseId, filterLevel, setFocusedBase, setFilterLevel, clearFilter, filterEvents } = useBaseFilter();
  const [showAllBaseRings, setShowAllBaseRings] = useState(false);
  const [boundaryVis, setBoundaryVis] = useState<BoundaryVisibility>({ eez: true, fir: true, land: true });
  const [iconStyle, setIconStyle] = useState<"custom" | "nato">("custom");

  // ── Scripted Baltic-incursion scenario ─────────────────────────────────
  const flyToScenario = useCallback((pos: { lat: number; lng: number; zoom?: number }) => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.flyTo({
      center: [pos.lng, pos.lat],
      zoom: pos.zoom ?? 6,
      duration: 1400,
      essential: true,
    });
  }, []);
  const scenario = useScenario({ state, dispatch, flyTo: flyToScenario });
  const [briefOpen, setBriefOpen] = useState(false);
  const [actionCardOpen, setActionCardOpen] = useState(false);
  const [scnHoveredContactId, setScnHoveredContactId] = useState<string | null>(null);
  // Brief opens at stage1, closes when operator dismisses or scenario advances past stage3.
  useEffect(() => {
    const beat = state.scenario?.beat;
    if (beat === "stage1" || beat === "stage2") setBriefOpen((prev) => prev || beat === "stage1");
    if (beat === "stage3") setBriefOpen(false);
    if (beat === "stage3") setActionCardOpen(true);
    if (beat === "stage4" || beat === "stage5" || beat === "done" || beat === undefined) {
      setActionCardOpen(false);
    }
  }, [state.scenario?.beat]);

  // Compute which airbase IDs should show rings:
  //   - "show all" toggle on → null (MarkerRingsLayer draws all)
  //   - focused base set     → only that base
  //   - a base detail panel open → only that base
  //   - otherwise            → empty set (no rings)
  const ringBaseIds = useMemo<Set<string> | null>(() => {
    if (showAllBaseRings) return null;
    const ids = new Set<string>();
    if (focusedBaseId) ids.add(focusedBaseId);
    if (selected?.kind === "base" || selected?.kind === "aircraft") ids.add((selected as any).baseId);
    return ids;
  }, [showAllBaseRings, focusedBaseId, selected]);

  // Merge live game events with static dummy events. Live events come first
  // so newly-dispatched events (scenario triggers, mission updates, etc.) land
  // at the top of HÄNDELSER, where operators look first.
  const allEvents = useMemo(
    () => [...state.events, ...DUMMY_EVENTS],
    [state.events]
  );

  // Events filtered by active base/unit filter — ready for sidebar consumption
  const filteredEvents = useMemo(() => filterEvents(allEvents), [allEvents, filterEvents]);

  const allUnits = useMemo(
    () => {
      if (!state || !state.bases) return [];
      return [...state.bases.flatMap((b) => b.units), ...state.deployedUnits];
    },
    [state]
  );

  type SearchResult = { label: string; sublabel: string; lat: number; lng: number };

  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !state) return [];
    const results: SearchResult[] = [];
    const match = (name: string) => name.toLowerCase().includes(q);

    state.bases.forEach((b) => {
      const c = BASE_COORDS[b.id];
      if (c && match(b.name)) results.push({ label: b.name, sublabel: "Bas", lat: c.lat, lng: c.lng });
    });
    state.enemyBases.forEach((eb) => {
      if (match(eb.name)) results.push({ label: eb.name, sublabel: "Fiendebase", lat: eb.coords.lat, lng: eb.coords.lng });
    });
    state.enemyEntities.forEach((ee) => {
      if (match(ee.name)) results.push({ label: ee.name, sublabel: "Fiendeenhet", lat: ee.coords.lat, lng: ee.coords.lng });
    });
    state.friendlyMarkers.forEach((fm) => {
      if (match(fm.name)) results.push({ label: fm.name, sublabel: "Vänlig markör", lat: fm.coords.lat, lng: fm.coords.lng });
    });
    state.friendlyEntities.forEach((fe) => {
      if (match(fe.name)) results.push({ label: fe.name, sublabel: "Vänlig enhet", lat: fe.coords.lat, lng: fe.coords.lng });
    });
    state.roadBases.forEach((rb) => {
      if (match(rb.name)) results.push({ label: rb.name, sublabel: "Vägbas", lat: rb.coords.lat, lng: rb.coords.lng });
    });
    state.navalUnits.forEach((nu) => {
      if (match(nu.name)) results.push({ label: nu.name, sublabel: "Marinstyrkа", lat: nu.position.lat, lng: nu.position.lng });
    });
    allUnits.forEach((u) => {
      if (match(u.name)) results.push({ label: u.name, sublabel: u.category, lat: u.position.lat, lng: u.position.lng });
    });
    return results.slice(0, 10);
  }, [searchQuery, state, allUnits]);

  // Filter for radar units
  const radarUnits = useMemo(
    () => allUnits.filter((u): u is RadarUnit => u.category === "radar"),
    [allUnits]
  );

  // Radar detection local state for UI (since we don't have a global contact state)
  const [radarContacts, setRadarContacts] = useState<Record<string, string[]>>({});
  
  const handleUpdateRadarContacts = useCallback((radarId: string, contactIds: string[]) => {
    setRadarContacts(prev => ({ ...prev, [radarId]: contactIds }));
  }, []);

  const mapRadarStatus = useCallback((unit: RadarUnit): ExtendedRadarUnit["status"] => {
    // ExtendedRadarUnit (e.g. DEMO_RADAR_UNITS) has no deployedState/emitting — honour its own status
    if ((unit as any).deployedState === undefined) return (unit as any).status ?? "operational";
    if (unit.deployedState === "stowed") return "maintenance";
    return unit.emitting ? "operational" : "standby";
  }, []);

  // Enriched units with detected contact info
  const enrichedRadarUnits = useMemo(() =>
    radarUnits.map(u => ({
      ...u,
      status: mapRadarStatus(u),
      rangeRadius: (u as any).rangeRadius ?? 450000,
      sweepSpeed: (u as any).sweepSpeed ?? 6,
      faction: "friendly" as const,
      basePosition:
        (u.currentBase && BASE_COORDS[u.currentBase]) ||
        (u.lastBase && BASE_COORDS[u.lastBase]) ||
        (u.parentBaseId && BASE_COORDS[u.parentBaseId]) ||
        u.position,
      detectedContactIds: radarContacts[u.id] ?? []
    })),
    [radarUnits, radarContacts, mapRadarStatus]
  );

  useRadarDetection(enrichedRadarUnits, handleUpdateRadarContacts);

  const handleUpdateRadar = useCallback((id: string, updates: Partial<ExtendedRadarUnit>) => {
    if (updates.status) {
      updateRadarStatus(id, updates.status);
    }
    if (updates.position) {
      updateRadarPosition(id, updates.position);
    }
  }, [updateRadarStatus, updateRadarPosition]);
  const isFollowing = useRef(false);
  const followStartTime = useRef<number | null>(null);
  const [followingUnitId, setFollowingUnitId] = useState<string | null>(null);

  // Pre-select aircraft when navigated here from basöversikt
  useEffect(() => {
    const s = location.state as { aircraftId?: string; baseId?: string } | null;
    if (s?.aircraftId && s?.baseId) {
      setSelected({ kind: "aircraft", baseId: s.baseId, aircraftId: s.aircraftId });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsDropdownOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [searchOpen]);

  const allDrones = useMemo(() => allUnits.filter(isDrone), [allUnits]);
  useBoundaryCrossing(allUnits);
  const visibleUnits = useMemo(() => {
    if (isPlanMode) {
      // Include airborne aircraft that still live in planState.bases.units —
      // they were previously rendered by AircraftLayer; now harmonized via UnitsLayer.
      const baseAirborne = planState.bases
        .flatMap((b) => b.units)
        .filter((u) => u.affiliation === "friend");
      return [
        ...baseAirborne,
        ...planState.deployedUnits.filter((u) => u.affiliation === "friend"),
      ];
    }
    const nonRadar = allUnits.filter((u) => u.category !== "radar");
    return nonRadar.filter((unit) => !isDrone(unit));
  }, [allUnits, isPlanMode, planState.bases, planState.deployedUnits]);

  // ── Fog-of-war: compute friendly sensor discs, then classify hostile ships
  // and enemy bases/entities as visible / last-known / hidden. Friendlies in
  // `navalUnits` bypass the filter via `detectNavalUnits`.
  const sensorDiscs = useMemo(() => computeFriendlySensorCoverage(state), [state]);
  const navalVisibility = useMemo(() => detectNavalUnits(state, sensorDiscs), [state, sensorDiscs]);
  const enemyBaseVisibility = useMemo(() => detectEnemyBases(state, sensorDiscs), [state, sensorDiscs]);
  const enemyEntityVisibility = useMemo(() => detectEnemyEntities(state, sensorDiscs), [state, sensorDiscs]);

  // Units whose path-history trail should render (airborne/moving friendlies). Hidden in plan mode.
  const trailUnits = useMemo(
    () => isPlanMode ? [] : state.deployedUnits.filter((u) => u.pathHistory && u.pathHistory.length > 1),
    [state.deployedUnits, isPlanMode],
  );

  useEffect(() => {
    const onDragStart = (event: DragEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const dragSource = target.closest<HTMLElement>("[data-unit-drag-id]");
      const unitId = dragSource?.dataset.unitDragId;
      if (!unitId) return;
      const unit = allUnits.find((candidate) => candidate.id === unitId);
      if (!unit) return;

      setDraggingUnit({
        unitId: unit.id,
        unitName: unit.name,
      });
    };

    const onDragEnd = () => {
      setDraggingUnit(null);
      setDropCandidate(null);
    };

    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragEnd);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragEnd);
    };
  }, [allUnits]);

  const { adUnits, deployedAdUnits } = useTacticalMap();

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  // When a friendly base is clicked, highlight its units and dim everything else.
  const highlightBaseId = selected?.kind === "base" ? selected.baseId : null;
  // focusedBaseId (filter chip) takes priority over click-selection
  const effectiveDimBase = focusedBaseId ?? highlightBaseId;

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

  const selectedRoadBase =
    selected?.kind === "road_base"
      ? state.roadBases.find((rb) => rb.id === selected.id)
      : undefined;

  const selectedNaval =
    selected?.kind === "naval"
      ? state.navalUnits.find((n) => n.id === selected.id)
      : undefined;

  const selectedAircraftId = selected?.kind === "aircraft" ? selected.aircraftId : undefined;
  const selectedSatelliteId = selected?.kind === "satellite" ? selected.satelliteId : undefined;

  const selectedUnit = selected?.kind === "unit"
    ? allUnits.find((u) => u.id === selected.unitId)
    : undefined;
  const draggedUnit = draggingUnit
    ? allUnits.find((u) => u.id === draggingUnit.unitId)
    : undefined;

  const selectedSatellite = selected?.kind === "satellite"
    ? liveSatellites.find((satellite) => satellite.id === selected.satelliteId)
    : undefined;

  const selectedZone =
    selected?.kind === "zone"
      ? state.tacticalZones.find((z) => z.id === selected.zoneId)
      : undefined;

  const selectedAsset =
    selected?.kind === "asset"
      ? [...FIXED_MILITARY_ASSETS, ...AMMO_DEPOTS].find((a) => a.id === selected.assetId)
      : undefined;

  const selectedRadar =
    selected?.kind === "radar"
      ? enrichedRadarUnits.find((r) => r.id === selected.radarId)
      : undefined;

  // ── Travel range + battle intel ──────────────────────────────────────────
  const [travelRange, setTravelRange] = useState<TravelRangeMode>({
    enabled: false,
    returnBaseId: null,
    options: DEFAULT_TRAVEL_OPTS,
    autoPickBase: false,
    pinnedTargetId: null,
  });
  const [intelHover, setIntelHover] = useState<{ id: string; x: number; y: number } | null>(null);

  // Resolve which unit drives the travel-range overlay (mid-air unit OR aircraft at base).
  const travelRangeUnit = useMemo(() => {
    if (selectedUnit && isTravelRangeUnit(selectedUnit)) return selectedUnit;
    if (selectedAircraft) return selectedAircraft;
    return null;
  }, [selectedUnit, selectedAircraft]);

  // Reset travel-range mode when switching to a different selectable.
  const travelKey = travelRangeUnit?.id ?? "";
  useEffect(() => {
    setTravelRange((prev) => ({
      ...prev,
      pinnedTargetId: null,
      // Keep enabled state and options across the same unit; reset on unit change.
    }));
  }, [travelKey]);

  // Friendly bases (id + coords) for return-base picking.
  const friendlyBaseList = useMemo(
    () =>
      state.bases
        .map((b) => {
          const c = BASE_COORDS[b.id];
          return c ? { id: b.id, name: b.name, coords: c } : null;
        })
        .filter((x): x is { id: typeof state.bases[number]["id"]; name: string; coords: { lat: number; lng: number } } => x !== null),
    [state.bases]
  );

  // Effective max range + cruise speed for the active unit.
  const travelRangeStats = useMemo(() => {
    if (!travelRangeUnit) return null;
    return computeTravelRange(travelRangeUnit, travelRange.options);
  }, [travelRangeUnit, travelRange.options]);

  // Threat rings (SAM + radar) — used for path-threat warnings.
  const threatRings = useMemo(
    () => collectThreatRings(state.enemyBases, state.enemyEntities),
    [state.enemyBases, state.enemyEntities]
  );

  // Per-target intel (reachability + path threats).
  const intelByTarget = useMemo<TargetIntel[]>(() => {
    if (!travelRange.enabled || !travelRangeUnit || !travelRangeStats) return [];
    const maxRangeKm = travelRangeStats.maxRangeKm;
    const returnBase = travelRange.returnBaseId
      ? friendlyBaseList.find((b) => b.id === travelRange.returnBaseId) ?? null
      : null;

    type Target = { id: string; name: string; category: string; position: { lat: number; lng: number } };
    const targets: Target[] = [
      ...state.enemyBases
        .filter((b) => b.operationalStatus !== "destroyed")
        .map((b) => ({ id: `eb_${b.id}`, name: b.name, category: b.category, position: b.coords })),
      ...state.enemyEntities
        .filter((e) => e.operationalStatus !== "destroyed")
        .map((e) => ({ id: `ee_${e.id}`, name: e.name, category: e.category, position: e.coords })),
    ];

    return targets.map((t) => {
      const cls = classifyTarget(travelRangeUnit.position, t.position, maxRangeKm, returnBase?.coords ?? null);

      // Only compute path threats for reachable targets to keep cost down.
      let pathThreatened = false;
      if (cls.reachability !== "out_of_reach") {
        const segment = returnBase
          ? [travelRangeUnit.position, t.position, returnBase.coords]
          : [travelRangeUnit.position, t.position];
        pathThreatened = pathCrossesThreatRings(segment, threatRings).engagementCrossings.length > 0;
      }

      return {
        id: t.id,
        name: t.name,
        position: t.position,
        reachability: cls.reachability,
        pathThreatened,
      };
    });
  }, [
    travelRange.enabled,
    travelRange.returnBaseId,
    travelRangeUnit,
    travelRangeStats,
    state.enemyBases,
    state.enemyEntities,
    threatRings,
    friendlyBaseList,
  ]);

  // Battle-intel summary for the panel.
  const intelSummary = useMemo<BattleIntelSummary | undefined>(() => {
    if (!travelRange.enabled || intelByTarget.length === 0) return undefined;
    const reachable = intelByTarget.filter((i) => i.reachability !== "out_of_reach");
    return {
      reachableCount: reachable.length,
      strikeReturnCount: intelByTarget.filter((i) => i.reachability === "strike_return").length,
      strikeOnlyCount: intelByTarget.filter((i) => i.reachability === "strike_only").length,
      threatenedCount: reachable.filter((i) => i.pathThreatened).length,
    };
  }, [travelRange.enabled, intelByTarget]);

  // Auto-pick best return base for the pinned target (or the highest-priority reachable target).
  useEffect(() => {
    if (!travelRange.enabled || !travelRange.autoPickBase || !travelRangeUnit || !travelRangeStats) return;
    const targetIntel = travelRange.pinnedTargetId
      ? intelByTarget.find((t) => t.id === travelRange.pinnedTargetId)
      : intelByTarget.find((t) => t.reachability !== "out_of_reach");
    if (!targetIntel) return;
    const best = findBestReturnBase(
      travelRangeUnit.position,
      targetIntel.position,
      friendlyBaseList,
      travelRangeStats.maxRangeKm,
      travelRangeUnit.currentBase ?? null
    );
    if (best && best.baseId !== travelRange.returnBaseId) {
      setTravelRange((prev) => ({ ...prev, returnBaseId: best.baseId }));
    }
  }, [
    travelRange.enabled,
    travelRange.autoPickBase,
    travelRange.pinnedTargetId,
    travelRange.returnBaseId,
    travelRangeUnit,
    travelRangeStats,
    intelByTarget,
    friendlyBaseList,
  ]);

  // Auto-unpin if the pinned target is no longer reachable.
  useEffect(() => {
    if (!travelRange.pinnedTargetId) return;
    const t = intelByTarget.find((x) => x.id === travelRange.pinnedTargetId);
    if (t && t.reachability === "out_of_reach") {
      setTravelRange((prev) => ({ ...prev, pinnedTargetId: null }));
    }
  }, [travelRange.pinnedTargetId, intelByTarget]);

  // Esc to unpin.
  useEffect(() => {
    if (!travelRange.pinnedTargetId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTravelRange((prev) => ({ ...prev, pinnedTargetId: null }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [travelRange.pinnedTargetId]);

  // Coords + best-return for the currently-hovered enemy target (drives tooltip).
  const hoverTooltipData = useMemo(() => {
    if (!travelRange.enabled || !intelHover || !travelRangeUnit || !travelRangeStats) return null;
    const t = intelByTarget.find((x) => x.id === intelHover.id);
    if (!t) return null;
    const targetMeta = (() => {
      if (t.id.startsWith("eb_")) {
        const eb = state.enemyBases.find((b) => `eb_${b.id}` === t.id);
        return eb ? { name: eb.name, category: eb.category } : null;
      }
      const ee = state.enemyEntities.find((e) => `ee_${e.id}` === t.id);
      return ee ? { name: ee.name, category: ee.category } : null;
    })();
    if (!targetMeta) return null;

    const returnBase = travelRange.returnBaseId
      ? friendlyBaseList.find((b) => b.id === travelRange.returnBaseId) ?? null
      : null;
    const cls = classifyTarget(
      travelRangeUnit.position,
      t.position,
      travelRangeStats.maxRangeKm,
      returnBase?.coords ?? null
    );
    const segment = returnBase
      ? [travelRangeUnit.position, t.position, returnBase.coords]
      : [travelRangeUnit.position, t.position];
    const pathReport = pathCrossesThreatRings(segment, threatRings);

    const etaToTargetHours = etaHoursTo(travelRangeUnit.position, t.position, travelRangeStats.cruiseSpeedKts);
    const etaTargetToBaseHours = returnBase
      ? etaHoursTo(t.position, returnBase.coords, travelRangeStats.cruiseSpeedKts)
      : undefined;

    let bestReturn: BestReturnBase | null = null;
    if (cls.withinOneWay) {
      bestReturn = findBestReturnBase(
        travelRangeUnit.position,
        t.position,
        friendlyBaseList,
        travelRangeStats.maxRangeKm,
        travelRangeUnit.currentBase ?? null
      );
    }

    return {
      x: intelHover.x,
      y: intelHover.y,
      targetName: targetMeta.name,
      targetCategory: targetMeta.category,
      reachability: cls.reachability as Reachability,
      oneWayKm: cls.oneWayKm,
      roundTripKm: cls.roundTripKm,
      cruiseSpeedKts: travelRangeStats.cruiseSpeedKts,
      etaToTargetHours,
      etaTargetToBaseHours,
      maxRangeKm: travelRangeStats.maxRangeKm,
      pathThreats: pathReport.crossings,
      bestReturn,
      currentReturnBaseId: travelRange.returnBaseId,
    };
  }, [
    travelRange.enabled,
    travelRange.returnBaseId,
    intelHover,
    travelRangeUnit,
    travelRangeStats,
    intelByTarget,
    state.enemyBases,
    state.enemyEntities,
    friendlyBaseList,
    threatRings,
  ]);

  // Click an enemy intel halo → pin (or unpin if same).
  const togglePinTarget = useCallback((id: string) => {
    setTravelRange((prev) => ({
      ...prev,
      pinnedTargetId: prev.pinnedTargetId === id ? null : id,
    }));
  }, []);

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

  const handleFollow = useCallback((unitId: string) => {
    setFollowingUnitId((prev) => {
      if (prev === unitId) return null;
      const unit = allUnits.find((u) => u.id === unitId);
      if (unit) mapRef.current?.flyTo({ center: [unit.position.lng, unit.position.lat], zoom: 12, duration: 900 });
      return unitId;
    });
  }, [allUnits]);

  useEffect(() => {
    if (!followingUnitId) return;
    const unit = allUnits.find((u) => u.id === followingUnitId);
    if (!unit) { setFollowingUnitId(null); return; }
    mapRef.current?.easeTo({ center: [unit.position.lng, unit.position.lat], duration: 600 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUnits]);

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

  // When the active tab changes, load its snapshot into the plan reducer.
  useEffect(() => {
    if (activeTab) {
      planDispatch({ type: "LOAD_STATE", payload: activeTab.snapshot });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Auto-save planState to the active tab on every change.
  useEffect(() => {
    if (activeTabId) {
      updateActiveSnapshot(planState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planState]);

  const handleCreateTab = useCallback(() => {
    createTab();
    setPlacingMode(null);
    setIsDeployMode(false);
    setPlanMenuOpen(true);
  }, [createTab]);

  const handleSwitchTab = useCallback((id: string | null) => {
    switchTab(id);
    setPlacingMode(null);
    setIsDeployMode(false);
    setSelected(id === "plan-protect-ammo" ? { kind: "asset", assetId: "AMMO_ENKOPING" } : null);
    if (id !== null) {
      setPlanMenuOpen(true);
      // Fly to ammo depot when opening the protect-ammo plan
      if (id === "plan-protect-ammo") {
        setTimeout(() => mapRef.current?.flyTo({ center: [17.077, 59.635], zoom: 8.5, duration: 1400, pitch: 25 }), 80);
      }
    }
  }, [switchTab]);

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 900 });
  }, []);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (drawingMode !== "none") return;
    if (placingMode && e.lngLat) {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const d = placingMode.data;
      // Plan-mode placements go to the isolated plan reducer; live dispatch otherwise.
      const activeDispatch = isPlanMode ? planDispatch : dispatch;
      switch (placingMode.kind) {
        case "enemy_base":
          activeDispatch({ type: "PLAN_ADD_ENEMY_BASE", base: { name: d.name, category: d.category as any, threatLevel: d.threatLevel as any, operationalStatus: d.operationalStatus as any, estimates: d.estimates ?? "", notes: d.notes ?? "", threatRangeKm: d.threatRangeKm ? Number(d.threatRangeKm) : undefined, coords } });
          break;
        case "enemy_entity":
          activeDispatch({ type: "PLAN_ADD_ENEMY_ENTITY", entity: { name: d.name, category: d.category as any, threatLevel: d.threatLevel as any, operationalStatus: d.operationalStatus as any, estimates: d.estimates ?? "", notes: d.notes ?? "", coords } });
          break;
        case "friendly_base":
          activeDispatch({ type: "PLAN_ADD_FRIENDLY_MARKER", marker: { name: d.name, category: d.category as any, estimates: d.estimates ?? "", notes: d.notes ?? "", coords } });
          break;
        case "friendly_unit": {
          const baseId = d.baseId as import("@/types/game").BaseType;
          const category = d.category as UnitCategory;
          const subtype = d.subtype;
          const common = { name: d.name, position: coords, currentBase: baseId };
          const unit =
            category === "drone"
              ? createDeployedDroneUnit({
                  ...common,
                  type: subtype as "ISR_DRONE" | "STRIKE_DRONE",
                  payload: d.payload?.trim() || undefined,
                })
              : category === "aircraft"
                ? {
                    ...createAircraftUnit({
                      ...common,
                      type: subtype as import("@/types/game").AircraftType,
                      tailNumber: d.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || `AC${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
                    }),
                    status: "on_mission" as const,
                    movement: { state: "airborne" as const, speed: 0 },
                  }
                : category === "radar"
                  ? createRadarUnit({ ...common, type: subtype as "SEARCH_RADAR" | "TRACKING_RADAR" })
                  : category === "air_defense"
                    ? createAirDefenseUnit({ ...common, type: subtype as "SAM_SHORT" | "SAM_MEDIUM" | "SAM_LONG" })
                    : createGroundVehicleUnit({ ...common, type: subtype as "LOGISTICS_TRUCK" | "ARMORED_TRANSPORT" | "FUEL_BOWSER" });
          activeDispatch({ type: "PLAN_ADD_FRIENDLY_UNIT", unit });
          break;
        }
        case "road_base":
          activeDispatch({ type: "PLAN_ADD_ROAD_BASE", roadBase: { name: d.name, status: d.status as any, echelon: d.echelon as any, parentBaseId: d.parentBaseId, isDraggable: true, rangeRadius: Number(d.rangeRadius), coords } });
          break;
      }
      setPlacingMode(null);
      return;
    }
    setSelected(null);
  }, [placingMode, drawingMode, dispatch, isPlanMode]);

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

  const handleSetAor = useCallback((markerId: string, km: number) => {
    setAorOverrides((prev) => ({ ...prev, [markerId]: km }));
  }, []);

  const handleSelectAsset = useCallback((asset: FixedMilitaryAsset) => {
    setSelected({ kind: "asset", assetId: asset.id });
  }, []);

  const userZoneCount = state.tacticalZones.filter((z) => z.category === "user").length;

  // Panel header content
  const panelTitle = (() => {
    if (selectedAircraft) return { main: selectedAircraft.tailNumber, sub: `${selectedAircraft.type} · ${selectedBase?.name}` };
    if (selected?.kind === "unit" && selectedUnit) return { main: selectedUnit.name, sub: `${selectedUnit.category} · ${selectedUnit.affiliation}` };
    if (selectedZone) return { main: selectedZone.name, sub: selectedZone.category === "fixed" ? "Permanent skyddszon" : "Temporär zon" };
    if (selectedAsset) return { main: selectedAsset.name, sub: selectedAsset.type.replace("_", " ").toUpperCase() };
    if (selectedRadar) return { main: selectedRadar.name, sub: "Taktisk Radarstation" };
    if (selected?.kind === "base") return { main: selectedBase?.name ?? selected.baseId, sub: selectedBase?.type ?? "Reservbas" };
    if (selected?.kind === "enemy_base" && selectedEnemyBase) return { main: selectedEnemyBase.name, sub: "Fiendens bas" };
    if (selected?.kind === "enemy_entity" && selectedEnemyEntity) return { main: selectedEnemyEntity.name, sub: "Fiendens enhet" };
    if (selected?.kind === "road_base" && selectedRoadBase) return { main: selectedRoadBase.name, sub: "Vägbas" };
    if (selected?.kind === "naval" && selectedNaval) return { main: selectedNaval.name, sub: selectedNaval.affiliation === "hostile" ? "Fiendens fartyg" : "Svenskt fartyg" };
    return null;
  })();

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onTogglePause={togglePause} onSetSpeed={setGameSpeed} onReset={resetGame} />

      {/* Sub-header */}
      {/* Map header */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-3">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <h2 className="font-sans font-bold text-sm text-foreground tracking-wider shrink-0">
          TAKTISK KARTA
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground">
          Dag {state.day} · {state.phase}
        </span>
        <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-green inline-block" /> Hög beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-yellow inline-block" /> Medel beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-red inline-block" /> Låg beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Inaktiv bas</span>
          {/* Base filter badge */}
          <AnimatePresence>
            {focusedBaseId && (
              <motion.div
                key="base-filter-badge"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-1 border border-blue-500/50 bg-blue-500/10 rounded px-2 py-1"
              >
                <Target className="h-3 w-3 text-blue-400 flex-shrink-0" />
                <span className="text-[10px] font-mono font-bold text-blue-300">
                  {state.bases.find((b) => b.id === focusedBaseId)?.name ?? focusedBaseId}
                </span>
                <div className="flex gap-0.5 ml-1.5 border-l border-blue-500/30 pl-1.5">
                  {(["global", "base", "unit"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-all ${
                        filterLevel === level
                          ? "bg-blue-500/35 text-blue-200"
                          : "text-blue-500/50 hover:text-blue-300"
                      }`}
                    >
                      {level === "global" ? "GLOBAL" : level === "base" ? "BAS" : "ENHET"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={clearFilter}
                  className="ml-1 text-blue-400/60 hover:text-blue-200 transition-colors"
                  title="Rensa filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setShowAllBaseRings((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border font-bold transition-all text-[10px] font-mono ${
              showAllBaseRings
                ? "border-green-600/60 bg-green-600/15 text-green-400"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
            title="Visa bekämpningsringar för alla enheter"
          >
            <Layers3 className="h-3 w-3" />
            ALLA RINGAR
          </button>

          {/* Icon style toggle */}
          <button
            onClick={() => setIconStyle((s) => s === "custom" ? "nato" : "custom")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-bold transition-all text-[10px] font-mono ${
              iconStyle === "nato"
                ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-400"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
            title="Växla mellan egna ikoner och NATO-symboler"
          >
            {iconStyle === "nato" ? "NATO" : "IKON"}
          </button>

          {/* Boundary layer toggles */}
          {(["eez","fir","land"] as const).map((key) => {
            const labels: Record<string, string> = { eez: "EEZ", fir: "FIR", land: "LANDGRÄNS" };
            const colors: Record<string, string> = {
              eez:  "border-[#7B9CB0]/60 bg-[#7B9CB0]/10 text-[#7B9CB0]",
              fir:  "border-[#93C5FD]/60 bg-[#93C5FD]/10 text-[#93C5FD]",
              land: "border-gray-400/60 bg-gray-400/10 text-gray-400",
            };
            const on = boundaryVis[key];
            return (
              <button
                key={key}
                onClick={() => setBoundaryVis((v) => ({ ...v, [key]: !v[key] }))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded border font-bold transition-all text-[10px] font-mono ${
                  on ? colors[key] : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                title={`Visa/dölj ${labels[key]}-gräns`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>

        {/* Plan tabs */}
        <div className="flex items-center gap-1 ml-4 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {/* LIVE tab */}
          <button
            onClick={() => { handleSwitchTab(null); setIsDeployMode(false); setPlacingMode(null); }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono font-bold border transition-all shrink-0 ${
              !isPlanMode && !isDeployMode
                ? "bg-green-600/15 border-green-600/50 text-green-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            LIVE
          </button>

          {/* Deploy button */}
          <button
            onClick={() => {
              if (isPlanMode) handleSwitchTab(null);
              setIsDeployMode((v) => !v);
              setPlacingMode(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono font-bold border transition-all shrink-0 ${
              isDeployMode
                ? "bg-orange-600/15 border-orange-600/50 text-orange-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-2.5 w-2.5" />
            DEPLOY
          </button>

          {/* Plan toggle button */}
          <button
            onClick={() => setPlanMenuOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono font-bold border transition-all shrink-0 ${
              planMenuOpen || isPlanMode
                ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenLine className="h-2.5 w-2.5" />
            Plan
          </button>

          {/* Expanded plan tabs + new plan button */}
          {planMenuOpen && (
            <>
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center shrink-0"
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("plan-tab-id", tab.id); e.dataTransfer.effectAllowed = "move"; }}
                >
                  <button
                    onClick={() => handleSwitchTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-l text-[10px] font-mono font-bold border border-r-0 transition-all ${
                      activeTabId === tab.id
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PenLine className="h-2.5 w-2.5" />
                    {tab.name}
                  </button>
                  <button
                    onClick={() => deleteTab(tab.id)}
                    className={`flex items-center px-1.5 py-1 rounded-r text-[10px] border transition-all ${
                      activeTabId === tab.id
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-400 hover:text-red-400"
                        : "border-border text-muted-foreground hover:text-red-400"
                    }`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              {tabs.length < 8 && (
                <button
                  onClick={handleCreateTab}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border border-dashed border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-400 transition-all shrink-0"
                >
                  + Ny plan
                </button>
              )}
            </>
          )}

          {/* Execution slot — drag a plan tab here to execute it */}
          {tabs.length > 0 && (
            <div
              onDragOver={(e) => { if (e.dataTransfer.types.includes("plan-tab-id")) { e.preventDefault(); setDragOverExecute(true); } }}
              onDragLeave={() => setDragOverExecute(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverExecute(false);
                const tabId = e.dataTransfer.getData("plan-tab-id");
                const tabToExecute = tabs.find((t) => t.id === tabId);
                if (!tabToExecute) return;
                executePlan(tabToExecute, dispatch);
                deleteTab(tabId);
                handleSwitchTab(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono border border-dashed transition-all shrink-0 ml-2 ${
                dragOverExecute
                  ? "bg-green-600/20 border-green-500/70 text-green-400"
                  : "border-green-700/40 text-green-700/60 hover:border-green-600/50 hover:text-green-600/80"
              }`}
              title="Dra en plan hit för att exekvera den"
            >
              <PlayCircle className="h-2.5 w-2.5" />
              {dragOverExecute ? "Släpp för att exekvera" : "Exekvera plan"}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-green inline-block" /> Hög</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-yellow inline-block" /> Medel</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-red inline-block" /> Låg</span>
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* Plan mode sidebar */}
        <AnimatePresence>
          {isPlanMode && activeTab && (
            <motion.div
              key="plan-sidebar"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[300px] flex-shrink-0 border-r border-border bg-card overflow-hidden flex flex-col"
            >
              <PlanModeSidebar
                tab={activeTab}
                state={planState}
                dispatch={planDispatch}
                onStartPlacement={handleStartPlacement}
                onFinalizePlan={() => setShowPlanReview(true)}
                onRename={(name) => renameTab(activeTab.id, name)}
                onFlyTo={handleFlyTo}
                onSelectUnit={(unitId) => setSelected({ kind: "unit", unitId })}
                delays={activeTab.delays}
                onSetDelay={setDelay}
                showRings={showPlanRings}
                onToggleRings={() => setShowPlanRings((p) => !p)}
              />
            </motion.div>
          )}
          {isDeployMode && (
            <motion.div
              key="deploy-sidebar"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[300px] flex-shrink-0 border-r border-border bg-card overflow-hidden flex flex-col"
            >
              <DeployModeSidebar
                state={state}
                dispatch={dispatch}
                onStartPlacement={handleStartPlacement}
                onClose={() => { setIsDeployMode(false); setPlacingMode(null); }}
                onFlyTo={handleFlyTo}
                onFollow={handleFollow}
                followingUnitId={followingUnitId}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail panel — friendly base/aircraft or enemy */}
        <AnimatePresence>
          {selected && panelTitle && (
            <motion.div
              key="detail"
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[340px] flex-shrink-0 border-r border-border bg-card overflow-y-auto flex flex-col"
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
                  ) : panelTitle ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        {(selected?.kind === "enemy_base" || selected?.kind === "enemy_entity") && (
                          selected.kind === "enemy_base"
                            ? <Crosshair className="h-3.5 w-3.5 text-red-400" />
                            : <Swords className="h-3.5 w-3.5 text-red-300" />
                        )}
                        <div className="text-xs font-bold text-foreground font-mono">{panelTitle.main}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">{panelTitle.sub}</div>
                      {selected?.kind === "base" && selectedBase && (
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/${selectedBase.id}`)}
                          className="mt-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[10px] font-mono font-bold uppercase tracking-wider transition-all hover:brightness-105"
                          style={{
                            color: "#0C234C",
                            background: "rgba(215,171,58,0.14)",
                            borderColor: "rgba(215,171,58,0.42)",
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Visa i dashboarden
                          </span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-xs font-bold text-foreground font-mono">
                      {(selected as any).baseId ?? (selected as any).zoneId ?? (selected as any).assetId}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {selected?.kind === "base" && selectedBase && (
                    <button
                      onClick={() =>
                        focusedBaseId === selectedBase.id
                          ? clearFilter()
                          : setFocusedBase(selectedBase.id as import("@/types/game").BaseType)
                      }
                      className={`p-1 rounded transition-colors ${
                        focusedBaseId === selectedBase.id
                          ? "text-blue-400 bg-blue-500/15"
                          : "text-muted-foreground hover:text-blue-400"
                      }`}
                      title={focusedBaseId === selectedBase.id ? "Rensa filter" : "Fokusera på denna bas"}
                    >
                      <Target className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {selectedUnit && isDrone(selectedUnit) ? (
                <DroneDetailPanel
                  drone={selectedUnit}
                  onBack={() => setSelected(null)}
                  onRecall={recallDrone}
                  onUpdateWaypoints={updateDroneWaypoints}
                  onSetOverlay={setDroneOverlay}
                  onDeploy={() => {}}
                  planningMode={isPlanMode}
                  travelRange={travelRange}
                  onTravelRangeChange={setTravelRange}
                  travelRangeBases={friendlyBaseList}
                  battleIntelSummary={intelSummary}
                />
              ) : selectedUnit && isAircraft(selectedUnit) ? (
                <AircraftDetailPanel
                  aircraft={selectedUnit}
                  onBack={() => setSelected(null)}
                  onRecall={() => {
                    // Map "Återkalla" to a unit recall (works for airborne aircraft).
                    dispatch({ type: "RECALL_UNIT", unitId: selectedUnit.id });
                  }}
                  currentHour={state.hour}
                  travelRange={travelRange}
                  onTravelRangeChange={setTravelRange}
                  travelRangeBases={friendlyBaseList}
                  battleIntelSummary={intelSummary}
                />
              ) : selectedUnit ? (
                <UnitDetailPanel
                  unit={selectedUnit}
                  isAtBase={state.bases.some((b) => b.units.some((u) => u.id === selectedUnit.id))}
                  allBases={state.bases.map((b) => ({ id: b.id, name: b.name }))}
                  travelRange={travelRange}
                  onTravelRangeChange={setTravelRange}
                  travelRangeBases={friendlyBaseList}
                  battleIntelSummary={intelSummary}
                />
              ) : selectedSatellite ? (
                <SatelliteDetailPanel satellite={selectedSatellite} />
              ) : selectedAircraft && selected.kind === "aircraft" ? (
                 <AircraftDetailPanel
                   aircraft={selectedAircraft}
                   onBack={() => setSelected({ kind: "base", baseId: (selected as any).baseId })}
                   onRecall={handleRecall}
                   currentHour={state.hour}
                   travelRange={travelRange}
                   onTravelRangeChange={setTravelRange}
                   travelRangeBases={friendlyBaseList}
                   battleIntelSummary={intelSummary}
                 />
               ) : selectedRadar ? (
                 <RadarControlPanel
                   unit={selectedRadar}
                   onClose={() => setSelected(null)}
                   onUpdate={(updates) => handleUpdateRadar(selectedRadar.id, updates)}
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
                <AssetInfoPanel
                  asset={selectedAsset}
                  aorRadiusKm={aorOverrides[selectedAsset.id] ?? selectedAsset.defaultAorRadiusKm}
                  onSetAor={(km) => handleSetAor(selectedAsset.id, km)}
                />
              ) : selected?.kind === "base" && selectedBase ? (
                <BaseDetailPanel
                  base={selectedBase}
                  deployedUnits={state.deployedUnits}
                  onSelectAircraft={(id) =>
                    setSelected({ kind: "aircraft", baseId: selectedBase.id, aircraftId: id })
                  }
                  onSelectUnit={(id) => setSelected({ kind: "unit", unitId: id })}
                  aorRadiusKm={aorOverrides[selectedBase.id] ?? BASE_RINGS[selectedBase.id]?.defaultAorRadiusKm ?? 50}
                  onSetAor={(km) => handleSetAor(selectedBase.id, km)}
                />
              ) : selected?.kind === "base" ? (
                <div className="p-4 text-xs text-muted-foreground">
                  Bas ej aktiv i detta scenario.
                </div>
              ) : selected?.kind === "road_base" && selectedRoadBase ? (
                <RoadBaseDetailPanel
                  roadBase={selectedRoadBase}
                  isPlanMode={isPlanMode}
                  dispatch={dispatch}
                  onSetRange={(km) => handleSetAor(selectedRoadBase.id, km)}
                  rangeRadiusKm={aorOverrides[selectedRoadBase.id] ?? selectedRoadBase.rangeRadius}
                />
              ) : selected?.kind === "enemy_base" && selectedEnemyBase ? (
                <EnemyBaseDetailPanel
                  base={selectedEnemyBase}
                  report={state.intelReports?.[selectedEnemyBase.id]}
                />
              ) : selected?.kind === "enemy_entity" && selectedEnemyEntity ? (
                <EnemyEntityDetailPanel entity={selectedEnemyEntity} />
              ) : selected?.kind === "naval" && selectedNaval ? (
                <NavalDetailPanel unit={selectedNaval} />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map area */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            cursor: placingMode ? PLACEMENT_CURSOR : draggingUnit ? "grabbing" : undefined,
            ...(mapLayerState.dampColors ? { filter: "saturate(0.5) grayscale(0.3)" } : {}),
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!draggingUnit) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const lngLat = mapRef.current?.getMap().unproject([
              e.clientX - rect.left,
              e.clientY - rect.top,
            ]);
            if (lngLat) {
              setDropCandidate({ lat: lngLat.lat, lng: lngLat.lng });
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setDropCandidate(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const unitId = e.dataTransfer.getData("text/plain");
            if (!unitId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const lngLat = mapRef.current?.getMap().unproject([
              e.clientX - rect.left,
              e.clientY - rect.top,
            ]);
            if (!lngLat) return;
            dispatch({ type: "DEPLOY_UNIT", unitId, destination: { lat: lngLat.lat, lng: lngLat.lng } });
            setSelected({ kind: "unit", unitId });
            setDraggingUnit(null);
            setDropCandidate(null);
          }}
        >
          <MapGL
            ref={mapRef}
            initialViewState={{
              longitude: STOCKHOLM_CENTER.lng,
              latitude: STOCKHOLM_CENTER.lat,
              zoom: TACTICAL_ZOOM,
              pitch: 0,
            }}
            mapStyle={
              mapLayerState.baseMap === "topo"      ? TOPO_STYLE :
              mapLayerState.baseMap === "satellite" ? SATELLITE_STYLE :
              mapLayerState.baseMap === "minimal"   ? MINIMAL_STYLE :
              mapLayerState.baseMap === "dark"      ? DARK_STYLE :
              MAP_STYLE  // "voyager" — default
            }
            onClick={handleMapClick}
            onLoad={handleMapLoad}
            onZoom={(e) => setZoom(e.viewState.zoom)}
            onDragStart={() => { isFollowing.current = false; followStartTime.current = null; setFollowingUnitId(null); }}
            onMouseMove={(e: MapLayerMouseEvent) =>
              setHudCursor({ lat: e.lngLat.lat, lng: e.lngLat.lng })
            }
            onMouseOut={() => setHudCursor(null)}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="bottom-right" />

            {/* Ocean overlay — rendered first so it sits below all other layers */}
            {(mapLayerState.overlays.ocean.active || hoveredOverlayKey === "ocean") && (
              <Source
                id="terrain-ocean"
                type="raster"
                tiles={OCEAN_TILES}
                tileSize={256}
                attribution="Tiles © Esri"
              >
                <Layer
                  id="terrain-ocean-layer"
                  type="raster"
                  paint={{
                    "raster-opacity": hoveredOverlayKey === "ocean" && !mapLayerState.overlays.ocean.active
                      ? (mapLayerState.overlays.ocean.opacity * 0.5) / 100
                      : mapLayerState.overlays.ocean.opacity / 100,
                    // Nudge toward teal to emphasise water bodies as flight corridors
                    "raster-saturation": 0.4,
                    "raster-hue-rotate": 15,
                  }}
                />
              </Source>
            )}

            {/* Railroad overlay — Esri World Transportation */}
            {state?.overlayVisibility?.railroad && (
              <Source
                id="railroad"
                type="raster"
                tiles={RAILROAD_TILES}
                tileSize={256}
                attribution="Tiles © Esri"
              >
                <Layer
                  id="railroad-layer"
                  type="raster"
                  paint={{ "raster-opacity": 0.8 }}
                />
              </Source>
            )}

            {/* Hillshade — uses MapLibre's native hillshade layer type, rendered inside GL
                so it sits below zones/rings/markers automatically. Disabled on satellite
                because the imagery already contains its own terrain shadows. */}
            {(mapLayerState.overlays.hillshade.active || hoveredOverlayKey === "hillshade") &&
              mapLayerState.baseMap !== "satellite" && (
              <Source
                id="terrain-dem"
                type="raster-dem"
                tiles={[TERRARIUM_TILES]}
                tileSize={256}
                encoding="terrarium"
              >
                <Layer
                  id="terrain-hillshade"
                  type="hillshade"
                  paint={{
                    "hillshade-shadow-color": "#1e2d40",
                    "hillshade-highlight-color": "#d0d8e8",
                    "hillshade-accent-color": "#3a4a5c",
                    // exaggeration (0–1) doubles as opacity — driven by the per-overlay slider
                    "hillshade-exaggeration": hoveredOverlayKey === "hillshade" && !mapLayerState.overlays.hillshade.active
                      ? (mapLayerState.overlays.hillshade.opacity * 0.5) / 100
                      : mapLayerState.overlays.hillshade.opacity / 100,
                    "hillshade-illumination-direction": 335,
                  }}
                />
              </Source>
            )}

            {/* County/region borders — base geographic reference layer */}
            <RegionBordersLayer />

            {/* EEZ + FIR boundary lines */}
            <GeoBoundariesLayer vis={boundaryVis} />

            {/* Tactical zone fills — exclude auto-generated fixed-asset protection zones */}
            <TacticalZonesLayer
              zones={(state?.tacticalZones ?? []).filter((z) => z.category !== "fixed")}
              visible={state?.overlayVisibility?.activeZones ?? false}
            />

            {/* Two-ring overlay — rendered above zone fills so rings stay visible */}
            <MarkerRingsLayer
              aorOverrides={aorOverrides}
              visibleLayers={state?.overlayVisibility ?? ({} as any)}
              roadBases={state?.roadBases ?? []}
              visibleBaseIds={ringBaseIds}
            />

            <SupplyLinesLayer bases={state?.bases ?? []} />

            {visibleViews.moln && <CloudLayer onUpdate={setCloudSummary} />}
            {visibleViews.vind && <WindLayer />}
            {visibleViews.satelliter && (
              <SatelliteLayer
                onUpdate={handleSatelliteUpdate}
                onSelectSatellite={(satelliteId) => setSelected({ kind: "satellite", satelliteId })}
                selectedSatelliteId={selectedSatelliteId}
                onPositionUpdate={selectedSatelliteId ? handleSatellitePositionUpdate : undefined}
              />
            )}
            <AircraftIncursionWatcher
              bases={state?.bases ?? []}
              currentHour={state?.hour ?? 0}
              tacticalZones={state.tacticalZones}
              dispatch={dispatch}
            />

            {/* Fixed military & civilian asset markers */}
            <FixedAssetMarkers
              showMilitaryBases={state.overlayVisibility.militaryBases}
              showCriticalInfra={state.overlayVisibility.criticalInfra}
              flygvapnetMode={state.overlayVisibility.flygvapnet}
              onSelectAsset={handleSelectAsset}
              selectedAssetId={selected?.kind === "asset" ? selected.assetId : null}
            />

            {/* Breadcrumb trails (rendered BEFORE unit markers so they sit underneath).
                The selected unit gets a FlightRadar-style bright gradient trail. */}
            <UnitPathTrailsLayer
              units={trailUnits}
              selectedUnitId={
                selected?.kind === "unit"
                  ? selected.unitId
                  : selected?.kind === "aircraft"
                    ? selected.aircraftId
                    : null
              }
            />

            <UnitsLayer
              units={visibleUnits}
              onSelectUnit={(unitId) => setSelected({ kind: "unit", unitId })}
              selectedUnitId={selected?.kind === "unit" ? selected.unitId : null}
              focusedBaseId={effectiveDimBase}
              iconStyle={isPlanMode ? "nato" : iconStyle}
              isPlanMode={isPlanMode}
            />

            {/* Naval units — friendly picket + hostile ships (fog-of-war gated) */}
            <NavalUnitsLayer
              visible={navalVisibility.visible}
              lastKnown={navalVisibility.lastKnown}
              onSelect={(id) => setSelected({ kind: "naval", id })}
              selectedId={selected?.kind === "naval" ? selected.id : null}
              iconStyle={iconStyle}
              highlightBaseId={effectiveDimBase}
            />

            <DroneLayer
              drones={allDrones}
              selectedDroneId={selected?.kind === "unit" && allDrones.some(d => d.id === (selected as any).unitId) ? (selected as any).unitId : null}
              onSelectDrone={(droneId) => setSelected({ kind: "unit", unitId: droneId })}
              iconStyle={iconStyle}
              highlightBaseId={effectiveDimBase}
            />
            {state.overlayVisibility.drones && (
              <>
                <DroneRangeOverlay drones={allDrones} />
                <DroneConnectionLine drones={allDrones} />
              </>
            )}

            <AirDefenseRingsLayer
              units={isPlanMode
                ? (showPlanRings ? planState.deployedUnits.filter(isAirDefense) as import("@/types/units").AirDefenseUnit[] : [])
                : deployedAdUnits}
              selectedUnitId={selected?.kind === "unit" ? selected.unitId : null}
              alwaysShowAll={isPlanMode && showPlanRings}
              radarUnits={isPlanMode && showPlanRings
                ? planState.deployedUnits.filter(isRadar) as import("@/types/units").RadarUnit[]
                : undefined}
            />

            <ThreatRingsLayer
              enemyBases={isPlanMode ? planState.enemyBases : state.enemyBases}
            />

            {/* Travel-range geometric overlay */}
            {travelRange.enabled && travelRangeUnit && travelRangeStats && travelRangeStats.maxRangeKm > 0 && (
              <TravelRangeOverlay
                unitPosition={travelRangeUnit.position}
                maxRangeKm={travelRangeStats.maxRangeKm}
                returnBase={
                  travelRange.returnBaseId
                    ? friendlyBaseList.find((b) => b.id === travelRange.returnBaseId) ?? null
                    : null
                }
              />
            )}

            {/* Battle-intel overlay (halos + strike route) */}
            {travelRange.enabled && travelRangeUnit && travelRangeStats && intelByTarget.length > 0 && (
              <BattleIntelOverlay
                intelByTarget={intelByTarget}
                unitPosition={travelRangeUnit.position}
                pinnedTargetId={travelRange.pinnedTargetId}
                returnBaseCoords={
                  travelRange.returnBaseId
                    ? friendlyBaseList.find((b) => b.id === travelRange.returnBaseId)?.coords ?? null
                    : null
                }
                threatRings={threatRings}
              />
            )}

            {draggingUnit && dropCandidate && (
              <Marker longitude={dropCandidate.lng} latitude={dropCandidate.lat} anchor="center">
                <div className="pointer-events-none relative">
                  <div
                    className="absolute left-1/2 top-1/2 rounded-full border border-red-400/60 bg-red-500/10"
                    style={{
                      width: 116,
                      height: 116,
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 30px rgba(220,38,38,0.16)",
                    }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-red-400"
                    style={{ transform: "translate(-50%, -50%)" }}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 rounded-md border px-2 py-1 text-[10px] font-mono text-red-200"
                    style={{
                      transform: "translate(-50%, calc(-50% + 70px))",
                      background: "rgba(8,17,32,0.92)",
                      borderColor: "rgba(220,38,38,0.35)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {draggedUnit ? draggedUnit.name : draggingUnit.unitName}
                  </div>
                </div>
              </Marker>
            )}

            <WTALayer
              adUnits={adUnits}
              enemyEntities={state.enemyEntities}
              enemyBases={state.enemyBases}
            />

            {state.bases.map((base) => (
              <BaseMarker
                key={base.id}
                id={base.id}
                base={base}
                isSelected={
                  (selected?.kind === "base" || selected?.kind === "aircraft") && selected.baseId === base.id
                }
                onClick={() => setSelected({ kind: "base", baseId: base.id })}
                flygvapnetMode={state.overlayVisibility.flygvapnet}
                showAirbases={true}
                dimmed={focusedBaseId !== null && base.id !== focusedBaseId}
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
            {/* Enemy bases — fog-of-war in live mode; all plan entities shown as placeholders in plan mode */}
            {isPlanMode
              ? planState.enemyBases.map((eb) => (
                  <EnemyMarker
                    key={eb.id}
                    base={eb}
                    isSelected={selected?.kind === "enemy_base" && selected.id === eb.id}
                    onClick={() => setSelected({ kind: "enemy_base", id: eb.id })}
                    isPlaceholder
                  />
                ))
              : enemyBaseVisibility.visible.map((eb) => {
                  const intelId = `eb_${eb.id}`;
                  const intel = travelRange.enabled ? intelByTarget.find((i) => i.id === intelId) : undefined;
                  const dimmed = intel?.reachability === "out_of_reach";
                  const intelClick = travelRange.enabled && intel
                    ? () => togglePinTarget(intelId)
                    : () => setSelected({ kind: "enemy_base", id: eb.id });
                  return (
                    <EnemyMarker
                      key={eb.id}
                      base={eb}
                      isSelected={selected?.kind === "enemy_base" && selected.id === eb.id}
                      onClick={intelClick}
                      dimmed={dimmed}
                      onHoverEnter={travelRange.enabled ? (x, y) => setIntelHover({ id: intelId, x, y }) : undefined}
                      onHoverMove={travelRange.enabled ? (x, y) => setIntelHover({ id: intelId, x, y }) : undefined}
                      onHoverLeave={travelRange.enabled ? () => setIntelHover(null) : undefined}
                    />
                  );
                })
            }
            {isPlanMode
              ? planState.enemyEntities.map((ee) => (
                  <EnemyEntityMarker
                    key={ee.id}
                    entity={ee}
                    isSelected={selected?.kind === "enemy_entity" && selected.id === ee.id}
                    onClick={() => setSelected({ kind: "enemy_entity", id: ee.id })}
                    isPlaceholder
                    iconStyle={iconStyle}
                  />
                ))
              : enemyEntityVisibility.visible.map((ee) => {
                  const intelId = `ee_${ee.id}`;
                  const intel = travelRange.enabled ? intelByTarget.find((i) => i.id === intelId) : undefined;
                  const dimmed = intel?.reachability === "out_of_reach";
                  const intelClick = travelRange.enabled && intel
                    ? () => togglePinTarget(intelId)
                    : () => setSelected({ kind: "enemy_entity", id: ee.id });
                  return (
                    <EnemyEntityMarker
                      key={ee.id}
                      entity={ee}
                      isSelected={selected?.kind === "enemy_entity" && selected.id === ee.id}
                      onClick={intelClick}
                      iconStyle={iconStyle}
                      dimmed={dimmed}
                      onHoverEnter={travelRange.enabled ? (x, y) => setIntelHover({ id: intelId, x, y }) : undefined}
                      onHoverMove={travelRange.enabled ? (x, y) => setIntelHover({ id: intelId, x, y }) : undefined}
                      onHoverLeave={travelRange.enabled ? () => setIntelHover(null) : undefined}
                    />
                  );
                })
            }
            {(isPlanMode ? planState.friendlyMarkers : state.friendlyMarkers).map((fm) => (
              <FriendlyMarkerPin key={fm.id} marker={fm} isPlaceholder={isPlanMode} />
            ))}
            {(isPlanMode ? planState.friendlyEntities : state.friendlyEntities).map((fe) => (
              <FriendlyEntityPin key={fe.id} entity={fe} isPlaceholder={isPlanMode} />
            ))}
            {(isPlanMode ? planState.roadBases : state.roadBases).map((rb) => (
              <RoadBaseMarker
                key={rb.id}
                roadBase={rb}
                isPlanMode={isPlanMode}
                isSelected={selected?.kind === "road_base" && selected.id === rb.id}
                onSelect={() => setSelected({ kind: "road_base", id: rb.id })}
                dispatch={isPlanMode ? planDispatch : dispatch}
                dimmed={focusedBaseId !== null && rb.parentBaseId !== focusedBaseId}
              />
            ))}


            {/* Drawing preview SVG overlay (inside MapGL so it uses map coordinates) */}
            <DrawingPreviewOverlay drawState={drawState} />

            {state?.overlayVisibility?.radarUnits && (
              <RadarLayer
                units={enrichedRadarUnits}
                zoom={zoom}
                onUpdateUnit={handleUpdateRadar}
                selectedId={selected?.kind === "radar" ? selected.radarId : null}
                onSelect={(id) => setSelected(id ? { kind: "radar", radarId: id } : null)}
              />
            )}

            {/* Canvas radar pulse — rendered inside MapGL container so it overlays the tiles */}
            {state?.overlayVisibility?.radarUnits && (
              <RadarPulseLayer units={enrichedRadarUnits} />
            )}

            {/* Baltic-incursion scenario visualisations (vectors, group bbox,
             *  radar→contact link, spawn pulse, hover ring, Kalibr range). */}
            <ScenarioOverlay
              state={state}
              hoveredContactId={scnHoveredContactId}
            />

            {/* Firing / engagement range ring(s) */}
            <SelectionRangeRing
              selectedUnit={selectedUnit}
              selectedNaval={selectedNaval}
              selectedEnemyEntity={selectedEnemyEntity}
              selectedEnemyBase={selectedEnemyBase}
              showAll={showAllBaseRings}
              allUnits={allUnits}
              allNaval={state.navalUnits}
              allEnemyEntities={state.enemyEntities}
              allEnemyBases={state.enemyBases}
            />
          </MapGL>

          {/* Battle-intel hover tooltip (positioned above the map in screen space) */}
          {hoverTooltipData && (
            <BattleIntelTooltip {...hoverTooltipData} />
          )}

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

          {draggingUnit && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pointer-events-none">
              <div
                className="mt-4 px-4 py-2 rounded font-mono text-xs flex items-center gap-3"
                style={{
                  background: dropCandidate ? "rgba(34,197,94,0.16)" : "rgba(8,17,32,0.88)",
                  border: dropCandidate ? "1px solid rgba(34,197,94,0.55)" : "1px solid rgba(220,38,38,0.35)",
                  color: dropCandidate ? "#bbf7d0" : "#fca5a5",
                  boxShadow: "0 12px 30px rgba(2,6,23,0.35)",
                }}
              >
                <span>
                  {dropCandidate
                    ? `Slapp ${draggingUnit.unitName} for att gruppera luftvarnet`
                    : `Dra ${draggingUnit.unitName} till kartan for att gruppera luftvarnet`}
                </span>
              </div>
            </div>
          )}

          {/* Search bar + combined layer dropdown — top left */}
          <div
            ref={dropdownRef}
            className="absolute top-3 left-14 z-20 flex items-center gap-2"
            style={{ pointerEvents: "auto" }}
          >
            <div ref={searchRef} className="relative">
              <input
                type="text"
                placeholder="Sök position eller enhet..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => { if (searchQuery) setSearchOpen(true); }}
                className="h-9 w-60 rounded-full px-4 text-sm font-mono text-gray-700 outline-none"
                style={{
                  background: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(45,90,39,0.28)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
                }}
              />
              {searchOpen && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden"
                  style={{
                    width: 280,
                    background: "rgba(8,17,32,0.97)",
                    border: "1px solid rgba(103,232,249,0.18)",
                    boxShadow: "0 8px 32px rgba(2,6,23,0.55)",
                    backdropFilter: "blur(18px)",
                    zIndex: 50,
                  }}
                >
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                      onClick={() => {
                        mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 11, duration: 900 });
                        setSearchQuery("");
                        setSearchOpen(false);
                      }}
                    >
                      <span className="text-sm font-mono truncate" style={{ color: "#e2e8f0" }}>{r.label}</span>
                      <span className="text-[10px] tracking-wider flex-shrink-0" style={{ color: "#67e8f9" }}>{r.sublabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Combined dropdown trigger */}
            <button
              onClick={() => setIsDropdownOpen((v) => !v)}
              title="Kartlager och verktyg"
              className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: isDropdownOpen ? "rgba(103,232,249,0.15)" : "rgba(255,255,255,0.90)",
                border: isDropdownOpen ? "1.5px solid rgba(103,232,249,0.5)" : "1px solid rgba(45,90,39,0.28)",
                color: isDropdownOpen ? "#67e8f9" : "#2D5A27",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
              }}
            >
              <Layers3 size={16} />
            </button>

            {/* Combined dropdown panel */}
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-2 rounded-2xl overflow-hidden overflow-y-auto"
                style={{
                  width: 320,
                  maxHeight: "80vh",
                  background: "linear-gradient(180deg, rgba(8,17,32,0.97), rgba(4,10,20,0.94))",
                  border: "1px solid rgba(103,232,249,0.18)",
                  boxShadow: "0 24px 60px rgba(2,6,23,0.55), inset 0 1px 0 rgba(103,232,249,0.08)",
                  backdropFilter: "blur(18px)",
                }}
              >
                {/* ── KARTLAGER — map mode toggles ── */}
                <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: "rgba(103,232,249,0.10)" }}>
                  <div className="text-[9px] tracking-[0.32em] mb-3" style={{ color: "#67e8f9" }}>KARTLAGER</div>
                  <div className="grid grid-cols-2 gap-2">
                    {MAP_MODE_OPTIONS.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = visibleViews[mode.id];
                      const accent = mode.id === "hotzoner" ? "#f87171" : mode.id === "moln" ? "#cbd5e1" : "#67e8f9";
                      return (
                        <button
                          key={mode.id}
                          onClick={() => toggleView(mode.id)}
                          className="rounded-xl border px-3 py-2.5 text-left transition-all"
                          style={{
                            borderColor: isActive ? `${accent}73` : "rgba(148,163,184,0.14)",
                            background: isActive
                              ? mode.id === "hotzoner"
                                ? "linear-gradient(180deg, rgba(127,29,29,0.72), rgba(69,10,10,0.88))"
                                : "linear-gradient(180deg, rgba(10,65,92,0.65), rgba(6,26,43,0.88))"
                              : "rgba(15,23,42,0.45)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Icon className="h-3.5 w-3.5" style={{ color: isActive ? accent : "#94a3b8" }} />
                            <span className="rounded-full border px-1.5 py-0.5 text-[8px] tracking-[0.18em]"
                              style={{
                                color: isActive ? "#4ade80" : "#94a3b8",
                                borderColor: isActive ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.2)",
                                background: isActive ? "rgba(34,197,94,0.08)" : "rgba(148,163,184,0.08)",
                              }}>
                              {isActive ? "PÅ" : "AV"}
                            </span>
                          </div>
                          <div className="mt-1.5 text-[11px] font-bold tracking-[0.1em]" style={{ color: "#f8fafc" }}>
                            {mode.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-panels when a mode is active */}
                {visibleViews.satelliter && (
                  <SatelliteModePanel
                    satellites={liveSatellites}
                    selectedSatelliteId={selectedSatelliteId}
                    onSelectSatellite={(satelliteId) => setSelected({ kind: "satellite", satelliteId })}
                  />
                )}
                {visibleViews.vind && <WindModePanel />}
                {visibleViews.moln && <CloudModePanel summary={cloudSummary} />}
                {visibleViews.hotzoner && <PlaceholderModePanel mode="hotzoner" />}

                {/* ── RITVERKTYG — drawing tools ── */}
                <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(103,232,249,0.10)" }}>
                  <div className="text-[9px] tracking-[0.32em] mb-2" style={{ color: "#67e8f9" }}>RITVERKTYG</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DRAW_TOOLS.map(({ mode, label, color }) => {
                      const isActive = drawingMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setDrawingMode(isActive ? "none" : mode)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all text-[10px] font-mono"
                          style={{
                            borderColor: isActive ? color : "rgba(148,163,184,0.14)",
                            background: isActive ? `${color}18` : "rgba(15,23,42,0.45)",
                            color: isActive ? color : "#94a3b8",
                          }}
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── LAGER — layer visibility ── */}
                <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(103,232,249,0.10)" }}>
                  <div className="text-[9px] tracking-[0.32em] mb-2" style={{ color: "#67e8f9" }}>
                    LAGER{userZoneCount > 0 && <span className="ml-2 text-blue-400">({userZoneCount} aktiva)</span>}
                  </div>
                  <div className="space-y-1">
                    {LAYER_ITEMS.map(({ key, label, Icon, color, solo }) => {
                      const isOn = state.overlayVisibility[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleVisibility(key)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all text-[10px] font-mono text-left"
                          style={{
                            background: isOn ? `${color}12` : "transparent",
                            color: isOn ? "#f8fafc" : "#64748b",
                          }}
                        >
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{
                              background: isOn ? color : "transparent",
                              border: `1.5px solid ${isOn ? color : "rgba(148,163,184,0.3)"}`,
                            }}
                          />
                          <Icon size={12} style={{ color: isOn ? color : "#64748b", flexShrink: 0 }} />
                          <span>{label}</span>
                          {solo && isOn && (
                            <span className="ml-auto text-[8px] px-1 py-0.5 rounded border" style={{ borderColor: `${color}50`, color, background: `${color}12` }}>SOLO</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── KARTFILTER ── */}
                <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: "rgba(103,232,249,0.10)" }}>
                  <button
                    onClick={() => { setTerrainFilterOpen((v) => !v); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-[10px] font-mono"
                    style={{
                      borderColor: terrainFilterOpen ? "rgba(215,171,58,0.5)" : "rgba(148,163,184,0.14)",
                      background: terrainFilterOpen ? "rgba(215,171,58,0.12)" : "rgba(15,23,42,0.45)",
                      color: terrainFilterOpen ? "#D7AB3A" : "#94a3b8",
                    }}
                  >
                    <Mountain size={13} />
                    <span>Kartfilter (terräng & overlays)</span>
                    <ChevronRight size={12} className="ml-auto" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Radar shadow viewshed — canvas overlay, only when active and observer selected */}
          {(() => {
            const observerLngLat: [number, number] | null =
              selectedBase && BASE_COORDS[selectedBase.id]
                ? [BASE_COORDS[selectedBase.id].lng, BASE_COORDS[selectedBase.id].lat]
                : selectedAsset
                ? [selectedAsset.lng, selectedAsset.lat]
                : null;
            const showShadow =
              (mapLayerState.overlays.radarShadow.active || hoveredOverlayKey === "radarShadow") &&
              observerLngLat !== null;
            if (!showShadow) return null;
            return (
              <RadarShadowOverlay
                observerLngLat={observerLngLat}
                opacity={
                  hoveredOverlayKey === "radarShadow" && !mapLayerState.overlays.radarShadow.active
                    ? (mapLayerState.overlays.radarShadow.opacity * 0.5) / 100
                    : mapLayerState.overlays.radarShadow.opacity / 100
                }
              />
            );
          })()}

          {/* Coordinate HUD + legend — bottom left, above aircraft markers
           *  (UnitsLayer airborne markers use zIndex 50). */}
          <div className="absolute bottom-14 left-3 z-[70] flex flex-col gap-2">
            <CoordinateHUD cursor={hudCursor} />

            <div
              className="p-3 rounded-xl text-xs font-mono pointer-events-none"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(0,0,0,0.08)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              <div className="font-bold text-gray-500 mb-2 text-[9px] tracking-widest">LEGEND</div>
              <div className="space-y-1.5">
                {[
                  { color: "#2D5A27", label: "Svenska militära baser", dashed: false },
                  { color: "#708090", label: "Kritisk infrastruktur", dashed: false },
                  { color: "#F4D03F", label: "Skyddsobjekt", dashed: false },
                  { color: RADAR_TEAL, label: "Radarstationer", dashed: false },
                  { color: "#2D5A27", label: "AOR (ansvarsområde)", dashed: true },
                ].map(({ color, label, dashed }) => (

                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="shrink-0 w-5 h-[2px] rounded"
                      style={{
                        background: dashed ? "none" : color,
                        borderTop: dashed ? `2px dashed ${color}` : "none",
                      }}
                    />
                    <span className="text-[10px] text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Terrain filter panel */}
          <AnimatePresence>
            {terrainFilterOpen && (
              <MapFilterPanel
                state={mapLayerState}
                onBaseMapChange={setBaseMap}
                onToggleOverlay={toggleOverlay}
                onSetOverlayOpacity={setOverlayOpacity}
                onToggleDampColors={toggleDampColors}
                onHoverChange={setHoveredOverlayKey}
                hasObserver={!!(selectedBase || selectedAsset)}
                onClose={() => setTerrainFilterOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Active aircraft bar */}
          <ActiveAircraftBar
            bases={state.bases}
            selectedAircraftId={selectedAircraftId}
            onSelect={(baseId, aircraftId) => setSelected({ kind: "aircraft", baseId, aircraftId })}
          />
        </div>

        {/* Events & reports sidebar — right edge */}
        <EventsSidebar
          events={filteredEvents}
          allEvents={allEvents}
          bases={state.bases.map((b) => ({ id: b.id, name: b.name }))}
          onEventClick={(ev) => {
            scenario.handleEventClick(ev);
          }}
        />

      </div>

      {/* Scripted-scenario overlays */}
      <ScenarioBrief
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        onSelectContact={(id) => setSelected({ kind: "naval", id })}
        onHoverContact={setScnHoveredContactId}
      />
      <AIActionCard
        open={actionCardOpen}
        onAccept={() => {
          scenario.acceptInterceptOrder();
          setActionCardOpen(false);
        }}
        onClose={() => setActionCardOpen(false)}
        onSelectBogey={(id) => setSelected({ kind: "enemy_entity", id })}
        onHoverBogey={setScnHoveredContactId}
      />

      {/* AI Plan Review Modal */}
      {showPlanReview && (
        <PlanReviewModal
          state={planState}
          onConfirm={() => { setShowPlanReview(false); }}
          onBack={() => setShowPlanReview(false)}
        />
      )}
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

// ── Asset info panel ───────────────────────────────────────────────────────

function AssetInfoPanel({
  asset,
  aorRadiusKm,
  onSetAor,
}: {
  asset: FixedMilitaryAsset;
  aorRadiusKm: number;
  onSetAor: (km: number) => void;
}) {
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
        {/* AOR slider */}
        <div className="pt-1">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Ansvarsområde (AOR)</span>
            <span className="font-bold" style={{ color: "#D7AB3A" }}>{aorRadiusKm} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={aorRadiusKm}
            onChange={(e) => onSetAor(Number(e.target.value))}
            className="w-full h-1.5 cursor-pointer"
            style={{ accentColor: "#D7AB3A" }}
          />
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-0.5">
            <span>1 km</span>
            <span>100 km</span>
          </div>
        </div>
      </div>
      <div
        className="text-[9px] font-mono text-muted-foreground border-t border-border pt-2 mt-2"
      >
        PERMANENT SKYDDSOBJEKT — ej redigerbar
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
