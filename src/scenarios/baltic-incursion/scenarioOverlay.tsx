// Map-side scenario overlay: threat vectors, projected reach, radar→contact
// link, group bounding box, spawn pulse, hover highlight.
// Rendered inside MapGL alongside other layers.

import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { GameState, NavalUnit } from "@/types/game";
import { absoluteGameSec } from "@/core/engine";
import { GOTLAND_EAST, SHIP_SPAWNS } from "./geo";

interface XY { lat: number; lng: number }

const KTS_TO_KM_PER_SEC = 1.852 / 3600;
const SHIP_KTS = 18;

function step(from: XY, headingDeg: number, distKm: number): XY {
  const R = 6371;
  const δ = distKm / R;
  const θ = (headingDeg * Math.PI) / 180;
  const φ1 = (from.lat * Math.PI) / 180;
  const λ1 = (from.lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI };
}

function circleGeoJSON(center: XY, radiusKm: number, points = 96): GeoJSON.Feature {
  const coords: [number, number][] = [];
  const R = 6371;
  const lat = (center.lat * Math.PI) / 180;
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const dLat = (radiusKm / R) * Math.cos(t);
    const dLng = (radiusKm / R) * Math.sin(t) / Math.cos(lat);
    coords.push([
      center.lng + (dLng * 180) / Math.PI,
      center.lat + (dLat * 180) / Math.PI,
    ]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
}

function centroid(units: NavalUnit[]): XY | null {
  if (units.length === 0) return null;
  const lat = units.reduce((s, u) => s + u.position.lat, 0) / units.length;
  const lng = units.reduce((s, u) => s + u.position.lng, 0) / units.length;
  return { lat, lng };
}

interface Props {
  state: GameState;
  hoveredContactId: string | null;
}

export function ScenarioOverlay({ state, hoveredContactId }: Props) {
  const sc = state.scenario;

  // ── ALL hooks first — never branch hook-count by scenario state ──────────
  const ships = useMemo(
    () => SHIP_SPAWNS
      .map((s) => state.navalUnits.find((n) => n.id === s.id))
      .filter((n): n is NavalUnit => Boolean(n)),
    [state.navalUnits],
  );

  const groupCentre = useMemo(() => centroid(ships), [ships]);

  const radarLinkGeoJSON: GeoJSON.FeatureCollection = useMemo(() => {
    if (!groupCentre) return { type: "FeatureCollection", features: [] };
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "LineString", coordinates: [
          [GOTLAND_EAST.lng, GOTLAND_EAST.lat],
          [groupCentre.lng, groupCentre.lat],
        ]},
        properties: {},
      }],
    };
  }, [groupCentre]);

  const bboxGeoJSON: GeoJSON.FeatureCollection = useMemo(() => {
    if (ships.length < 2) return { type: "FeatureCollection", features: [] };
    const pad = 0.35;
    const minLat = Math.min(...ships.map((s) => s.position.lat)) - pad;
    const maxLat = Math.max(...ships.map((s) => s.position.lat)) + pad;
    const minLng = Math.min(...ships.map((s) => s.position.lng)) - pad;
    const maxLng = Math.max(...ships.map((s) => s.position.lng)) + pad;
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[
          [minLng, minLat], [maxLng, minLat], [maxLng, maxLat],
          [minLng, maxLat], [minLng, minLat],
        ]]},
        properties: { topLat: maxLat, midLng: (minLng + maxLng) / 2 },
      }],
    };
  }, [ships]);

  const radarKm = useMemo(() => {
    if (!groupCentre) return 0;
    const dLat = (groupCentre.lat - GOTLAND_EAST.lat) * 111.13;
    const dLng = (groupCentre.lng - GOTLAND_EAST.lng) * 111.13 * Math.cos(((groupCentre.lat + GOTLAND_EAST.lat) / 2) * Math.PI / 180);
    return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
  }, [groupCentre]);

  // Hooks done — now safe to branch on scenario state.
  if (!sc || ships.length === 0) return null;

  const stage1At = sc.stage1AtSec ?? sc.startedAtSec;
  const elapsedSinceSpawn = absoluteGameSec(state) - stage1At;
  const showPulse = elapsedSinceSpawn >= 0 && elapsedSinceSpawn < 4;

  const radarLabelPos: XY | null = groupCentre ? {
    lat: (GOTLAND_EAST.lat + groupCentre.lat) / 2,
    lng: (GOTLAND_EAST.lng + groupCentre.lng) / 2,
  } : null;

  const hoveredShip = ships.find((s) => s.id === hoveredContactId);

  return (
    <>
      {/* Group bounding box */}
      <Source id="scn-bbox" type="geojson" data={bboxGeoJSON}>
        <Layer id="scn-bbox-stroke" type="line" paint={{
          "line-color": "#f59e0b",
          "line-width": 1,
          "line-opacity": 0.4,
          "line-dasharray": [2, 3],
        }} />
      </Source>

      {/* Radar → contact link */}
      <Source id="scn-radar-link" type="geojson" data={radarLinkGeoJSON}>
        <Layer id="scn-radar-link-line" type="line" paint={{
          "line-color": "#22d3ee",
          "line-width": 1.2,
          "line-opacity": 0.5,
          "line-dasharray": [4, 4],
        }} />
      </Source>

      {/* DOM-overlay markers — labels, pulse, hover ring */}
      {radarLabelPos && (
        <Marker longitude={radarLabelPos.lng} latitude={radarLabelPos.lat} anchor="center" style={{ pointerEvents: "none" }}>
          <div className="text-[8px] font-mono text-cyan-300/90 bg-slate-950/80 border border-cyan-500/40 px-1 py-0.5 rounded">
            PS-860 · {radarKm} km
          </div>
        </Marker>
      )}

      {/* Spawn pulse — three concentric expanding rings, ~4s */}
      {showPulse && ships.map((ship) => (
        <Marker key={`pulse-${ship.id}`} longitude={ship.position.lng} latitude={ship.position.lat} anchor="center" style={{ pointerEvents: "none" }}>
          <div className="scn-spawn-pulse" />
        </Marker>
      ))}

      {/* Hover highlight ring (sync with brief panel) */}
      {hoveredShip && (
        <Marker longitude={hoveredShip.position.lng} latitude={hoveredShip.position.lat} anchor="center" style={{ pointerEvents: "none" }}>
          <div className="h-7 w-7 rounded-full border-2 border-cyan-300/90 shadow-[0_0_12px_rgba(103,232,249,0.7)]" />
        </Marker>
      )}

      {/* Pulse animation styles (scoped via global selector — only used here) */}
      <style>{`
        @keyframes scn-pulse-anim {
          0%   { transform: scale(0.4); opacity: 0.85; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .scn-spawn-pulse {
          width: 28px; height: 28px; border-radius: 9999px;
          border: 2px solid rgba(239, 68, 68, 0.85);
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.55) inset;
          animation: scn-pulse-anim 1.4s ease-out infinite;
        }
      `}</style>
    </>
  );
}
