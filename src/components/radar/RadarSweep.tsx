import React from 'react';

interface RadarSweepProps {
  radiusPx: number;
  sweepSpeed: number; // degrees per second
  isOperational: boolean;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({
  radiusPx,
  sweepSpeed,
  isOperational,
}) => {
  if (!isOperational) return null;

  const duration = 360 / sweepSpeed;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: radiusPx * 2,
        height: radiusPx * 2,
        left: -radiusPx,
        top: -radiusPx,
        animation: `radar-sweep ${duration}s linear infinite`,
        transformOrigin: 'center center',
      }}
    >
      <svg
        width={radiusPx * 2}
        height={radiusPx * 2}
        viewBox={`0 0 ${radiusPx * 2} ${radiusPx * 2}`}
        className="overflow-visible"
      >
        <defs>
          <radialGradient id="sweepGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(0, 229, 199, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 229, 199, 0)" />
          </radialGradient>
        </defs>
        {/* A 25-degree sector (pie slice) */}
        <path
          d={describeArc(radiusPx, radiusPx, radiusPx, 0, 25)}
          fill="url(#sweepGradient)"
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
