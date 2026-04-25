import { Marker } from "react-map-gl/maplibre";
import type { EnemyEntity, ThreatLevel } from "@/types/game";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import {
  FighterJetIcon,
  TransportAircraftIcon,
  HelicopterIcon,
  APCIcon,
  ArtilleryIcon,
  SAMLauncherIcon,
  WarshipIcon,
} from "@/components/symbols/UnitIcons";

const THREAT_COLOR: Record<ThreatLevel, string> = {
  high:    "#ef4444",
  medium:  "#f59e0b",
  low:     "#84cc16",
  unknown: "#6b7280",
};

function EntityIcon({ category, color, size }: { category: EnemyEntity["category"]; color: string; size: number }) {
  switch (category) {
    case "fighter":      return <FighterJetIcon        size={size} color={color} />;
    case "transport":    return <TransportAircraftIcon  size={size} color={color} />;
    case "helicopter":   return <HelicopterIcon         size={size} color={color} />;
    case "apc":          return <APCIcon                size={size} color={color} />;
    case "artillery":    return <ArtilleryIcon          size={size} color={color} />;
    case "sam_launcher": return <SAMLauncherIcon        size={size} color={color} />;
    case "ship":         return <WarshipIcon            size={size} color={color} />;
    default:             return <FighterJetIcon         size={size} color={color} />;
  }
}

// NATO SIDC for hostile entities — affiliation digit 6 = hostile
const ENTITY_SIDC: Record<EnemyEntity["category"], string> = {
  fighter:      "10061000001103000000", // hostile air fixed-wing
  transport:    "10061000001101000000", // hostile air
  helicopter:   "10061000001107000000", // hostile air rotary
  apc:          "10061000001211000000", // hostile ground armored
  artillery:    "10061000001215000000", // hostile ground artillery
  sam_launcher: "10061000001330010000", // hostile air defense
  ship:         "10063000001202000000", // hostile surface combatant (Sea Surface 30, entity 120200)
};

interface Props {
  entity: EnemyEntity;
  isSelected: boolean;
  onClick: () => void;
  iconStyle?: "custom" | "nato";
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
  iconStyle = "custom",
  isPlaceholder,
  onHoverEnter,
  onHoverMove,
  onHoverLeave,
  dimmed,
}: Props) {
  const color = THREAT_COLOR[entity.threatLevel];

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
          filter: isSelected
            ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color})`
            : undefined,
          transform: isSelected ? "scale(1.2)" : undefined,
          transition: "transform 120ms ease",
          opacity: dimmed ? 0.35 : isPlaceholder ? 0.65 : 1,
        }}
      >
        {iconStyle === "nato"
          ? <UnitSymbol sidc={ENTITY_SIDC[entity.category]} size={28} title={entity.name} />
          : <EntityIcon category={entity.category} color={color} size={26} />
        }
      </div>
    </Marker>
  );
}
