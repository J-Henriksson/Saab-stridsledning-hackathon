const SWEEP_STYLE = `
@keyframes radar-sweep {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}`;

export function RadarSweep({ size = 56 }: { size?: number }) {
  const r = size / 2;
  const angleDeg = 40;
  const angleRad = (angleDeg * Math.PI) / 180;
  // Sector path: center → top (12 o'clock) → arc 40° clockwise → back to center
  const x1 = r + r * Math.sin(0);
  const y1 = r - r * Math.cos(0);
  const x2 = r + r * Math.sin(angleRad);
  const y2 = r - r * Math.cos(angleRad);
  const d = `M${r},${r} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;

  return (
    <>
      <style>{SWEEP_STYLE}</style>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: size,
          height: size,
          transformOrigin: "50% 50%",
          animation: "radar-sweep 3s linear infinite",
          pointerEvents: "none",
        }}
      >
        <svg
          width={size}
          height={size}
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            <radialGradient id="sweep-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(34,197,94,0.55)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0.05)" />
            </radialGradient>
          </defs>
          <path d={d} fill="url(#sweep-grad)" />
        </svg>
      </div>
    </>
  );
}
