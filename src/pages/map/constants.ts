// Real Swedish airfield coordinates
export const BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  MOB:   { lat: 58.4065, lng: 15.5267 },  // Malmen (Linköping)
  FOB_N: { lat: 65.5438, lng: 22.1219 },  // Luleå/Kallax
  FOB_S: { lat: 56.2670, lng: 12.8514 },  // Ängelholm/F10
  ROB_N: { lat: 66.3228, lng: 20.1492 },  // Vidsel
  ROB_S: { lat: 56.2667, lng: 15.2650 },  // Ronneby/F17
  ROB_E: { lat: 61.2610, lng: 17.0990 },  // Söderhamn/F15
};

export const SUPPLY_LINES: [string, string][] = [
  ["MOB", "FOB_N"],
  ["MOB", "FOB_S"],
  ["MOB", "ROB_E"],
  ["FOB_N", "ROB_N"],
  ["FOB_S", "ROB_S"],
];

export const SWEDEN_CENTER = { lat: 62, lng: 16 };
export const INITIAL_ZOOM = 4.0;
export const STOCKHOLM_CENTER = { lat: 59.33, lng: 18.07 };
export const TACTICAL_ZOOM = 7.5;

export const BASE_RINGS: Record<string, { sizeRadiusKm: number; defaultAorRadiusKm: number }> = {
  MOB:   { sizeRadiusKm: 3.0, defaultAorRadiusKm: 80  },  // Malmen — main ops base
  FOB_N: { sizeRadiusKm: 2.0, defaultAorRadiusKm: 120 },  // Luleå/Kallax
  FOB_S: { sizeRadiusKm: 1.5, defaultAorRadiusKm: 80  },  // Ängelholm/F10
  ROB_N: { sizeRadiusKm: 1.2, defaultAorRadiusKm: 100 },  // Vidsel
  ROB_S: { sizeRadiusKm: 1.5, defaultAorRadiusKm: 80  },  // Ronneby/F17
  ROB_E: { sizeRadiusKm: 1.2, defaultAorRadiusKm: 70  },  // Söderhamn/F15
};

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export const GIS_COLORS = {
  militaryBase:  "#2D5A27",  // Forest Green — airbases + army/marine/naval
  criticalInfra: "#708090",  // Slate Gray — civil airports + ammo depots
  skyddsobjekt:  "#F4D03F",  // Safety Yellow — protected objects
} as const;

export const BASE_ICAO: Record<string, string> = {
  MOB:   "ESMQ",  // Malmen
  FOB_N: "ESPA",  // Luleå/Kallax
  FOB_S: "ESTA",  // Ängelholm
  ROB_N: "ESPE",  // Vidsel
  ROB_S: "ESDF",  // Ronneby/Kallinge
  ROB_E: "ESSD",  // Söderhamn
};

export const BASE_RUNWAY_STATUS: Record<string, "operational" | "limited" | "closed"> = {
  MOB:   "operational",
  FOB_N: "operational",
  FOB_S: "operational",
  ROB_N: "limited",
  ROB_S: "operational",
  ROB_E: "limited",
};

export const BASE_ACTIVE_UNITS: Record<string, string[]> = {
  MOB:   ["F 3 Östgöta flygflottilj", "TUAV-skvadron"],
  FOB_N: ["F 21 Norrbottens flygflottilj", "Stril N"],
  FOB_S: ["F 10 Skånska flygflottilj"],
  ROB_N: ["FMV Provflygavdelning"],
  ROB_S: ["F 17 Blekinge flygflottilj"],
  ROB_E: ["Hälsinge flygflottilj (reserv)"],
};
