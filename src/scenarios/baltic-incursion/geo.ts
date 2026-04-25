// Coordinates and movement constants for the Baltic-incursion demo.
// All positions are in decimal degrees. Distances in km.

import type { GeoPosition } from "@/types/units";

export const KALININGRAD: GeoPosition = { lat: 54.71, lng: 20.51 };
// Neringa (Curonian Spit) — landmark for placing the bogey-spawn line.
export const NERINGA: GeoPosition = { lat: 55.40, lng: 21.10 };

// Gotland-East PS-860 fixed radar — anchor for "edge of coverage" math.
// This is the radar closest to Neringa; bogeys spawn at the SE edge of its
// 450 km disc, on the bearing toward Neringa, so first-detection occurs at
// the radar border itself.
export const GOTLAND_EAST: GeoPosition = { lat: 57.51, lng: 18.72 };

// ROB_S / F17 Ronneby — friendly fighter origin point.
export const RONNEBY: GeoPosition = { lat: 56.27, lng: 15.27 };
export const KARLSKRONA: GeoPosition = { lat: 56.16, lng: 15.59 };

// Camera focus for the scenario. The SITREP strip lives at the bottom edge,
// so we frame slightly higher than centre to keep boats + radar context
// (Gotland East to the north) both inside the unobstructed map area.
export const SCENARIO_CAMERA: { lat: number; lng: number; zoom: number } = {
  lat: 56.4,
  lng: 19.8,
  zoom: 6.0,
};

// Three vessels enter coverage on a NW heading, ~10 km apart in a loose echelon.
export const SHIP_SPAWNS: { id: string; pos: GeoPosition; heading: number }[] = [
  { id: "scn-baltic-ship-01", pos: { lat: 55.05, lng: 20.10 }, heading: 320 },
  { id: "scn-baltic-ship-02", pos: { lat: 55.18, lng: 20.32 }, heading: 320 },
  { id: "scn-baltic-ship-03", pos: { lat: 54.92, lng: 20.45 }, heading: 320 },
];

// Two hostile aircraft pop into detection just off Klaipėda — the eastern
// border of MOB-radarns täckning — separated by ~8 km along the same arc,
// so the MOB-radar "first-detects" them as they cross into coverage. They
// then track WSW toward Karlskrona via the controller's dynamic bearing.
export const BOGEY_SPAWNS: { id: string; pos: GeoPosition; heading: number }[] = [
  { id: "scn-bogey-01", pos: { lat: 55.74, lng: 21.10 }, heading: 278 },
  { id: "scn-bogey-02", pos: { lat: 55.68, lng: 21.18 }, heading: 278 },
];

// Pre-existing friendly CAP fighters near Ronneby (these are seeded into the
// initial game state in initialGameState.ts so they're on the map before the
// scenario arms — the scenario only changes their orders).
export const FRIENDLY_INTERCEPT_SPAWNS: { id: string; pos: GeoPosition }[] = [
  { id: "scn-jas-rb-01", pos: { lat: 55.95, lng: 15.65 } },
  { id: "scn-jas-rb-02", pos: { lat: 55.85, lng: 15.95 } },
];

// Speeds (knots) used by the controller's per-tick mover.
export const SHIP_SPEED_KTS = 18;
export const BOGEY_TRANSIT_KTS = 460;
export const BOGEY_RETREAT_KTS = 520;
export const FIGHTER_TRANSIT_KTS = 540;

// Distance under which the scenario considers "intercept reached" (km).
export const INTERCEPT_KM = 55;

// Hidden time multiplier ramp.
export const TRANSIT_CLOCK_MULT = 6;
