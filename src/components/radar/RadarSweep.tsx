import React, { useRef } from 'react';

interface RadarSweepProps {
  radiusPx: number;
  sweepSpeed: number;
  isOperational: boolean;
}

const GREEN = '#22c55e';
const RING_COUNT = 4;
const PULSE_DURATION = 3; // seconds per full pulse cycle

let __sweepInstanceCounter = 0;

export const RadarSweep: React.FC<RadarSweepProps> = ({
  radiusPx,
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
  const size = radiusPx * 2;
  const keyframeName = `radar-pulse-${uid}`;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        marginLeft: -radiusPx,
        marginTop: -radiusPx,
      }}
    >
      {/* Expanding pulse rings */}
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1.5px solid ${GREEN}`,
            animationName: keyframeName,
            animationDuration: `${PULSE_DURATION}s`,
            animationTimingFunction: 'ease-out',
            animationDelay: `${(i * PULSE_DURATION) / RING_COUNT}s`,
            animationIterationCount: 'infinite',
            transformOrigin: 'center',
          }}
        />
      ))}

      {/* Faint filled disc — inner glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: GREEN,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 10px 3px rgba(34,197,94,0.6)`,
        }}
      />

      <style>{`
        @keyframes ${keyframeName} {
          0%   { transform: scale(0.04); opacity: 0.9; }
          40%  { opacity: 0.55; }
          100% { transform: scale(1);    opacity: 0;   }
        }
      `}</style>
    </div>
  );
};
