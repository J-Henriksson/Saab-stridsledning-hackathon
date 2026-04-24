import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { BASE_COORDS, BASE_RINGS, GIS_COLORS } from "./constants";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";
import { FOOTPRINT_POLYGONS } from "@/data/footprints";
import type { OverlayLayerVisibility } from "@/types/overlay";

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

export function MarkerRingsLayer({ aorOverrides, visibleLayers }: Props) {
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

    const markers: MarkerDef[] = [];

    const showAirbases = visibleLayers ? visibleLayers.militaryBases !== false : true;
    if (showAirbases) {
      Object.entries(BASE_COORDS).forEach(([id, { lat, lng }]) => {
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
    }

    const showMilitaryBases = visibleLayers ? visibleLayers.militaryBases !== false : true;
    const showCriticalInfra = visibleLayers ? visibleLayers.criticalInfra !== false : true;

    FIXED_MILITARY_ASSETS.forEach((asset) => {
      const isMilitary = ["army_regiment", "marine_regiment", "naval_base"].includes(asset.type);
      const isInfra = ["airport_civilian"].includes(asset.type);
      if (isMilitary && !showMilitaryBases) return;
      if (isInfra && !showCriticalInfra) return;
      markers.push({
        id: asset.id,
        lng: asset.lng,
        lat: asset.lat,
        sizeRadiusKm: asset.sizeRadiusKm,
        aorRadiusKm: aorOverrides[asset.id] ?? asset.defaultAorRadiusKm,
        ringColor: isMilitary ? GIS_COLORS.militaryBase : GIS_COLORS.criticalInfra,
      });
    });

    if (showCriticalInfra) {
      AMMO_DEPOTS.forEach((asset) => {
        markers.push({
          id: asset.id,
          lng: asset.lng,
          lat: asset.lat,
          sizeRadiusKm: asset.sizeRadiusKm,
          aorRadiusKm: aorOverrides[asset.id] ?? asset.defaultAorRadiusKm,
          ringColor: GIS_COLORS.criticalInfra,
        });
      });
    }

    for (const m of markers) {
      const center = project([m.lng, m.lat]);
      const footprint = FOOTPRINT_POLYGONS[m.id];
      const glowColor = hexToRgba(m.ringColor, 0.08);
      const outlineColor = hexToRgba(m.ringColor, 0.65);
      const aorColor = hexToRgba(m.ringColor, 0.55);

      ctx.setLineDash([]);

      if (footprint) {
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 6;
        ctx.strokeStyle = glowColor;
        ctx.stroke();
        drawPolygon(ctx, footprint, project);
        ctx.lineWidth = 2;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      } else {
        const sizeEdge = project([m.lng, m.lat + m.sizeRadiusKm / 111.32]);
        const sizePx = Math.max(10, Math.hypot(center.x - sizeEdge.x, center.y - sizeEdge.y));
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 6;
        ctx.strokeStyle = glowColor;
        ctx.stroke();
        drawCircle(ctx, center.x, center.y, sizePx);
        ctx.lineWidth = 2;
        ctx.strokeStyle = outlineColor;
        ctx.stroke();
      }

      // Outer AOR dashed ring — per-asset color
      const aorEdge = project([m.lng, m.lat + m.aorRadiusKm / 111.32]);
      const aorPx = Math.hypot(center.x - aorEdge.x, center.y - aorEdge.y);

      drawCircle(ctx, center.x, center.y, aorPx);
      ctx.setLineDash([10, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = aorColor;
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [mapRef, aorOverrides, visibleLayers]);

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
