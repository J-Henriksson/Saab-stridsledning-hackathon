import { useEffect, useRef } from "react";

const BANDS = [
  { yFrac: 0.04, ampFrac: 0.022, freq: 0.0030, speed: 0.00028, hue: 138, hue2: 168, thickFrac: 0.068 },
  { yFrac: 0.11, ampFrac: 0.016, freq: 0.0026, speed: 0.00019, hue: 152, hue2: 192, thickFrac: 0.052 },
  { yFrac: 0.19, ampFrac: 0.012, freq: 0.0038, speed: 0.00031, hue: 268, hue2: 298, thickFrac: 0.042 },
  { yFrac: 0.25, ampFrac: 0.009, freq: 0.0033, speed: 0.00021, hue: 176, hue2: 212, thickFrac: 0.032 },
];

export function AuroraOverlay() {
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

    let t   = 0;
    let raf = 0;

    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const band of BANDS) {
        const baseY = band.yFrac * h;
        const amp   = band.ampFrac * h;
        const thick = band.thickFrac * h;

        ctx.beginPath();
        ctx.moveTo(0, baseY + amp * Math.sin(band.freq * 0 + t * band.speed));

        for (let x = 1; x <= w; x += 3) {
          const y = baseY + amp * Math.sin(band.freq * x + t * band.speed);
          ctx.lineTo(x, y);
        }

        // Close the ribbon downward
        for (let x = w; x >= 0; x -= 3) {
          const y = baseY + amp * Math.sin(band.freq * x + t * band.speed) + thick;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp + thick);
        grad.addColorStop(0,   `hsla(${band.hue},  90%, 65%, 0)`);
        grad.addColorStop(0.3, `hsla(${band.hue},  90%, 65%, 0.13)`);
        grad.addColorStop(0.5, `hsla(${band.hue2}, 85%, 70%, 0.18)`);
        grad.addColorStop(0.7, `hsla(${band.hue},  90%, 65%, 0.13)`);
        grad.addColorStop(1,   `hsla(${band.hue},  90%, 65%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
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
