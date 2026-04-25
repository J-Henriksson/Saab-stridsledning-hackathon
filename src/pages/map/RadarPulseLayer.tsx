import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { ExtendedRadarUnit } from "@/types/radarUnit";

const PULSE_COUNT = 2;
const PULSE_MS    = 14000;
const GREEN       = "34,197,94";

export function RadarPulseLayer({ units }: { units: ExtendedRadarUnit[] }) {
  const { current: mapRef } = useMap();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const unitsRef   = useRef(units);        // stable ref — loop reads this
  const t0Ref      = useRef(performance.now());

  // Keep ref current without restarting the loop
  useEffect(() => { unitsRef.current = units; }, [units]);

  // Single stable RAF loop — only (re)starts when the map mounts
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const loop = () => {
      const canvas = canvasRef.current;
      const m      = mapRef?.getMap();
      if (canvas && m) {
        const mc  = m.getCanvas();
        const dpr = window.devicePixelRatio || 1;
        const w   = mc.clientWidth;
        const h   = mc.clientHeight;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width        = w * dpr;
          canvas.height       = h * dpr;
          canvas.style.width  = `${w}px`;
          canvas.style.height = `${h}px`;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);

          const elapsed = performance.now() - t0Ref.current;

          for (const unit of unitsRef.current) {
            if (unit.status !== "operational") continue;

            const { lng, lat } = unit.position;
            const c    = m.project([lng, lat]);
            const edge = m.project([lng, lat + unit.rangeRadius / 111320]);
            const maxR = Math.hypot(c.x - edge.x, c.y - edge.y);
            if (maxR < 10) continue;

            // Expanding rings
            for (let i = 0; i < PULSE_COUNT; i++) {
              const phase   = ((elapsed + i * (PULSE_MS / PULSE_COUNT)) % PULSE_MS) / PULSE_MS;
              const r       = maxR * phase;
              const opacity = 0.8 * (1 - phase);
              ctx.beginPath();
              ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
              ctx.strokeStyle = `rgba(${GREEN},${opacity.toFixed(3)})`;
              ctx.lineWidth   = 1.8;
              ctx.stroke();
            }

            // Soft inner glow
            const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, maxR * 0.3);
            grd.addColorStop(0, `rgba(${GREEN},0.07)`);
            grd.addColorStop(1, `rgba(${GREEN},0)`);
            ctx.beginPath();
            ctx.arc(c.x, c.y, maxR * 0.3, 0, 2 * Math.PI);
            ctx.fillStyle = grd;
            ctx.fill();

            // Center dot
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle   = `rgb(${GREEN})`;
            ctx.shadowColor = `rgba(${GREEN},0.9)`;
            ctx.shadowBlur  = 10;
            ctx.fill();
            ctx.shadowBlur  = 0;
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const start = () => { rafRef.current = requestAnimationFrame(loop); };
    if (map.isStyleLoaded()) start(); else map.once("load", start);

    return () => cancelAnimationFrame(rafRef.current);
  }, [mapRef]); // ← only mapRef: loop is stable, reads units via ref

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 2 }}
    />
  );
}
