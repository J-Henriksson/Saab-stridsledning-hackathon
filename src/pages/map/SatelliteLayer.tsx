import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Marker, useMap } from "react-map-gl/maplibre";

export interface SatelliteDef {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  trackDeg: number;
  speedDegPerSec: number;
  altitudeKm: number;
  orbitClass: "LEO" | "MEO";
  status: string;
  role: string;
  readiness: "Hög" | "Medel";
  observationFocus: string;
  recommendedAction: string;
  limitation: string;
  footprintWidthKm: number;
  footprintLengthKm: number;
}

export interface SatelliteLiveState {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  altitudeKm: number;
  orbitClass: "LEO" | "MEO";
  status: string;
  signalStrength: number;
  region: string;
  nextPassMinutes: number;
  role: string;
  readiness: "Hög" | "Medel";
  observationFocus: string;
  recommendedAction: string;
  limitation: string;
  footprintWidthKm: number;
  footprintLengthKm: number;
  visibilityQuality: "God" | "Begränsad";
  swedishInterestCoverage: "Täcker" | "Utgående";
}

interface SatPos {
  lat: number;
  lng: number;
}

const LAT_MIN = 50;
const LAT_MAX = 73;
const LNG_MIN = 3;
const LNG_MAX = 33;
const TRAIL_POINTS = 34;
export const ACTIVE_SATELLITE_IDS = ["sat-01", "sat-03", "sat-04"] as const;

export const SATELLITE_DEFS: SatelliteDef[] = [
  {
    id: "sat-01",
    name: "STRIX-01",
    startLat: 69.5,
    startLng: 5.0,
    trackDeg: 140,
    speedDegPerSec: 0.015,
    altitudeKm: 612,
    orbitClass: "LEO",
    status: "ISR-svep",
    role: "Spaning och målföljning",
    readiness: "Hög",
    observationFocus: "Nordlig kust och basinfarter",
    recommendedAction: "Prioritera spaning över nordlig kust och koppla målföljning mot basförsvar.",
    limitation: "Kortare dwell-tid över sydlig sektor.",
    footprintWidthKm: 220,
    footprintLengthKm: 520,
  },
  {
    id: "sat-02",
    name: "COSMOS-7",
    startLat: 54.0,
    startLng: 24.0,
    trackDeg: 320,
    speedDegPerSec: 0.012,
    altitudeKm: 734,
    orbitClass: "LEO",
    status: "Signallänk",
    role: "Relä och sambandsstöd",
    readiness: "Hög",
    observationFocus: "Baltiska porten",
    recommendedAction: "Använd som relä för luftlägesdelning mellan kustnära enheter och ledning.",
    limitation: "Lägre upplösning för markmål.",
    footprintWidthKm: 240,
    footprintLengthKm: 520,
  },
  {
    id: "sat-03",
    name: "LORAN-3",
    startLat: 62.0,
    startLng: 8.0,
    trackDeg: 85,
    speedDegPerSec: 0.018,
    altitudeKm: 548,
    orbitClass: "LEO",
    status: "Spårfusion",
    role: "Kontaktfusion och rörelsemönster",
    readiness: "Hög",
    observationFocus: "Mellansverige och kustnära luftkorridorer",
    recommendedAction: "Samkör spårbild med luftvärn och jaktfördelning för snabbare klassificering.",
    limitation: "Hög hastighet ger kort beslutsfönster.",
    footprintWidthKm: 210,
    footprintLengthKm: 470,
  },
  {
    id: "sat-04",
    name: "SENTINEL",
    startLat: 58.0,
    startLng: 18.0,
    trackDeg: 210,
    speedDegPerSec: 0.01,
    altitudeKm: 821,
    orbitClass: "MEO",
    status: "Bredspaning",
    role: "Övergripande lägesbild",
    readiness: "Medel",
    observationFocus: "Östersjön och sydostlig inriktning",
    recommendedAction: "Använd för tidig indikering av större rörelser innan lokal sensorresurs allokeras.",
    limitation: "Lägre detaljgrad än LEO-resurser.",
    footprintWidthKm: 320,
    footprintLengthKm: 680,
  },
  {
    id: "sat-05",
    name: "ARGUS-2",
    startLat: 66.0,
    startLng: 12.0,
    trackDeg: 165,
    speedDegPerSec: 0.014,
    altitudeKm: 690,
    orbitClass: "LEO",
    status: "Målutpekning",
    role: "Sensor cueing och målangivning",
    readiness: "Hög",
    observationFocus: "Bottniska viken och norra inlandet",
    recommendedAction: "Lås hotsektor i norr och cuea mark- eller luftresurser mot observerad aktivitet.",
    limitation: "Begränsad täckning väster om fjällkedjan.",
    footprintWidthKm: 220,
    footprintLengthKm: 500,
  },
];

export const ACTIVE_SATELLITE_DEFS = SATELLITE_DEFS.filter((satellite) =>
  ACTIVE_SATELLITE_IDS.includes(satellite.id as (typeof ACTIVE_SATELLITE_IDS)[number]),
);

function wrapLat(lat: number): number {
  if (lat > LAT_MAX) return LAT_MIN + (lat - LAT_MAX);
  if (lat < LAT_MIN) return LAT_MAX - (LAT_MIN - lat);
  return lat;
}

function wrapLng(lng: number): number {
  if (lng > LNG_MAX) return LNG_MIN + (lng - LNG_MAX);
  if (lng < LNG_MIN) return LNG_MAX - (LNG_MIN - lng);
  return lng;
}

function getRegion(lat: number, lng: number) {
  if (lat >= 65) return "Norrlandsbågen";
  if (lat <= 57 && lng >= 15) return "Baltiska porten";
  if (lng <= 10) return "Skagerrak";
  return "Mellansverige";
}

function toLiveState(def: SatelliteDef, pos: SatPos, elapsedSeconds: number): SatelliteLiveState {
  const signalStrength = 72 + Math.round(((Math.sin(elapsedSeconds * 0.6 + pos.lng) + 1) / 2) * 24);
  const region = getRegion(pos.lat, pos.lng);
  const visibilityQuality = signalStrength >= 84 ? "God" : "Begränsad";
  const swedishInterestCoverage = pos.lat >= 55 && pos.lat <= 69 && pos.lng >= 8 && pos.lng <= 25
    ? "Täcker"
    : "Utgående";

  return {
    id: def.id,
    name: def.name,
    lat: pos.lat,
    lng: pos.lng,
    heading: def.trackDeg,
    speedKmh: Math.round(def.speedDegPerSec * 32000),
    altitudeKm: def.altitudeKm,
    orbitClass: def.orbitClass,
    status: def.status,
    signalStrength,
    region,
    nextPassMinutes: 4 + Math.round(((Math.cos(elapsedSeconds * 0.35 + pos.lat) + 1) / 2) * 10),
    role: def.role,
    readiness: def.readiness,
    observationFocus: def.observationFocus,
    recommendedAction: def.recommendedAction,
    limitation: def.limitation,
    footprintWidthKm: def.footprintWidthKm,
    footprintLengthKm: def.footprintLengthKm,
    visibilityQuality,
    swedishInterestCoverage,
  };
}

function projectFootprintRadii(
  map: MapLibreMap,
  satellite: SatelliteLiveState,
) {
  const latRadiusDeg = (satellite.footprintLengthKm / 2) / 111;
  const lngRadiusDeg = (satellite.footprintWidthKm / 2) / (111 * Math.cos((satellite.lat * Math.PI) / 180));
  const center = map.project([satellite.lng, satellite.lat]);
  const widthPoint = map.project([satellite.lng + lngRadiusDeg, satellite.lat]);
  const lengthPoint = map.project([satellite.lng, satellite.lat + latRadiusDeg]);

  return {
    center,
    radiusX: Math.max(24, Math.abs(widthPoint.x - center.x)),
    radiusY: Math.max(34, Math.abs(lengthPoint.y - center.y)),
  };
}

export function SatelliteLayer({
  onUpdate,
  onSelectSatellite,
  selectedSatelliteId,
  onPositionUpdate,
}: {
  onUpdate?: (satellites: SatelliteLiveState[]) => void;
  onSelectSatellite?: (satelliteId: string) => void;
  selectedSatelliteId?: string;
  onPositionUpdate?: (lng: number, lat: number) => void;
}) {
  const { current: mapRef } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<SatPos[]>(
    ACTIVE_SATELLITE_DEFS.map((satellite) => ({ lat: satellite.startLat, lng: satellite.startLng })),
  );
  const trailRef = useRef<SatPos[][]>(ACTIVE_SATELLITE_DEFS.map(() => []));
  const lastTimeRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const [satellites, setSatellites] = useState<SatelliteLiveState[]>(
    ACTIVE_SATELLITE_DEFS.map((satellite, index) => toLiveState(satellite, posRef.current[index], 0)),
  );

  useEffect(() => {
    if (!selectedSatelliteId || !onPositionUpdate) return;
    const satellite = satellites.find((item) => item.id === selectedSatelliteId);
    if (satellite) onPositionUpdate(satellite.lng, satellite.lat);
  }, [satellites, selectedSatelliteId, onPositionUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (now: number) => {
      const map = mapRef?.getMap();
      if (!map) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = lastTimeRef.current != null ? (now - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = now;
      const elapsedSeconds = now / 1000;

      for (let i = 0; i < ACTIVE_SATELLITE_DEFS.length; i++) {
        const satellite = ACTIVE_SATELLITE_DEFS[i];
        const rad = (satellite.trackDeg * Math.PI) / 180;
        const dLat = Math.cos(rad) * satellite.speedDegPerSec * dt;
        const dLng = Math.sin(rad) * satellite.speedDegPerSec * dt;
        const pos = posRef.current[i];

        pos.lat = wrapLat(pos.lat + dLat);
        pos.lng = wrapLng(pos.lng + dLng);

        const trail = trailRef.current[i];
        trail.unshift({ lat: pos.lat, lng: pos.lng });
        if (trail.length > TRAIL_POINTS) trail.length = TRAIL_POINTS;
      }

      const nextSatellites = ACTIVE_SATELLITE_DEFS.map((satellite, index) =>
        toLiveState(satellite, posRef.current[index], elapsedSeconds),
      );

      const mapCanvas = map.getCanvas();
      const dpr = window.devicePixelRatio || 1;
      const width = mapCanvas.clientWidth;
      const height = mapCanvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";

      for (const satellite of nextSatellites) {
        const { center, radiusX, radiusY } = projectFootprintRadii(map, satellite);
        const isSelected = satellite.id === selectedSatelliteId;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate((satellite.heading * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.1)";
        ctx.strokeStyle = isSelected ? "rgba(74,222,128,0.65)" : "rgba(34,197,94,0.28)";
        ctx.lineWidth = isSelected ? 1.8 : 1.2;
        ctx.shadowBlur = isSelected ? 18 : 12;
        ctx.shadowColor = "rgba(34,197,94,0.28)";
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -radiusY * 0.85);
        ctx.lineTo(0, radiusY * 0.85);
        ctx.strokeStyle = isSelected ? "rgba(187,247,208,0.6)" : "rgba(134,239,172,0.28)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.4;
      for (const trail of trailRef.current) {
        if (trail.length < 2) continue;
        const projected = trail.map((point) => map.project([point.lng, point.lat]));
        for (let i = 0; i < projected.length - 1; i++) {
          const opacity = 0.5 * (1 - i / (projected.length - 1));
          if (opacity < 0.01) break;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[i + 1].x, projected[i + 1].y);
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
          ctx.stroke();
        }
      }

      setSatellites(nextSatellites);
      onUpdate?.(nextSatellites);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mapRef, onUpdate, selectedSatelliteId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}
      />
      {satellites.map((satellite) => {
        const isSelected = satellite.id === selectedSatelliteId;
        return (
          <Marker key={satellite.id} longitude={satellite.lng} latitude={satellite.lat} anchor="center" style={{ zIndex: isSelected ? 4 : 2 }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectSatellite?.(satellite.id);
              }}
              className="group flex flex-col items-center"
              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              aria-label={`Välj satellit ${satellite.name}`}
            >
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{
                  background: isSelected
                    ? "linear-gradient(180deg, rgba(10,65,92,0.92), rgba(5,18,31,0.94))"
                    : "linear-gradient(180deg, rgba(8,17,32,0.92), rgba(4,10,20,0.92))",
                  borderColor: isSelected ? "rgba(103,232,249,0.55)" : "rgba(103,232,249,0.18)",
                  boxShadow: isSelected
                    ? "0 0 0 1px rgba(103,232,249,0.2), 0 0 18px rgba(34,211,238,0.28)"
                    : "0 8px 20px rgba(2,6,23,0.35)",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <rect x="10.6" y="9.8" width="4.8" height="6.4" rx="1.2" stroke="#67E8F9" strokeWidth="1.4" fill="rgba(15,23,42,0.65)" />
                  <path d="M7 10.7L10.4 11.7M7 15.3L10.4 14.3M19 10.7L15.6 11.7M19 15.3L15.6 14.3" stroke="#67E8F9" strokeWidth="1.4" strokeLinecap="round" />
                  <rect x="3.7" y="9.7" width="3.2" height="6.6" rx="0.8" stroke="#38BDF8" strokeWidth="1.2" />
                  <rect x="19.1" y="9.7" width="3.2" height="6.6" rx="0.8" stroke="#38BDF8" strokeWidth="1.2" />
                  <path d="M13 8V6.1M13 19.9V18" stroke="#A5F3FC" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="13" cy="13" r="1.8" fill="#22D3EE" />
                </svg>
                <span
                  className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border"
                  style={{
                    background: satellite.visibilityQuality === "God" ? "#22c55e" : "#f59e0b",
                    borderColor: "rgba(15,23,42,0.95)",
                  }}
                />
              </div>
              <div
                className="mt-1 rounded-md border px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.16em]"
                style={{
                  color: isSelected ? "#67e8f9" : "#cbd5e1",
                  borderColor: isSelected ? "rgba(103,232,249,0.3)" : "rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.68)",
                  boxShadow: isSelected ? "0 0 12px rgba(34,211,238,0.16)" : "none",
                }}
              >
                {satellite.name}
              </div>
            </button>
          </Marker>
        );
      })}
    </>
  );
}
