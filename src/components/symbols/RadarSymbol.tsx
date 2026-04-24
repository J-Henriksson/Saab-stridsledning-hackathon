import React from 'react';
import { RadarStatus } from '../../types/radarUnit';

interface RadarSymbolProps {
  status: RadarStatus;
  size?: number;
}

const GREEN      = '#22c55e';
const GREEN_DIM  = '#16a34a';
const AMBER      = '#D7AB3A';
const GREY       = '#6B7280';

export const RadarSymbol: React.FC<RadarSymbolProps> = ({ status, size = 42 }) => {
  const isOperational = status === 'operational';
  const isStandby     = status === 'standby';

  const ringColor  = isOperational ? GREEN : isStandby ? AMBER : GREY;
  const dotColor   = isOperational ? GREEN : isStandby ? AMBER : GREY;
  const opacity    = status === 'maintenance' ? 0.45 : 1;

  return (
    <div
      style={{
        width: size,
        height: size,
        opacity,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Outer ring */}
        <circle
          cx="21" cy="21" r="18"
          stroke={ringColor}
          strokeWidth="1.5"
          strokeDasharray={status === 'maintenance' ? '4 3' : undefined}
          fill={isOperational ? 'rgba(34,197,94,0.07)' : 'transparent'}
        />
        {/* Inner ring */}
        <circle
          cx="21" cy="21" r="11"
          stroke={ringColor}
          strokeWidth="1"
          opacity={0.45}
          fill="none"
        />
        {/* Center dot */}
        <circle
          cx="21" cy="21" r="4"
          fill={dotColor}
          style={isOperational ? { filter: `drop-shadow(0 0 4px ${GREEN})` } : undefined}
        />
        {/* Status tick — standby shows dashed outer */}
        {isStandby && (
          <circle
            cx="21" cy="21" r="18"
            stroke={AMBER}
            strokeWidth="1.5"
            strokeDasharray="5 3"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
};
