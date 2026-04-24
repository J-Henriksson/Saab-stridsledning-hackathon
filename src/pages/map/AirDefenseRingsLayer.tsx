import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { AirDefenseUnit } from "@/types/units";
import { getAirDefenseRangeProfile } from "@/core/units/airDefense";

interface Props {
  units: AirDefenseUnit[];
  selectedUnitId?: string | null;
}

function kmToPx(
  project: (lngLat: [number, number]) => { x: number; y: number },
  centerLng: number,
  centerLat: number,
  km: number
): number {
  const center = project([centerLng, centerLat]);
  // Offset by km / 111 degrees northward (1 deg lat ≈ 111 km)
  const north = project([centerLng, centerLat + km / 111]);
  const dy = center.y - north.y;
  const dx = center.x - north.x;
  return Math.sqrt(dx * dx + dy * dy);
}

export function AirDefenseRingsLayer({ units, selectedUnitId }: Props) {
  const { current: mapRef } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dashOffsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const map = mapRef?.getMap();
    if (!canvas || !map) return;

    const mapCanvas = map.getCanvas();
    const dpr = window.devicePixelRatio || 1;
    const w = mapCanvas.clientWidth;
    const h = mapCanvas.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const project = (lngLat: [number, number]) => map.project(lngLat);

    for (const unit of units) {
      const isSelected = unit.id === selectedUnitId;
      if (!isSelected) continue;

      const { lng, lat } = unit.position;
      const center = project([lng, lat]);
      const cx = center.x;
      const cy = center.y;
      const profile = getAirDefenseRangeProfile(unit);
      const detPx = kmToPx(project, lng, lat, profile.effectiveDetectionRange);
      const engPx = kmToPx(project, lng, lat, profile.effectiveEngagementRange);
      const readinessAlpha = Math.max(0.35, profile.readinessPercent / 100);

      if (engPx > 0) {
        const hue = Math.round(profile.capacityFactor * 120);
        const engColor = `hsla(${hue}, 92%, 52%, ${0.72 + readinessAlpha * 0.2})`;

        ctx.beginPath();
        ctx.arc(cx, cy, engPx, 0, 2 * Math.PI);
        ctx.fillStyle = `hsla(${hue}, 92%, 52%, 0.12)`;
        ctx.fill();
        ctx.setLineDash([]);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = engColor;
        ctx.stroke();
      }

      if (detPx > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, detPx, 0, 2 * Math.PI);
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -dashOffsetRef.current;
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.28 + readinessAlpha * 0.2})`;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 8.5, 0, 2 * Math.PI);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
      ctx.stroke();
    }
  }, [units, selectedUnitId, mapRef]);

  // Animate dash offset + redraw
  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime > 16) {
        dashOffsetRef.current = (dashOffsetRef.current + 0.4) % 26;
        draw();
        lastTime = time;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Redraw on map events
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const redraw = () => draw();
    map.on("move", redraw);
    map.on("zoom", redraw);
    map.on("resize", redraw);
    return () => {
      map.off("move", redraw);
      map.off("zoom", redraw);
      map.off("resize", redraw);
    };
  }, [mapRef, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}
