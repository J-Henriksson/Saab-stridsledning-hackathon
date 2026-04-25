/**
 * Tactical map SVG icons — top-down perspective.
 * All icons use viewBox="0 0 32 32".
 * Filled shapes carry a black outline via paintOrder="stroke fill".
 */

interface P { size?: number; color?: string; style?: React.CSSProperties }

const OUTLINE = { stroke: "rgba(0,0,0,0.85)", strokeWidth: 2, paintOrder: "stroke fill" as const };
const OUTLINE_THIN = { stroke: "rgba(0,0,0,0.85)", strokeWidth: 1.5, paintOrder: "stroke fill" as const };

// ── Drones ────────────────────────────────────────────────────────────────────

export function ISRDroneIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Arms */}
      <line x1="7"  y1="7"  x2="13" y2="13" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="25" y1="7"  x2="19" y2="13" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="7"  y1="25" x2="13" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="25" y1="25" x2="19" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      {/* Propeller rings */}
      <circle cx="5"  cy="5"  r="4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8"/>
      <circle cx="27" cy="5"  r="4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8"/>
      <circle cx="5"  cy="27" r="4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8"/>
      <circle cx="27" cy="27" r="4" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.8"/>
      {/* Propeller cross lines */}
      <line x1="3"  y1="5"  x2="7"  y2="5"  stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="5"  y1="3"  x2="5"  y2="7"  stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="25" y1="3"  x2="25" y2="7"  stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="23" y1="5"  x2="29" y2="5"  stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="3"  y1="27" x2="7"  y2="27" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="5"  y1="25" x2="5"  y2="29" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="23" y1="27" x2="29" y2="27" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="27" y1="25" x2="27" y2="29" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      {/* Body */}
      <rect x="12" y="12" width="8" height="8" rx="2" fill={color} {...OUTLINE}/>
      {/* Camera dome */}
      <circle cx="16" cy="16" r="2" fill="rgba(0,0,0,0.35)" stroke={color} strokeWidth="1"/>
    </svg>
  );
}

export function StrikeDroneIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Fuselage */}
      <ellipse cx="16" cy="17" rx="2.5" ry="11" fill={color} {...OUTLINE}/>
      {/* Delta wings */}
      <polygon points="16,9 2,26 14.5,22" fill={color} {...OUTLINE}/>
      <polygon points="16,9 30,26 17.5,22" fill={color} {...OUTLINE}/>
      {/* Tail fins */}
      <polygon points="13,27 10,32 16,29.5" fill={color} {...OUTLINE_THIN}/>
      <polygon points="19,27 22,32 16,29.5" fill={color} {...OUTLINE_THIN}/>
      {/* Nose cone */}
      <polygon points="16,6 14.5,10 17.5,10" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

// ── Ground vehicles ───────────────────────────────────────────────────────────

export function TankIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Tracks */}
      <rect x="1"  y="9"  width="4" height="14" rx="2" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
      <rect x="27" y="9"  width="4" height="14" rx="2" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
      {/* Body */}
      <rect x="5"  y="10" width="22" height="12" rx="2" fill={color} {...OUTLINE}/>
      {/* Turret */}
      <circle cx="15" cy="16" r="6" fill={color} {...OUTLINE}/>
      {/* Barrel */}
      <rect x="21" y="14.5" width="10" height="3" rx="1.5" fill={color} {...OUTLINE}/>
    </svg>
  );
}

export function APCIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Tracks */}
      <rect x="1"  y="9"  width="4" height="14" rx="2" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
      <rect x="27" y="9"  width="4" height="14" rx="2" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
      {/* Body */}
      <rect x="5" y="9" width="22" height="14" rx="2.5" fill={color} {...OUTLINE}/>
      {/* Flat turret box */}
      <rect x="9" y="12" width="12" height="8" rx="2" fill={color} {...OUTLINE}/>
      {/* Vision slits */}
      <rect x="10" y="13.5" width="10" height="1.5" rx="0.75" fill="rgba(0,0,0,0.35)"/>
      <rect x="10" y="16.5" width="10" height="1.5" rx="0.75" fill="rgba(0,0,0,0.35)"/>
    </svg>
  );
}

export function TruckIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Body */}
      <rect x="5" y="8" width="22" height="18" rx="2.5" fill={color} {...OUTLINE}/>
      {/* Cab divider */}
      <line x1="5" y1="14" x2="27" y2="14" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
      {/* Wheels (4 corners) */}
      <circle cx="9"  cy="7"  r="3" fill={color} {...OUTLINE_THIN}/>
      <circle cx="23" cy="7"  r="3" fill={color} {...OUTLINE_THIN}/>
      <circle cx="9"  cy="27" r="3" fill={color} {...OUTLINE_THIN}/>
      <circle cx="23" cy="27" r="3" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

export function ArtilleryIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Gun body */}
      <ellipse cx="11" cy="14" rx="7" ry="6" fill={color} {...OUTLINE}/>
      {/* Barrel */}
      <rect x="17" y="13" width="14" height="3" rx="1.5" fill={color} {...OUTLINE}/>
      {/* Wheels */}
      <circle cx="7"  cy="22" r="4" stroke={color} strokeWidth="2.5" fill="none" {...OUTLINE_THIN}/>
      <circle cx="17" cy="22" r="4" stroke={color} strokeWidth="2.5" fill="none" {...OUTLINE_THIN}/>
      {/* Axle */}
      <line x1="7" y1="22" x2="17" y2="22" stroke={color} strokeWidth="1.8"/>
      {/* Shield */}
      <rect x="5" y="10" width="5" height="6" rx="1" fill={color} fillOpacity="0.6" {...OUTLINE_THIN}/>
    </svg>
  );
}

export function SAMLauncherIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Vehicle base */}
      <rect x="2" y="20" width="28" height="10" rx="2.5" fill={color} {...OUTLINE}/>
      {/* Missile tubes (3) */}
      <rect x="5"    y="6"  width="4" height="14" rx="2" fill={color} {...OUTLINE_THIN}/>
      <rect x="14"   y="3"  width="4" height="17" rx="2" fill={color} {...OUTLINE_THIN}/>
      <rect x="23"   y="6"  width="4" height="14" rx="2" fill={color} {...OUTLINE_THIN}/>
      {/* Tips */}
      <polygon points="7,6  5,10  9,10"  fill={color} {...OUTLINE_THIN}/>
      <polygon points="16,3 14,7  18,7"  fill={color} {...OUTLINE_THIN}/>
      <polygon points="25,6 23,10 27,10" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

// ── Naval ─────────────────────────────────────────────────────────────────────

export function WarshipIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Hull — pointed bow at top */}
      <path d="M16,2 L23,10 L23,28 L16,31 L9,28 L9,10 Z" fill={color} {...OUTLINE}/>
      {/* Forward tower */}
      <rect x="12" y="11" width="8" height="7" rx="1.5" fill={color} {...OUTLINE_THIN}/>
      {/* Rear structure */}
      <rect x="12" y="20" width="8" height="6" rx="1.5" fill={color} {...OUTLINE_THIN}/>
      {/* Gun mount */}
      <circle cx="16" cy="8" r="2.5" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

export function FrigateIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Wider hull */}
      <path d="M16,1 L25,10 L25,29 L16,32 L7,29 L7,10 Z" fill={color} {...OUTLINE}/>
      {/* Forward superstructure */}
      <rect x="11" y="10" width="10" height="7" rx="1.5" fill={color} {...OUTLINE_THIN}/>
      {/* Aft superstructure */}
      <rect x="11" y="19" width="10" height="7" rx="1.5" fill={color} {...OUTLINE_THIN}/>
      {/* Radar mast */}
      <circle cx="16" cy="7"  r="2" fill={color} {...OUTLINE_THIN}/>
      <line x1="16" y1="2" x2="16" y2="7" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

export function SubmarineIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Hull */}
      <ellipse cx="16" cy="19" rx="13" ry="6.5" fill={color} {...OUTLINE}/>
      {/* Conning tower */}
      <rect x="12" y="11" width="8" height="8" rx="2" fill={color} {...OUTLINE}/>
      {/* Periscope */}
      <line x1="16" y1="6" x2="16" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <rect x="13" y="5" width="6" height="2" rx="1" fill={color} {...OUTLINE_THIN}/>
      {/* Stern propeller */}
      <line x1="3" y1="16" x2="3" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function PatrolBoatIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Small hull */}
      <path d="M16,4 L22,12 L22,27 L16,29 L10,27 L10,12 Z" fill={color} {...OUTLINE}/>
      {/* Bridge */}
      <rect x="13" y="15" width="6" height="8" rx="1.5" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

export function AmphIbShipIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Wide flat hull */}
      <rect x="2" y="14" width="28" height="16" rx="4" fill={color} {...OUTLINE}/>
      {/* Bow ramp at bottom */}
      <path d="M2,18 L16,14 L30,18" fill={color} fillOpacity="0.6" stroke={color} strokeWidth="1.5"/>
      {/* Island superstructure (starboard) */}
      <rect x="19" y="8" width="9" height="10" rx="2" fill={color} {...OUTLINE}/>
      {/* Mast */}
      <line x1="23" y1="4" x2="23" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function LogisticsShipIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Hull */}
      <path d="M16,3 L22,11 L22,29 L16,31 L10,29 L10,11 Z" fill={color} {...OUTLINE}/>
      {/* Cargo hatches */}
      <rect x="12" y="13" width="8" height="5" rx="1" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="1.2"/>
      <rect x="12" y="20" width="8" height="5" rx="1" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="1.2"/>
      {/* Bridge */}
      <rect x="13" y="7"  width="6" height="5" rx="1.5" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

// ── Enemy aircraft & rotary ───────────────────────────────────────────────────

export function FighterJetIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Fuselage */}
      <ellipse cx="16" cy="16" rx="2.5" ry="12" fill={color} {...OUTLINE}/>
      {/* Swept wings */}
      <polygon points="16,11 2,26 15,21" fill={color} {...OUTLINE}/>
      <polygon points="16,11 30,26 17,21" fill={color} {...OUTLINE}/>
      {/* Tail fins */}
      <polygon points="13.5,26 10,31 16,28.5" fill={color} {...OUTLINE_THIN}/>
      <polygon points="18.5,26 22,31 16,28.5" fill={color} {...OUTLINE_THIN}/>
      {/* Intake bumps */}
      <ellipse cx="13" cy="18" rx="2" ry="3" fill={color} fillOpacity="0.6" {...OUTLINE_THIN}/>
      <ellipse cx="19" cy="18" rx="2" ry="3" fill={color} fillOpacity="0.6" {...OUTLINE_THIN}/>
    </svg>
  );
}

export function TransportAircraftIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Fuselage */}
      <ellipse cx="16" cy="16" rx="3.5" ry="12" fill={color} {...OUTLINE}/>
      {/* Straight wings */}
      <rect x="2" y="13" width="28" height="6" rx="3" fill={color} {...OUTLINE}/>
      {/* T-tail */}
      <rect x="10" y="25" width="12" height="4" rx="2" fill={color} {...OUTLINE}/>
      {/* Engines on wings */}
      <ellipse cx="7"  cy="16" rx="3" ry="1.5" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
      <ellipse cx="25" cy="16" rx="3" ry="1.5" fill={color} fillOpacity="0.7" {...OUTLINE_THIN}/>
    </svg>
  );
}

export function HelicopterIcon({ size = 32, color = "currentColor", style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Main rotor span — horizontal */}
      <rect x="1" y="12" width="30" height="3" rx="1.5" fill={color} fillOpacity="0.6" {...OUTLINE_THIN}/>
      {/* Main rotor span — vertical */}
      <rect x="14" y="2" width="4" height="14" rx="2" fill={color} fillOpacity="0.4" {...OUTLINE_THIN}/>
      {/* Rotor hub */}
      <circle cx="16" cy="14" r="2.5" fill={color} {...OUTLINE_THIN}/>
      {/* Body */}
      <ellipse cx="16" cy="20" rx="5" ry="7" fill={color} {...OUTLINE}/>
      {/* Tail boom */}
      <rect x="15" y="26" width="3" height="6" rx="1.5" fill={color} {...OUTLINE_THIN}/>
      {/* Tail rotor */}
      <rect x="9" y="30" width="14" height="2.5" rx="1.25" fill={color} {...OUTLINE_THIN}/>
    </svg>
  );
}

export function EnemyShipIcon({ size = 32, color = "currentColor", style }: P) {
  return <WarshipIcon size={size} color={color} style={style} />;
}
