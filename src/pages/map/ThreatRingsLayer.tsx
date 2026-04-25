import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { EnemyBase, ThreatLevel } from "@/types/game";

interface Props {
  enemyBases: EnemyBase[];
}

const THREAT_COLORS: Record<ThreatLevel, string> = {
  high:    "220, 38, 38",   // red-600
  medium:  "234, 179, 8",   // yellow-500
  low:     "34, 197, 94",   // green-500
  unknown: "148, 163, 184", // slate-400
};

function kmToPx(
  project: (lngLat: [number, number]) => { x: number; y: number },
  centerLng: number,
  centerLat: number,
  km: number
): number {
  const center = project([centerLng, centerLat]);
  const north  = project([centerLng, centerLat + km / 111]);
  const dy = center.y - north.y;
  const dx = center.x - north.x;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ThreatRingsLayer({ enemyBases }: Props) {
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
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const project = (lngLat: [number, number]) => map.project(lngLat);

    for (const base of enemyBases) {
      const rangeKm = base.threatRangeKm ?? 0;
      if (rangeKm <= 0) continue;

      const { lng, lat } = base.coords;
      const center  = project([lng, lat]);
      const cx = center.x;
      const cy = center.y;
      const px = kmToPx(project, lng, lat, rangeKm);
      if (px < 2) continue;

      const rgb = THREAT_COLORS[base.threatLevel];

      // Filled area — very transparent
      ctx.beginPath();
      ctx.arc(cx, cy, px, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${rgb}, 0.08)`;
      ctx.fill();

      // Animated dashed stroke
      ctx.beginPath();
      ctx.arc(cx, cy, px, 0, 2 * Math.PI);
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -dashOffsetRef.current;
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = `rgba(${rgb}, 0.70)`;
      ctx.stroke();
      ctx.setLineDash([]);

      // Range label
      const labelX = cx;
      const labelY = cy - px - 6;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${rgb}, 0.90)`;
      ctx.fillText(`${rangeKm} km`, labelX, labelY);
    }
  }, [enemyBases, mapRef]);

  // Animate dash offset
  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime > 16) {
        dashOffsetRef.current = (dashOffsetRef.current + 0.35) % 18;
        draw();
        lastTime = time;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Redraw on map move / zoom / resize
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
        zIndex: 4,
      }}
    />
  );
}
