import { useEffect, useRef } from "react";

const COUNT        = 400;
const BASE_SPEED   = 1.3;
const TRAIL_LEN    = 18;
// How fast the global wind direction rotates (radians per frame)
const DIR_DRIFT    = 0.00018;
// Curl noise strength — adds local turbulence on top of the global direction
const CURL         = 0.55;

interface Particle {
  xs: number[]; ys: number[];
  head: number;
  speed: number;
  life: number; maxLife: number;
}

function spawnEdge(w: number, h: number, angle: number): { x: number; y: number } {
  // Spawn on the upwind edge so particles cross the canvas
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Choose the edge most facing into the wind
  if (Math.random() < 0.55) {
    // Left or right edge based on horizontal component
    const x = cos >= 0 ? 0 : w;
    return { x, y: Math.random() * h };
  } else {
    // Top or bottom edge based on vertical component
    const y = sin >= 0 ? 0 : h;
    return { x: Math.random() * w, y };
  }
}

function makeParticle(w: number, h: number, angle: number, scatter: boolean): Particle {
  let x: number, y: number;
  if (scatter) {
    x = Math.random() * w;
    y = Math.random() * h;
  } else {
    const e = spawnEdge(w, h, angle);
    x = e.x; y = e.y;
  }
  const maxLife = 150 + Math.random() * 200;
  const life    = scatter ? Math.random() * maxLife : 0;
  const xs = Array(TRAIL_LEN).fill(x) as number[];
  const ys = Array(TRAIL_LEN).fill(y) as number[];
  return { xs, ys, head: 0, speed: 0.55 + Math.random() * 0.9, life, maxLife };
}

function reset(p: Particle, w: number, h: number, angle: number) {
  const e = spawnEdge(w, h, angle);
  p.xs.fill(e.x); p.ys.fill(e.y);
  p.head    = 0;
  p.life    = 0;
  p.maxLife = 150 + Math.random() * 200;
  p.speed   = 0.55 + Math.random() * 0.9;
}

export function WindLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sync = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);

    // Start with a gentle SW→NE direction
    let angle = -0.48; // radians; negative Y = upward on screen
    let parts = Array.from({ length: COUNT }, () =>
      makeParticle(canvas.width || 1200, canvas.height || 800, angle, true)
    );

    let t   = 0;
    let raf = 0;

    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Slowly rotate wind direction with a gentle sine oscillation
      angle += DIR_DRIFT * Math.sin(t * 0.00045 + 1.2);

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      for (const p of parts) {
        const cur = p.head;
        const x   = p.xs[cur];
        const y   = p.ys[cur];

        // Global wind + curl turbulence
        const vx = cosA * BASE_SPEED * p.speed + CURL * Math.sin(y * 0.0048 + t * 0.00065);
        const vy = sinA * BASE_SPEED * p.speed + CURL * Math.cos(x * 0.0048 + t * 0.00065);
        const nx = x + vx;
        const ny = y + vy;

        p.head           = (cur + 1) % TRAIL_LEN;
        p.xs[p.head]     = nx;
        p.ys[p.head]     = ny;
        p.life++;

        // Fade in → hold → fade out
        const frac   = p.life / p.maxLife;
        const gAlpha = frac < 0.10 ? frac / 0.10 : frac > 0.80 ? (1 - frac) / 0.20 : 1;

        // Draw trail oldest → newest with increasing opacity
        for (let s = 1; s < TRAIL_LEN; s++) {
          const idxA     = (p.head - s         + TRAIL_LEN * 2) % TRAIL_LEN;
          const idxB     = (p.head - s + 1     + TRAIL_LEN * 2) % TRAIL_LEN;
          const segAlpha = (s / TRAIL_LEN) * gAlpha * 0.55;
          ctx.beginPath();
          ctx.moveTo(p.xs[idxA], p.ys[idxA]);
          ctx.lineTo(p.xs[idxB], p.ys[idxB]);
          ctx.strokeStyle = `rgba(255,255,255,${segAlpha})`;
          ctx.lineWidth   = 0.9;
          ctx.stroke();
        }

        const off = nx < -16 || nx > w + 16 || ny < -16 || ny > h + 16;
        if (p.life >= p.maxLife || off) reset(p, w, h, angle);
      }

      t++;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "screen", zIndex: 1 }}
    />
  );
}
