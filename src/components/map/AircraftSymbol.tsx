import type { AircraftUnit } from "@/types/units";
import type { AircraftType, AircraftStatus, MissionType } from "@/types/game";

/**
 * Modern, harmonized aircraft symbol used inside UnitsLayer for category="aircraft".
 *
 * Replaces the legacy raster Gripen-silhouette PNG that was rendered by AircraftLayer.
 *
 *   • Per-type vector silhouette (Gripen / GlobalEye / UCAV / LOTUS).
 *   • Heading rotation driven by `unit.movement.heading`.
 *   • Status-tinted glow (ready / on_mission / returning / damaged / rebase).
 *   • Optional mission-type chip + fuel pip.
 *   • Threat-warning pulse when the unit is exposed to a hostile SAM ring
 *     (caller decides via `threatened`).
 */

const STATUS_COLOR: Record<AircraftStatus, string> = {
  ready:             "#22c55e",
  allocated:         "#38bdf8",
  in_preparation:    "#facc15",
  awaiting_launch:   "#06b6d4",
  on_mission:        "#3b82f6",
  returning:         "#f59e0b",
  recovering:        "#fb923c",
  under_maintenance: "#eab308",
  unavailable:       "#ef4444",
};

const MISSION_LABEL: Partial<Record<MissionType, string>> = {
  DCA:           "DCA",
  QRA:           "QRA",
  RECCE:         "ISR",
  AEW:           "AEW",
  AI_DT:         "STRIKE",
  AI_ST:         "STRIKE",
  ESCORT:        "ESCORT",
  TRANSPORT:     "TRANS",
  REBASE:        "REBASE",
  ISR_DRONE:     "ISR",
};

interface SilhouetteProps {
  fill: string;
  stroke: string;
}

/** All silhouettes drawn nose-up (heading = 0 ⇒ pointing north). */
function GripenSilhouette({ fill, stroke }: SilhouetteProps) {
  // Delta-canard fighter: pointed nose, swept delta wings, twin canards near nose, single fin.
  return (
    <g>
      {/* Fuselage */}
      <path
        d="M 0 -11 L 1.6 -3 L 1.6 6 L 0.8 11 L -0.8 11 L -1.6 6 L -1.6 -3 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Main delta wings */}
      <path
        d="M -1.4 0 L -10 7 L -2 6 Z M 1.4 0 L 10 7 L 2 6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
        strokeLinejoin="round"
        opacity={0.95}
      />
      {/* Forward canards */}
      <path
        d="M -1.4 -5 L -5 -2 L -1.6 -3 Z M 1.4 -5 L 5 -2 L 1.6 -3 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.4}
      />
      {/* Vertical fin */}
      <path
        d="M -0.7 7 L 0 4 L 0.7 7 L 0 9 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.4}
      />
    </g>
  );
}

function GlobalEyeSilhouette({ fill, stroke }: SilhouetteProps) {
  // AEW jet: wide fuselage, long swept wings, distinctive radome bar across the back.
  return (
    <g>
      {/* Fuselage */}
      <path
        d="M 0 -12 L 2 -4 L 2 8 L 1.2 12 L -1.2 12 L -2 8 L -2 -4 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.6}
      />
      {/* Wings */}
      <path
        d="M -2 1 L -13 5 L -10 6 L -2 4 Z M 2 1 L 13 5 L 10 6 L 2 4 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      {/* Radome (long beam across the spine) */}
      <rect x={-9} y={-1} width={18} height={2.2} rx={1.1} fill={stroke} opacity={0.95} />
      <rect x={-9} y={-1} width={18} height={2.2} rx={1.1} fill="none" stroke={fill} strokeWidth={0.4} />
      {/* Tail */}
      <path
        d="M -2.5 8 L 0 5 L 2.5 8 L 0 10 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.4}
      />
    </g>
  );
}

function UCAVSilhouette({ fill, stroke }: SilhouetteProps) {
  // Stealth flying wing (VLO_UCAV): clean delta with no separate fin, sharp leading edge.
  return (
    <g>
      <path
        d="M 0 -10 L 9 6 L 4 7 L 0 5 L -4 7 L -9 6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Engine inlet */}
      <ellipse cx={0} cy={-4} rx={1.2} ry={2} fill={stroke} opacity={0.7} />
    </g>
  );
}

function LotusSilhouette({ fill, stroke }: SilhouetteProps) {
  // Transport / tanker class — fatter outline, longer wings, twin engines.
  return (
    <g>
      <path
        d="M 0 -11 L 2.4 -2 L 2.4 9 L 1 12 L -1 12 L -2.4 9 L -2.4 -2 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.6}
      />
      <path
        d="M -2.4 -1 L -12 4 L -10 5 L -2.4 3 Z M 2.4 -1 L 12 4 L 10 5 L 2.4 3 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
      />
      {/* Engine pods */}
      <ellipse cx={-6} cy={3.3} rx={1.1} ry={0.6} fill={stroke} />
      <ellipse cx={ 6} cy={3.3} rx={1.1} ry={0.6} fill={stroke} />
      {/* Tail */}
      <path d="M -2.5 9 L 0 5 L 2.5 9 L 0 11 Z" fill={fill} stroke={stroke} strokeWidth={0.4} />
    </g>
  );
}

function silhouetteFor(type: AircraftType): (p: SilhouetteProps) => JSX.Element {
  switch (type) {
    case "GlobalEye": return GlobalEyeSilhouette;
    case "VLO_UCAV":  return UCAVSilhouette;
    case "LOTUS":     return LotusSilhouette;
    case "GripenE":
    case "GripenF_EA":
    default:          return GripenSilhouette;
  }
}

interface Props {
  aircraft: AircraftUnit;
  size?: number;
  selected?: boolean;
  /** Highlight the unit if its current path is exposed to hostile SAM coverage. */
  threatened?: boolean;
  /** Show mission-type chip below the silhouette. */
  showMissionBadge?: boolean;
}

export function AircraftSymbol({
  aircraft,
  size = 36,
  selected,
  threatened,
  showMissionBadge = false,
}: Props) {
  const heading = aircraft.movement.heading ?? 0;
  const statusColor = STATUS_COLOR[aircraft.status] ?? "#94a3b8";
  // Affiliation tints the silhouette body; status drives the glow ring.
  const fill = aircraft.affiliation === "hostile" ? "#1f0a0a" : "#0e1626";
  const stroke =
    aircraft.affiliation === "hostile" ? "#fca5a5" :
    aircraft.affiliation === "neutral" ? "#cbd5e1" :
    "#bfdbfe";

  const Silhouette = silhouetteFor(aircraft.type);

  const fuel = aircraft.fuel ?? 100;
  const fuelColor = fuel < 10 ? "#ef4444" : fuel < 30 ? "#f59e0b" : "#22c55e";

  const missionLabel = aircraft.currentMission ? MISSION_LABEL[aircraft.currentMission] : null;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      {/* Status / threat glow ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `${selected ? 2 : 1}px solid ${threatened ? "#ef4444" : statusColor}`,
          background: `${threatened ? "rgba(239,68,68,0.10)" : `${statusColor}12`}`,
          boxShadow: selected
            ? `0 0 12px ${statusColor}`
            : threatened
              ? "0 0 10px rgba(239,68,68,0.55)"
              : `0 0 6px ${statusColor}55`,
          transition: "box-shadow 200ms ease, border-color 200ms ease",
        }}
      />

      {/* Silhouette */}
      <svg
        viewBox="-14 -14 28 28"
        width={size}
        height={size}
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${heading}deg)`,
          transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Silhouette fill={fill} stroke={stroke} />
      </svg>

      {/* Fuel pip — fixed in the upper-right, doesn't rotate */}
      <div
        style={{
          position: "absolute",
          right: -2,
          top: -2,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: fuelColor,
          boxShadow: `0 0 4px ${fuelColor}`,
          border: "1px solid rgba(8,12,20,0.85)",
        }}
        title={`Bränsle ${Math.round(fuel)}%`}
      />

      {/* Mission badge — fixed below the silhouette, doesn't rotate */}
      {showMissionBadge && missionLabel && (
        <div
          style={{
            position: "absolute",
            top: size - 2,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(8,12,20,0.85)",
            border: `1px solid ${statusColor}`,
            color: statusColor,
            padding: "1px 5px",
            fontFamily: "ui-monospace, monospace",
            fontSize: 8,
            letterSpacing: "0.06em",
            fontWeight: 700,
            whiteSpace: "nowrap",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        >
          {missionLabel}
        </div>
      )}
    </div>
  );
}
