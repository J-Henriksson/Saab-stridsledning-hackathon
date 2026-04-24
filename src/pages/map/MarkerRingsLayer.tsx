import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { BASE_COORDS, BASE_RINGS } from "./constants";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import { FOOTPRINT_POLYGONS } from "@/data/footprints";

interface MarkerDef {
  id: string;
  lng: number;
  lat: number;
  sizeRadiusKm: number;
  aorRadiusKm: number;
}

interface Props {
  aorOverrides: Record<string, number>;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  coords: [number, number][],
  project: (lngLat: [number, number]) => { x: number; y: number }
) {
  if (coords.length < 3) return;
  const pts = coords.map(project);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusPx: number
) {
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, 2 * Math.PI);
}

export function MarkerRingsLayer({ aorOverrides }: Props) {
  const { current: mapRef } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Collect all markers
    const markers: MarkerDef[] = [];

    Object.entries(BASE_COORDS).forEach(([id, { lat, lng }]) => {
      const rings = BASE_RINGS[id];
      if (!rings) return;
      markers.push({
        id,
        lng,
        lat,
        sizeRadiusKm: rings.sizeRadiusKm,
        aorRadiusKm: aorOverrides[id] ?? rings.defaultAorRadiusKm,
      });
    });

    [...FIXED_MILITARY_ASSETS, ...AMMO_DEPOTS].forEach((asset) => {
      markers.push({
        id: asset.id,
        lng: asset.lng,
        lat: asset.lat,
        sizeRadiusKm: asset.sizeRadiusKm,
        aorRadiusKm: aorOverrides[asset.id] ?? asset.defaultAorRadiusKm,
      });
    });

    for (const m of markers) {
      const center = project([m.lng, m.lat]);
      const footprint = FOOTPRINT_POLYGONS[m.id];

      // ── Inner ring: realistic footprint shape (fixed, solid white) ──────────
      ctx.setLineDash([]);

      if (footprint) {
        // Glow pass
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.stroke();
        // Crisp outline
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
        ctx.stroke();
      } else {
        // Fallback circle if no polygon defined
        const sizeEdge = project([m.lng, m.lat + m.sizeRadiusKm / 111.32]);
        const sizePx = Math.max(10, Math.hypot(center.x - sizeEdge.x, center.y - sizeEdge.y));
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.stroke();
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
        ctx.stroke();
      }

      // ── Outer ring: AOR circle (commander-adjustable, gold dashed) ──────────
      const aorEdge = project([m.lng, m.lat + m.aorRadiusKm / 111.32]);
      const aorPx = Math.hypot(center.x - aorEdge.x, center.y - aorEdge.y);

      drawCircle(ctx, center.x, center.y, aorPx);
      ctx.setLineDash([10, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(215, 171, 58, 0.80)";
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [mapRef, aorOverrides]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    map.on("move", draw);
    map.on("zoom", draw);
    map.on("resize", draw);

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once("load", draw);
    }

    return () => {
      map.off("move", draw);
      map.off("zoom", draw);
      map.off("resize", draw);
    };
  }, [mapRef, draw]);

  useEffect(() => {
    draw();
  }, [aorOverrides, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
