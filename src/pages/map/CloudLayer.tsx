import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

export interface CloudSummary {
  activeFields: number;
  dominantDrift: string;
  coverageLabel: string;
}

// ── Perlin noise ────────────────────────────────────────────────────────────

const PERM = new Uint8Array(512);
const BASE_PERM = [
  151,160,137, 91, 90, 15,131, 13,201, 95, 96, 53,194,233,  7,225,
  140, 36,103, 30, 69,142,  8, 99, 37,240, 21, 10, 23,190,  6,148,
  247,120,234, 75,  0, 26,197, 62, 94,252,219,203,117, 35, 11, 32,
   57,177, 33, 88,237,149, 56, 87,174, 20,125,136,171,168, 68,175,
   74,165, 71,134,139, 48, 27,166, 77,146,158,231, 83,111,229,122,
   60,211,133,230,220,105, 92, 41, 55, 46,245, 40,244,102,143, 54,
   65, 25, 63,161,  1,216, 80, 73,209, 76,132,187,208, 89, 18,169,
  200,196,135,130,116,188,159, 86,164,100,109,198,173,186,  3, 64,
   52,217,226,250,124,123,  5,202, 38,147,118,126,255, 82, 85,212,
  207,206, 59,227, 47, 16, 58, 17,182,189, 28, 42,223,183,170,213,
  119,248,152,  2, 44,154,163, 70,221,153,101,155,167, 43,172,  9,
  129, 22, 39,253, 19, 98,108,110, 79,113,224,232,178,185,112,104,
  218,246, 97,228,251, 34,242,193,238,210,144, 12,191,179,162,241,
   81, 51,145,235,249, 14,239,107, 49,192,214, 31,181,199,106,157,
  184, 84,204,176,115,121, 50, 45,127,  4,150,254,138,236,205, 93,
  222,114, 67, 29, 24, 72,243,141,128,195, 78, 66,215, 61,156,180,
];
for (let i = 0; i < 256; i++) PERM[i] = PERM[i + 256] = BASE_PERM[i];

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number) { return a + t * (b - a); }

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
}

function noise2D(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = PERM[PERM[xi    ] + yi    ];
  const ab = PERM[PERM[xi    ] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi    ];
  const bb = PERM[PERM[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf, yf    ), grad(ba, xf - 1, yf    ), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v,
  );
}

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    v   += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v / max;
}

// Quilez-style two-level domain warping
function warpedCloud(x: number, y: number): number {
  const qx = fbm(x,         y        );
  const qy = fbm(x + 5.2,   y + 1.3  );
  const rx = fbm(x + qx * 2.0 + 1.7, y + qy * 2.0 + 9.2);
  const ry = fbm(x + qx * 2.0 + 8.3, y + qy * 2.0 + 2.8);
  return fbm(x + rx * 1.4, y + ry * 1.4);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Cloud band definitions ──────────────────────────────────────────────────

interface CloudBand {
  freq: number;
  driftX: number;
  driftY: number;
  density: number;
  transitionWidth: number;
  opacity: number;
  phase: number;
}

const CLOUD_BANDS: CloudBand[] = [
  // Scattered cumulus patches — drift east-northeast
  { freq: 0.22, driftX: 0.0024, driftY: -0.0006, density: 0.22, transitionWidth: 0.24, opacity: 0.90, phase: 0.0 },
  // Thin high-altitude wisps — drift slightly faster and more eastward
  { freq: 0.09, driftX: 0.0036, driftY: -0.0004, density: 0.26, transitionWidth: 0.20, opacity: 0.50, phase: 2.8 },
];

// Soft geographic mask — full weight over Sweden, fades to zero outside
function swedenMask(lng: number, lat: number): number {
  const latCenter = 62.5, latHalf = 8.5;
  const lngCenter = 17.5, lngHalf = 8.0;
  const dy = Math.abs(lat - latCenter) / latHalf;
  const dx = Math.abs(lng - lngCenter) / lngHalf;
  const d  = Math.max(dx, dy);
  return smoothstep(1.0, 0.55, d); // 1 inside, 0 outside, blended edge
}

function dominantDrift(): string {
  // All bands drift primarily eastward
  return "Östlig drift";
}

function coverageLabel(): string {
  return "Måttlig täckning";
}

// ── Component ───────────────────────────────────────────────────────────────

const RENDER_SCALE = 6; // offscreen canvas is 1/RENDER_SCALE of map size

export function CloudLayer({ onUpdate }: { onUpdate?: (summary: CloudSummary) => void }) {
  const { current: mapRef } = useMap();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const offRef     = useRef<HTMLCanvasElement | null>(null);
  const frameRef   = useRef(0);
  const startRef   = useRef<number | null>(null);
  const summaryRef = useRef<number>(0);

  useEffect(() => {
    // Create a persistent offscreen canvas
    offRef.current = document.createElement("canvas");

    const tick = (now: number) => {
      const map = mapRef?.getMap();
      const canvas = canvasRef.current;
      const off = offRef.current;
      if (!map || !canvas || !off) { frameRef.current = requestAnimationFrame(tick); return; }

      if (startRef.current == null) startRef.current = now;
      const t = (now - startRef.current) / 1000; // seconds since layer mounted

      // Size main canvas to match map
      const mapCanvas = map.getCanvas();
      const dpr    = window.devicePixelRatio || 1;
      const W      = mapCanvas.clientWidth;
      const H      = mapCanvas.clientHeight;
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) { frameRef.current = requestAnimationFrame(tick); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Size offscreen canvas
      const ow = Math.ceil(W / RENDER_SCALE);
      const oh = Math.ceil(H / RENDER_SCALE);
      off.width  = ow;
      off.height = oh;
      const offCtx = off.getContext("2d");
      if (!offCtx) { frameRef.current = requestAnimationFrame(tick); return; }

      // Unproject four corners to geo-coordinates for bilinear interpolation
      const tl = map.unproject([0, 0]);
      const tr = map.unproject([W, 0]);
      const bl = map.unproject([0, H]);
      const br = map.unproject([W, H]);

      const tlLng = tl.lng, tlLat = tl.lat;
      const trLng = tr.lng, trLat = tr.lat;
      const blLng = bl.lng, blLat = bl.lat;
      const brLng = br.lng, brLat = br.lat;

      const imageData = offCtx.createImageData(ow, oh);
      const data = imageData.data;

      for (let j = 0; j < oh; j++) {
        const ty = (j * RENDER_SCALE) / H;

        for (let i = 0; i < ow; i++) {
          const tx = (i * RENDER_SCALE) / W;

          // Bilinear interpolation of lng/lat from four corners
          const lng = (tlLng * (1 - tx) + trLng * tx) * (1 - ty) + (blLng * (1 - tx) + brLng * tx) * ty;
          const lat = (tlLat * (1 - tx) + trLat * tx) * (1 - ty) + (blLat * (1 - tx) + brLat * tx) * ty;

          const mask = swedenMask(lng, lat);
          if (mask < 0.01) continue;

          let alpha = 0;

          for (const band of CLOUD_BANDS) {
            const nx = lng * band.freq + band.driftX * t;
            const ny = lat * band.freq + band.driftY * t;
            const sample = warpedCloud(nx, ny);
            const threshold = band.density + 0.018 * Math.sin(t * 0.04 + band.phase);
            const hw = band.transitionWidth * 0.5;
            const a = smoothstep(threshold - hw, threshold + hw, sample);
            alpha += a * band.opacity;
          }

          alpha = Math.min(1, alpha * mask);

          if (alpha > 0.005) {
            // Bright white-blue cloud colour; dim edge haze
            const bright = Math.round(220 + 35 * alpha);
            const idx = (j * ow + i) * 4;
            data[idx    ] = bright;
            data[idx + 1] = bright;
            data[idx + 2] = Math.min(255, bright + 12);
            data[idx + 3] = Math.round(alpha * 210);
          }
        }
      }

      offCtx.putImageData(imageData, 0, 0);

      // Composite scaled offscreen image onto the main canvas
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.imageSmoothingEnabled    = true;
      ctx.imageSmoothingQuality    = "high";
      ctx.drawImage(off, 0, 0, W, H);
      ctx.restore();

      // Throttle summary updates
      if (onUpdate && now - summaryRef.current > 500) {
        summaryRef.current = now;
        onUpdate({
          activeFields: CLOUD_BANDS.length,
          dominantDrift: dominantDrift(),
          coverageLabel: coverageLabel(),
        });
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [mapRef, onUpdate]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
