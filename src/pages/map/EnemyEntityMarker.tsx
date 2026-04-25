import { Marker } from "react-map-gl/maplibre";
import type { EnemyEntity, ThreatLevel } from "@/types/game";

const THREAT_FILL: Record<ThreatLevel, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#84cc16",
  unknown: "#6b7280",
};

interface Props {
  entity: EnemyEntity;
  isSelected: boolean;
  onClick: () => void;
  isPlaceholder?: boolean;
  /** Optional mouse handlers (used by battle-intel hover tooltip). */
  onHoverEnter?: (x: number, y: number) => void;
  onHoverMove?: (x: number, y: number) => void;
  onHoverLeave?: () => void;
  /** Dim opacity when this target is out of reach for the active travel-range unit. */
  dimmed?: boolean;
}

export function EnemyEntityMarker({
  entity,
  isSelected,
  onClick,
  isPlaceholder,
  onHoverEnter,
  onHoverMove,
  onHoverLeave,
  dimmed,
}: Props) {
  const fill = THREAT_FILL[entity.threatLevel];

  return (
    <Marker longitude={entity.coords.lng} latitude={entity.coords.lat} anchor="center">
      <div
        title={`${entity.name} — ${entity.category}${isPlaceholder ? " [PLAN]" : ""}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseEnter={(e) => onHoverEnter?.(e.clientX, e.clientY)}
        onMouseMove={(e) => onHoverMove?.(e.clientX, e.clientY)}
        onMouseLeave={() => onHoverLeave?.()}
        className="cursor-pointer"
        style={{
          filter: isSelected ? `drop-shadow(0 0 6px ${fill})` : undefined,
          opacity: dimmed ? 0.35 : isPlaceholder ? 0.65 : 1,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon
            points="12,1 23,12 12,23 1,12"
            fill={fill}
            fillOpacity={isSelected ? 0.4 : 0.2}
            stroke={fill}
            strokeWidth={isSelected ? 2 : 1.5}
            strokeDasharray={isPlaceholder ? "4,3" : undefined}
          />
          <circle cx="12" cy="12" r="2.5" fill={fill} />
        </svg>
      </div>
    </Marker>
  );
}
