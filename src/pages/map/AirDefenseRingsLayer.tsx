import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { AirDefenseUnit } from "@/types/units";

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
      if (unit.deployedState !== "emplaced") continue;

      const { lng, lat } = unit.position;
      const center = project([lng, lat]);
      const cx = center.x;
      const cy = center.y;

      const detPx = kmToPx(project, lng, lat, unit.detectionRange);
      const isSelected = unit.id === selectedUnitId;

      // Engagement ring — size and color scale by missile load
      const loadRatio = unit.missileStock.max > 0
        ? unit.missileStock.loaded / unit.missileStock.max
        : 0;

      if (loadRatio > 0) {
        const engPx = kmToPx(project, lng, lat, unit.engagementRange * loadRatio);
        const hue = Math.round(loadRatio * 120); // 120 = green, 0 = red
        const engColor = `hsla(${hue},90%,50%,${isSelected ? 0.9 : 0.7})`;

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(cx, cy, engPx, 0, 2 * Math.PI);
          ctx.fillStyle = `hsla(${hue},90%,50%,0.08)`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, engPx, 0, 2 * Math.PI);
        ctx.setLineDash([]);
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = engColor;
        ctx.stroke();
      }

      // Detection ring (outer, animated dashed) — always full range
      ctx.beginPath();
      ctx.arc(cx, cy, detPx, 0, 2 * Math.PI);
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = -dashOffsetRef.current;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(234,179,8,0.35)";
      ctx.stroke();
      ctx.setLineDash([]);
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
