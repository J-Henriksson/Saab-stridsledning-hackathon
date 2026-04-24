import { useEffect, useRef, useState } from "react";
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
}

interface SatPos {
  lat: number;
  lng: number;
}

const LAT_MIN = 50;
const LAT_MAX = 73;
const LNG_MIN = 3;
const LNG_MAX = 33;
const TRAIL_POINTS = 40;

export const SATELLITE_DEFS: SatelliteDef[] = [
  { id: "sat-01", name: "STRIX-01", startLat: 69.5, startLng: 5.0, trackDeg: 140, speedDegPerSec: 0.015, altitudeKm: 612, orbitClass: "LEO", status: "ISR-svep" },
  { id: "sat-02", name: "COSMOS-7", startLat: 54.0, startLng: 24.0, trackDeg: 320, speedDegPerSec: 0.012, altitudeKm: 734, orbitClass: "LEO", status: "Signallänk" },
  { id: "sat-03", name: "LORAN-3", startLat: 62.0, startLng: 8.0, trackDeg: 85, speedDegPerSec: 0.018, altitudeKm: 548, orbitClass: "LEO", status: "Spårfusion" },
  { id: "sat-04", name: "SENTINEL", startLat: 58.0, startLng: 18.0, trackDeg: 210, speedDegPerSec: 0.01, altitudeKm: 821, orbitClass: "MEO", status: "Bredspaning" },
  { id: "sat-05", name: "ARGUS-2", startLat: 66.0, startLng: 12.0, trackDeg: 165, speedDegPerSec: 0.014, altitudeKm: 690, orbitClass: "LEO", status: "Målutpekning" },
];

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
    signalStrength: 72 + Math.round(((Math.sin(elapsedSeconds * 0.6 + pos.lng) + 1) / 2) * 24),
    region: getRegion(pos.lat, pos.lng),
    nextPassMinutes: 4 + Math.round(((Math.cos(elapsedSeconds * 0.35 + pos.lat) + 1) / 2) * 10),
  };
}

export function SatelliteLayer({
  onUpdate,
}: {
  onUpdate?: (satellites: SatelliteLiveState[]) => void;
}) {
  const { current: mapRef } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<SatPos[]>(
    SATELLITE_DEFS.map((satellite) => ({ lat: satellite.startLat, lng: satellite.startLng })),
  );
  const trailRef = useRef<SatPos[][]>(SATELLITE_DEFS.map(() => []));
  const lastTimeRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const [satellites, setSatellites] = useState<SatelliteLiveState[]>(
    SATELLITE_DEFS.map((satellite, index) =>
      toLiveState(satellite, posRef.current[index], 0),
    ),
  );

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

      for (let i = 0; i < SATELLITE_DEFS.length; i++) {
        const satellite = SATELLITE_DEFS[i];
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
      ctx.lineWidth = 1.5;

      for (const trail of trailRef.current) {
        if (trail.length < 2) continue;
        const projected = trail.map((point) => map.project([point.lng, point.lat]));
        for (let i = 0; i < projected.length - 1; i++) {
          const opacity = 0.6 * (1 - i / (projected.length - 1));
          if (opacity < 0.01) break;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[i + 1].x, projected[i + 1].y);
          ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(34, 211, 238, 0.55)";
          ctx.stroke();
        }
      }

      const nextSatellites = SATELLITE_DEFS.map((satellite, index) =>
        toLiveState(satellite, posRef.current[index], elapsedSeconds),
      );
      setSatellites(nextSatellites);
      onUpdate?.(nextSatellites);

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mapRef, onUpdate]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}
      />
      {satellites.map((satellite) => (
        <Marker key={satellite.id} longitude={satellite.lng} latitude={satellite.lat} anchor="center" style={{ zIndex: 1 }}>
          <div className="flex flex-col items-center" style={{ pointerEvents: "none" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22d3ee",
                boxShadow: "0 0 8px #22d3ee, 0 0 14px rgba(34,211,238,0.4)",
              }}
            />
            <span
              style={{
                marginTop: 2,
                whiteSpace: "nowrap",
                fontSize: 7,
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.08em",
                color: "#67e8f9",
                opacity: 0.8,
                textShadow: "0 0 6px rgba(34,211,238,0.45)",
              }}
            >
              {satellite.name}
            </span>
          </div>
        </Marker>
      ))}
    </>
  );
}
