import React, { useRef } from 'react';

interface RadarSweepProps {
  radiusPx: number;
  sweepSpeed: number; // degrees per second
  isOperational: boolean;
}

const SECTOR_DEG = 32;

let __sweepInstanceCounter = 0;

export const RadarSweep: React.FC<RadarSweepProps> = ({
  radiusPx,
  sweepSpeed,
  isOperational,
}) => {
  const uidRef = useRef<number | null>(null);
  if (uidRef.current === null) {
    __sweepInstanceCounter += 1;
    uidRef.current = __sweepInstanceCounter;
  }

  if (!isOperational) return null;
  if (radiusPx < 16) return null;

  const uid = uidRef.current;
  const duration = 360 / sweepSpeed;
  const size = radiusPx * 2;
  const c = radiusPx;
  const r = radiusPx;
  const lead = polarToCartesian(c, c, r, SECTOR_DEG);

  const fadeId = `rs-fade-${uid}`;
  const beamId = `rs-beam-${uid}`;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        left: -radiusPx,
        top: -radiusPx,
        animation: `radar-sweep ${duration}s linear infinite`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          {/* Angular falloff — bright leading edge, faint trailing edge */}
          <radialGradient id={fadeId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(0, 229, 199, 0.26)" />
            <stop offset="60%" stopColor="rgba(0, 229, 199, 0.09)" />
            <stop offset="100%" stopColor="rgba(0, 229, 199, 0)" />
          </radialGradient>
          {/* Leading-edge beam — bright cyan-white fading to transparent at the range limit */}
          <linearGradient
            id={beamId}
            gradientUnits="userSpaceOnUse"
            x1={c}
            y1={c}
            x2={lead.x}
            y2={lead.y}
          >
            <stop offset="0%" stopColor="rgba(210, 255, 245, 0.95)" />
            <stop offset="55%" stopColor="rgba(0, 229, 199, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 229, 199, 0)" />
          </linearGradient>
        </defs>

        {/* Trailing wedge */}
        <path
          d={describeArc(c, c, r, 0, SECTOR_DEG)}
          fill={`url(#${fadeId})`}
        />

        {/* Leading-edge beam line */}
        <line
          x1={c}
          y1={c}
          x2={lead.x}
          y2={lead.y}
          stroke={`url(#${beamId})`}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      </svg>
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  const d = [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', x, y,
    'Z'
  ].join(' ');

  return d;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}
