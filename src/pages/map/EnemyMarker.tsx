import { Marker } from "react-map-gl/maplibre";
import type { EnemyBase, ThreatLevel } from "@/types/game";

const THREAT_FILL: Record<ThreatLevel, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#84cc16",
  unknown: "#6b7280",
};

interface Props {
  base: EnemyBase;
  isSelected: boolean;
  onClick: () => void;
  isPlaceholder?: boolean;
}

export function EnemyMarker({ base, isSelected, onClick, isPlaceholder }: Props) {
  const fill = THREAT_FILL[base.threatLevel];

  return (
    <Marker longitude={base.coords.lng} latitude={base.coords.lat} anchor="center">
      <div
        title={`${base.name} — ${base.category}${isPlaceholder ? " [PLAN]" : ""}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="cursor-pointer"
        style={{
          filter: isSelected ? `drop-shadow(0 0 6px ${fill})` : undefined,
          opacity: isPlaceholder ? 0.65 : 1,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32">
          <polygon
            points="16,2 28,9 28,23 16,30 4,23 4,9"
            fill={fill}
            fillOpacity={isSelected ? 0.4 : 0.2}
            stroke={fill}
            strokeWidth={isSelected ? 2 : 1.5}
            strokeDasharray={isPlaceholder ? "5,3" : undefined}
          />
          <line x1="16" y1="7" x2="16" y2="25" stroke={fill} strokeWidth={1.5} />
          <line x1="7" y1="16" x2="25" y2="16" stroke={fill} strokeWidth={1.5} />
        </svg>
      </div>
    </Marker>
  );
}
