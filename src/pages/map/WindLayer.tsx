import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

const COUNT      = 400;
const BASE_SPEED = 1.3;
const TRAIL_LEN  = 18;
const DIR_DRIFT  = 0.00018;
const CURL       = 0.55;

interface Particle {
  xs: number[]; ys: number[];
  head: number;
  speed: number;
  life: number; maxLife: number;
}

function spawnEdge(w: number, h: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  if (Math.random() < 0.55) {
    const x = cos >= 0 ? 0 : w;
    return { x, y: Math.random() * h };
  } else {
    const y = sin >= 0 ? 0 : h;
    return { x: Math.random() * w, y };
  }
}

function makeParticle(w: number, h: number, angle: number, scatter: boolean): Particle {
  const pos = scatter ? { x: Math.random() * w, y: Math.random() * h } : spawnEdge(w, h, angle);
  const maxLife = 150 + Math.random() * 200;
  const life    = scatter ? Math.random() * maxLife : 0;
  const xs = Array(TRAIL_LEN).fill(pos.x) as number[];
  const ys = Array(TRAIL_LEN).fill(pos.y) as number[];
  return { xs, ys, head: 0, speed: 0.55 + Math.random() * 0.9, life, maxLife };
}

function resetParticle(p: Particle, w: number, h: number, angle: number) {
  const e = spawnEdge(w, h, angle);
  p.xs.fill(e.x); p.ys.fill(e.y);
  p.head    = 0;
  p.life    = 0;
  p.maxLife = 150 + Math.random() * 200;
  p.speed   = 0.55 + Math.random() * 0.9;
}

export function WindLayer() {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    // Attach canvas directly to the maplibre canvas container so it sits
    // exactly on top of the WebGL canvas in the same stacking context.
    const container = map.getCanvasContainer();
    const canvas    = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;mix-blend-mode:screen;z-index:1";
    container.appendChild(canvas);

    let angle = -0.48;
    let parts: Particle[] = [];
    let t     = 0;
    let raf   = 0;
    let lastW = 0;
    let lastH = 0;

    const tick = () => {
      const mapCanvas = map.getCanvas();
      const dpr = window.devicePixelRatio || 1;
      const W   = mapCanvas.clientWidth;
      const H   = mapCanvas.clientHeight;

      // Only resize drawing buffer when dimensions actually change
      if (W !== lastW || H !== lastH) {
        canvas.width        = W * dpr;
        canvas.height       = H * dpr;
        canvas.style.width  = `${W}px`;
        canvas.style.height = `${H}px`;
        parts  = Array.from({ length: COUNT }, () => makeParticle(W, H, angle, true));
        lastW  = W;
        lastH  = H;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) { raf = requestAnimationFrame(tick); return; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      angle += DIR_DRIFT * Math.sin(t * 0.00045 + 1.2);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (const p of parts) {
        const cur = p.head;
        const x   = p.xs[cur];
        const y   = p.ys[cur];

        const vx = cosA * BASE_SPEED * p.speed + CURL * Math.sin(y * 0.0048 + t * 0.00065);
        const vy = sinA * BASE_SPEED * p.speed + CURL * Math.cos(x * 0.0048 + t * 0.00065);
        const nx = x + vx;
        const ny = y + vy;

        p.head       = (cur + 1) % TRAIL_LEN;
        p.xs[p.head] = nx;
        p.ys[p.head] = ny;
        p.life++;

        const frac   = p.life / p.maxLife;
        const gAlpha = frac < 0.10 ? frac / 0.10 : frac > 0.80 ? (1 - frac) / 0.20 : 1;

        for (let s = 1; s < TRAIL_LEN; s++) {
          const idxA     = (p.head - s         + TRAIL_LEN * 2) % TRAIL_LEN;
          const idxB     = (p.head - s + 1     + TRAIL_LEN * 2) % TRAIL_LEN;
          const segAlpha = (s / TRAIL_LEN) * gAlpha * 0.55;
          ctx.beginPath();
          ctx.moveTo(p.xs[idxA], p.ys[idxA]);
          ctx.lineTo(p.xs[idxB], p.ys[idxB]);
          ctx.strokeStyle = `rgba(255,255,255,${segAlpha.toFixed(3)})`;
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        }

        if (p.life >= p.maxLife || nx < -16 || nx > W + 16 || ny < -16 || ny > H + 16) {
          resetParticle(p, W, H, angle);
        }
      }

      t++;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      container.removeChild(canvas);
    };
  }, [mapRef]);

  return null;
}
