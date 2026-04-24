import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { TERRARIUM_TILES } from "@/pages/map/constants";

interface Props {
  opacity: number;           // 0–1
  observerLngLat: [number, number] | null;
  observerAGL?: number;      // observer height above terrain, metres (default 50)
  targetAGL?: number;        // target height for LOS check, metres (default 500)
  maxRangeKm?: number;       // viewshed radius, km (default 200)
  rayCount?: number;         // rays cast in full 360°, default 36 (10° spacing)
  stepKm?: number;           // sample step along each ray, km (default 3)
}

const TILE_SIZE = 256;
// Zoom level 8 gives ~156 km/tile — efficient for 200 km range with minimal tile fetches
const DEM_ZOOM = 8;

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Move a point by (bearingDeg, distanceKm), return [lng, lat] */
function destinationPoint(
  lngLat: [number, number],
  bearingDeg: number,
  distanceKm: number
): [number, number] {
  const R = 6371;
  const d = distanceKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lngLat[1] * Math.PI) / 180;
  const lon1 = (lngLat[0] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

/** Standard web-mercator tile coordinates */
function lng2tile(lng: number, z: number) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}
function lat2tile(lat: number, z: number) {
  return Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, z)
  );
}

/** Pixel coordinate within a tile (0–255) */
function lngLatToTilePixel(
  lng: number,
  lat: number,
  tx: number,
  ty: number,
  z: number
): { px: number; py: number } {
  const totalTiles = Math.pow(2, z);
  const xFrac = ((lng + 180) / 360) * totalTiles - tx;
  const latRad = (lat * Math.PI) / 180;
  const yFrac =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * totalTiles - ty;
  return {
    px: Math.min(255, Math.max(0, Math.floor(xFrac * TILE_SIZE))),
    py: Math.min(255, Math.max(0, Math.floor(yFrac * TILE_SIZE))),
  };
}

// ── Terrarium tile cache (elevation values) ──────────────────────────────────

// Cache decoded elevation grids: Float32Array of length TILE_SIZE*TILE_SIZE
const elevCache = new Map<string, Float32Array>();
// Track in-flight requests to avoid duplicate fetches
const pending = new Map<string, Promise<Float32Array | null>>();

// Rate-limit: max 1 request per 100ms
let fetchQueue: (() => void)[] = [];
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

function enqueueFetch(fn: () => void) {
  fetchQueue.push(fn);
  if (!fetchTimer) fetchTimer = setTimeout(drainFetchQueue, 0);
}
function drainFetchQueue() {
  fetchTimer = null;
  const next = fetchQueue.shift();
  if (next) {
    next();
    fetchTimer = setTimeout(drainFetchQueue, 100);
  }
}

function fetchElevTile(z: number, x: number, y: number): Promise<Float32Array | null> {
  const key = `${z}/${x}/${y}`;
  if (elevCache.has(key)) return Promise.resolve(elevCache.get(key)!);
  if (pending.has(key)) return pending.get(key)!;

  const p = new Promise<Float32Array | null>((resolve) => {
    enqueueFetch(async () => {
      if (elevCache.has(key)) { resolve(elevCache.get(key)!); return; }
      try {
        const url = TERRARIUM_TILES
          .replace("{z}", String(z))
          .replace("{x}", String(x))
          .replace("{y}", String(y));
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
        });
        const oc = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
        const ctx = oc.getContext("2d")!;
        ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        const raw = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
        const elev = new Float32Array(TILE_SIZE * TILE_SIZE);
        for (let i = 0; i < elev.length; i++) {
          const r = raw.data[i * 4];
          const g = raw.data[i * 4 + 1];
          const b = raw.data[i * 4 + 2];
          // Terrarium encoding: elevation = R*256 + G + B/256 − 32768
          elev[i] = r * 256 + g + b / 256 - 32768;
        }
        elevCache.set(key, elev);
        pending.delete(key);
        resolve(elev);
      } catch {
        pending.delete(key);
        resolve(null);
      }
    });
  });

  pending.set(key, p);
  return p;
}

/** Sample terrain elevation at a geographic point using cached DEM tiles */
async function sampleElevation(lng: number, lat: number): Promise<number> {
  const tx = lng2tile(lng, DEM_ZOOM);
  const ty = lat2tile(lat, DEM_ZOOM);
  const tile = await fetchElevTile(DEM_ZOOM, tx, ty);
  if (!tile) return 0;
  const { px, py } = lngLatToTilePixel(lng, lat, tx, ty, DEM_ZOOM);
  return tile[py * TILE_SIZE + px] ?? 0;
}

// ── Viewshed computation ──────────────────────────────────────────────────────

interface ShadowPoint {
  lngLat: [number, number];
  distKm: number;
}

/**
 * Cast one ray from observer, returning all points in radar shadow.
 * Uses the "maximum elevation angle" horizon algorithm:
 *   A point at distance d is visible if its slope angle from the observer
 *   exceeds all previous slopes seen along the ray.
 *   If the point's target height (terrain + targetAGL) is below the maximum
 *   horizon slope, it is in radar shadow.
 */
async function castRay(
  observerLngLat: [number, number],
  observerElev: number,
  bearingDeg: number,
  maxRangeKm: number,
  stepKm: number,
  observerAGL: number,
  targetAGL: number
): Promise<ShadowPoint[]> {
  const shadowPoints: ShadowPoint[] = [];
  // Eye height above sea level
  const eyeHeight = observerElev + observerAGL;
  // maxSlope tracks the steepest angle (in m/km) seen so far along ray
  let maxSlopeMperKm = -Infinity;

  for (let d = stepKm; d <= maxRangeKm; d += stepKm) {
    const pt = destinationPoint(observerLngLat, bearingDeg, d);
    const terrainH = await sampleElevation(pt[0], pt[1]);
    // The slope angle from observer eye to target aircraft at this point
    const targetH = terrainH + targetAGL;
    const slopeMperKm = (targetH - eyeHeight) / d;

    if (slopeMperKm >= maxSlopeMperKm) {
      // Visible — update horizon
      maxSlopeMperKm = slopeMperKm;
    } else {
      // Below horizon → in radar shadow
      shadowPoints.push({ lngLat: pt, distKm: d });
    }
  }
  return shadowPoints;
}

/** Run full 360° viewshed. Returns all shadow points. */
async function computeViewshed(
  observerLngLat: [number, number],
  opts: Required<Omit<Props, "opacity" | "observerLngLat">>
): Promise<ShadowPoint[]> {
  const observerElev = await sampleElevation(observerLngLat[0], observerLngLat[1]);
  const stepDeg = 360 / opts.rayCount;
  const allShadow: ShadowPoint[] = [];

  const rayPromises = Array.from({ length: opts.rayCount }, (_, i) =>
    castRay(
      observerLngLat,
      observerElev,
      i * stepDeg,
      opts.maxRangeKm,
      opts.stepKm,
      opts.observerAGL,
      opts.targetAGL
    )
  );
  const results = await Promise.all(rayPromises);
  for (const pts of results) allShadow.push(...pts);
  return allShadow;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RadarShadowOverlay({
  opacity,
  observerLngLat,
  observerAGL = 50,
  targetAGL = 500,
  maxRangeKm = 200,
  rayCount = 36,
  stepKm = 3,
}: Props) {
  const { current: map } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shadowPointsRef = useRef<ShadowPoint[]>([]);
  const computingRef = useRef(false);

  /** Draw cached shadow points onto canvas */
  const redrawCanvas = useCallback(() => {
    if (!map || !canvasRef.current) return;
    const m = map.getMap();
    if (!m) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (shadowPointsRef.current.length === 0) return;

    // Projected radius: 3 km at current zoom
    const projectedRadius = (() => {
      const center = m.getCenter();
      const p0 = m.project([center.lng, center.lat]);
      const p1 = m.project(destinationPoint([center.lng, center.lat], 90, stepKm));
      return Math.max(3, Math.abs(p1.x - p0.x));
    })();

    ctx.fillStyle = `rgba(120, 80, 180, ${opacity})`;
    for (const pt of shadowPointsRef.current) {
      const pixel = m.project(pt.lngLat);
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, projectedRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [map, opacity, stepKm]);

  /** Recompute viewshed from scratch when observer changes */
  const recompute = useCallback(async () => {
    if (!observerLngLat || computingRef.current) return;
    computingRef.current = true;
    shadowPointsRef.current = [];
    redrawCanvas(); // clear while computing

    try {
      shadowPointsRef.current = await computeViewshed(observerLngLat, {
        observerAGL,
        targetAGL,
        maxRangeKm,
        rayCount,
        stepKm,
      });
    } finally {
      computingRef.current = false;
    }
    redrawCanvas();
  }, [observerLngLat, observerAGL, targetAGL, maxRangeKm, rayCount, stepKm, redrawCanvas]);

  // Resize canvas to fill the map container
  useEffect(() => {
    if (!map || !canvasRef.current) return;
    const m = map.getMap();
    if (!m) return;
    const container = m.getContainer();
    const syncSize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = container.clientWidth;
      canvasRef.current.height = container.clientHeight;
      redrawCanvas();
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [map, redrawCanvas]);

  // Redraw on map move (shadow points stay in geo-space, re-project to pixels)
  useEffect(() => {
    if (!map) return;
    const m = map.getMap();
    if (!m) return;
    const onMove = () => redrawCanvas();
    m.on("moveend", onMove);
    m.on("zoomend", onMove);
    return () => {
      m.off("moveend", onMove);
      m.off("zoomend", onMove);
    };
  }, [map, redrawCanvas]);

  // Recompute when observer position changes
  useEffect(() => {
    void recompute();
  }, [recompute]);

  // Redraw when opacity changes without recomputing
  useEffect(() => {
    redrawCanvas();
  }, [opacity, redrawCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
