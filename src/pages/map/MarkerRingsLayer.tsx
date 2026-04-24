import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { BASE_COORDS, BASE_RINGS, GIS_COLORS } from "./constants";
import { FOOTPRINT_POLYGONS } from "@/data/footprints";
import type { OverlayLayerVisibility } from "@/types/overlay";
import type { RoadBase } from "@/types/game";

interface MarkerDef {
  id: string;
  lng: number;
  lat: number;
  sizeRadiusKm: number;
  aorRadiusKm: number;
  ringColor: string;
}

interface Props {
  aorOverrides: Record<string, number>;
  visibleLayers?: OverlayLayerVisibility;
  roadBases?: RoadBase[];
  /** IDs of airbases whose rings should be drawn. null/undefined = draw all. Empty set = draw none. */
  visibleBaseIds?: Set<string> | null;
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function MarkerRingsLayer({ aorOverrides, visibleLayers, roadBases, visibleBaseIds }: Props) {
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

    // Scale rings with zoom: invisible ≤5, full size+opacity ≥7
    const zoom = map.getZoom();
    const zoomAlpha = Math.max(0, Math.min(1, (zoom - 5) / 2));
    if (zoomAlpha <= 0) return;
    // AOR ring shrinks at low zoom so it doesn't dominate the viewport.
    // At zoom≤6 the displayed radius is capped to ~30px; above zoom 7 it grows freely.
    const aorCapPx = zoom < 7 ? 30 + (zoom - 5) * 40 : Infinity;

    const markers: MarkerDef[] = [];

    // Airbase rings — only draw for bases in visibleBaseIds.
    // null/undefined means "show all"; empty Set means "show none".
    Object.entries(BASE_COORDS).forEach(([id, { lat, lng }]) => {
      if (visibleBaseIds !== null && visibleBaseIds !== undefined && !visibleBaseIds.has(id)) return;
      const rings = BASE_RINGS[id];
      if (!rings) return;
      markers.push({
        id,
        lng,
        lat,
        sizeRadiusKm: rings.sizeRadiusKm,
        aorRadiusKm: aorOverrides[id] ?? rings.defaultAorRadiusKm,
        ringColor: GIS_COLORS.militaryBase,
      });
    });

    // Road-base range rings (these are plan-placed, always contextual)
    if (roadBases) {
      roadBases.forEach((rb) => {
        markers.push({
          id: rb.id,
          lng: rb.coords.lng,
          lat: rb.coords.lat,
          sizeRadiusKm: 0.3,
          aorRadiusKm: aorOverrides[rb.id] ?? rb.rangeRadius,
          ringColor: "#2D5A27",
        });
      });
    }

    // Fixed military assets and ammo depots intentionally excluded —
    // their footprint/AOR rings add clutter and are not base-centric.

    for (const m of markers) {
      const center = project([m.lng, m.lat]);
      const footprint = FOOTPRINT_POLYGONS[m.id];
      const glowColor = hexToRgba(m.ringColor, 0.08 * zoomAlpha);
      const outlineColor = hexToRgba(m.ringColor, 0.65 * zoomAlpha);
      const aorColor = hexToRgba(m.ringColor, 0.55 * zoomAlpha);

      ctx.setLineDash([]);

      if (footprint) {
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 6 * zoomAlpha;
        ctx.strokeStyle = glowColor;
        ctx.stroke();
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 2 * zoomAlpha;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      } else {
        const sizeEdge = project([m.lng, m.lat + m.sizeRadiusKm / 111.32]);
        const sizePx = Math.hypot(center.x - sizeEdge.x, center.y - sizeEdge.y);
        if (sizePx < 0.5) continue;
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 6 * zoomAlpha;
        ctx.strokeStyle = glowColor;
        ctx.stroke();
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 2 * zoomAlpha;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      }

      // Outer AOR dashed ring — per-asset color, capped at low zoom
      const aorEdge = project([m.lng, m.lat + m.aorRadiusKm / 111.32]);
      const aorPxGeo = Math.hypot(center.x - aorEdge.x, center.y - aorEdge.y);
      const aorPx = Math.min(aorPxGeo, aorCapPx);

      drawCircle(ctx, center.x, center.y, aorPx);
      ctx.setLineDash([10 * zoomAlpha + 2, 6 * zoomAlpha + 2]);
      ctx.lineWidth = 1.5 * zoomAlpha;
      ctx.strokeStyle = aorColor;
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [mapRef, aorOverrides, visibleLayers, roadBases]);

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
