import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";

interface Props {
  opacity: number; // 0–1
}

const TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const TILE_SIZE = 256;

// Elevation colour stops: [elevation_metres, [r, g, b]]
const COLOUR_STOPS: [number, [number, number, number]][] = [
  [-500,  [0,   30,  120]],
  [0,     [0,   50,  150]],
  [1,     [60,  160,  60]],
  [200,   [80,  140,  50]],
  [500,   [140, 100,  50]],
  [800,   [160,  90,  40]],
  [1500,  [220, 200, 180]],
  [2000,  [240, 240, 240]],
];

function elevToColor(elev: number): [number, number, number] {
  if (elev <= COLOUR_STOPS[0][0]) return COLOUR_STOPS[0][1];
  for (let i = 1; i < COLOUR_STOPS.length; i++) {
    const [lo, cLo] = COLOUR_STOPS[i - 1];
    const [hi, cHi] = COLOUR_STOPS[i];
    if (elev <= hi) {
      const t = (elev - lo) / (hi - lo);
      return [
        Math.round(cLo[0] + t * (cHi[0] - cLo[0])),
        Math.round(cLo[1] + t * (cHi[1] - cLo[1])),
        Math.round(cLo[2] + t * (cHi[2] - cLo[2])),
      ];
    }
  }
  return COLOUR_STOPS[COLOUR_STOPS.length - 1][1];
}

function tileUrl(z: number, x: number, y: number): string {
  return TERRARIUM_URL.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

// Decode terrarium RGB → metres
function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

// In-memory tile image cache
const tileCache = new Map<string, ImageData>();

// Rate-limit tile fetches: queue with 100ms spacing
let fetchQueue: (() => void)[] = [];
let fetchTimer: ReturnType<typeof setTimeout> | null = null;
function enqueueFetch(fn: () => void) {
  fetchQueue.push(fn);
  if (!fetchTimer) {
    fetchTimer = setTimeout(drainQueue, 0);
  }
}
function drainQueue() {
  fetchTimer = null;
  const next = fetchQueue.shift();
  if (next) {
    next();
    fetchTimer = setTimeout(drainQueue, 100);
  }
}

async function fetchTileImageData(z: number, x: number, y: number): Promise<ImageData | null> {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key)!;

  return new Promise((resolve) => {
    enqueueFetch(async () => {
      // Check cache again in case another request already fetched it
      if (tileCache.has(key)) { resolve(tileCache.get(key)!); return; }
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = tileUrl(z, x, y);
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("tile load failed"));
        });
        const offscreen = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
        const ctx = offscreen.getContext("2d")!;
        ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        const raw = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
        const colored = new ImageData(TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < raw.data.length; i += 4) {
          const elev = decodeTerrarium(raw.data[i], raw.data[i + 1], raw.data[i + 2]);
          const [r, g, b] = elevToColor(elev);
          colored.data[i]     = r;
          colored.data[i + 1] = g;
          colored.data[i + 2] = b;
          colored.data[i + 3] = 255;
        }
        tileCache.set(key, colored);
        resolve(colored);
      } catch {
        resolve(null);
      }
    });
  });
}

export function ElevationHeatmapLayer({ opacity }: Props) {
  const { current: map } = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pendingRef = useRef(false);

  const redraw = useCallback(async () => {
    if (!map || !canvasRef.current || pendingRef.current) return;
    const m = map.getMap();
    if (!m) return;

    pendingRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) { pendingRef.current = false; return; }

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const zoom = Math.floor(m.getZoom());
    const bounds = m.getBounds();

    // Tile coordinate conversion
    const lng2tile = (lng: number, z: number) =>
      Math.floor(((lng + 180) / 360) * Math.pow(2, z));
    const lat2tile = (lat: number, z: number) =>
      Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
          Math.pow(2, z)
      );

    const tileXmin = lng2tile(bounds.getWest(), zoom);
    const tileXmax = lng2tile(bounds.getEast(), zoom);
    const tileYmin = lat2tile(bounds.getNorth(), zoom);
    const tileYmax = lat2tile(bounds.getSouth(), zoom);

    // Map tile coords to canvas pixels
    const totalTilesX = Math.pow(2, zoom);
    const totalTilesY = Math.pow(2, zoom);
    const mapW = width;
    const mapH = height;

    const tileToCanvas = (tx: number, ty: number) => {
      const lngLeft = (tx / totalTilesX) * 360 - 180;
      const latTop_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / totalTilesY)));
      const latTop = (latTop_rad * 180) / Math.PI;
      const point = m.project([lngLeft, latTop]);
      return { x: point.x, y: point.y };
    };

    const fetches: Promise<void>[] = [];
    for (let tx = tileXmin; tx <= tileXmax; tx++) {
      for (let ty = tileYmin; ty <= tileYmax; ty++) {
        const { x: px, y: py } = tileToCanvas(tx, ty);
        const { x: px2, y: py2 } = tileToCanvas(tx + 1, ty + 1);
        const tw = px2 - px;
        const th = py2 - py;
        if (tw < 1 || th < 1) continue;

        fetches.push(
          fetchTileImageData(zoom, tx, ty).then((imageData) => {
            if (!imageData || !ctx) return;
            const offscreen = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
            const octx = offscreen.getContext("2d")!;
            octx.putImageData(imageData, 0, 0);
            ctx.globalAlpha = opacity;
            ctx.drawImage(offscreen, px, py, tw, th);
          })
        );
      }
    }

    await Promise.all(fetches);
    pendingRef.current = false;
  }, [map, opacity]);

  // Resize canvas to match map container
  useEffect(() => {
    if (!map || !canvasRef.current) return;
    const m = map.getMap();
    if (!m) return;
    const container = m.getContainer();

    const syncSize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = container.clientWidth;
      canvasRef.current.height = container.clientHeight;
      void redraw();
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [map, redraw]);

  // Redraw on map move
  useEffect(() => {
    if (!map) return;
    const m = map.getMap();
    if (!m) return;

    const onMove = () => { pendingRef.current = false; void redraw(); };
    m.on("moveend", onMove);
    m.on("zoomend", onMove);
    m.on("load", onMove);

    void redraw();

    return () => {
      m.off("moveend", onMove);
      m.off("zoomend", onMove);
      m.off("load", onMove);
    };
  }, [map, redraw]);

  // Re-redraw when opacity changes
  useEffect(() => {
    pendingRef.current = false;
    void redraw();
  }, [opacity, redraw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}
