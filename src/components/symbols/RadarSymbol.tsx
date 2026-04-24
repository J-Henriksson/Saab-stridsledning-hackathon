import React from 'react';
import { RadarStatus } from '../../types/radarUnit';

interface RadarSymbolProps {
  status: RadarStatus;
  echelon?: 'team' | 'platoon' | 'battalion';
  size?: number;
}

export const RadarSymbol: React.FC<RadarSymbolProps> = ({
  status,
  echelon = 'platoon',
  size = 48,
}) => {
  const radarTeal = '#00E5C7';
  
  const isOperational = status === 'operational';
  const isStandby = status === 'standby';
  const isMaintenance = status === 'maintenance';

  const containerStyle: React.CSSProperties = {
    width: size,
    height: (size * 44) / 56,
    opacity: isMaintenance ? 0.5 : isStandby ? 0.7 : 1,
    boxShadow: isOperational ? `0 0 8px ${radarTeal}` : 'none',
    transition: 'all 0.3s ease',
  };

  const echelonMarker = {
    team: '●',
    platoon: '●●',
    battalion: 'II',
  }[echelon];

  return (
    <div 
      className={`relative flex items-center justify-center ${isOperational ? 'animate-pulse' : ''}`}
      style={containerStyle}
    >
      <svg
        viewBox="0 0 56 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Frame */}
        <rect
          x="2"
          y="10"
          width="52"
          height="32"
          stroke={radarTeal}
          strokeWidth="2"
          strokeDasharray={isMaintenance ? '4 2' : 'none'}
          fill="rgba(0, 229, 199, 0.05)"
        />

        {/* Echelon */}
        <text
          x="28"
          y="8"
          fill={radarTeal}
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
        >
          {echelonMarker}
        </text>

        {/* Radar Inner Symbol */}
        <g transform="translate(10, 16)">
          <circle cx="18" cy="11" r="2" fill={radarTeal} />
          <path
            d="M18 11L18 20"
            stroke={radarTeal}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 15C10 11.134 13.134 8 17 8M26 15C26 11.134 22.866 8 19 8"
            stroke={radarTeal}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 18C6 11.3726 11.3726 6 18 6C24.6274 6 30 11.3726 30 18"
            stroke={radarTeal}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
};
