/**
 * Approximate footprint polygons [lng, lat][] for each base/asset.
 * Airfields are elongated rectangles along the runway axis.
 * Naval/civilian sites use irregular polygons.
 * AOR ring remains circular — only the size/footprint ring uses these shapes.
 */

// Helper: axis-aligned rotated rectangle for airfields
// headingDeg = direction the runway points (0=N, 90=E)
function airfieldRect(
  lat: number,
  lng: number,
  lengthKm: number,
  widthKm: number,
  headingDeg: number
): [number, number][] {
  const H = (headingDeg * Math.PI) / 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const kmToLat = 1 / 111.32;
  const kmToLng = 1 / (111.32 * cosLat);
  const hL = lengthKm / 2;
  const hW = widthKm / 2;
  const sH = Math.sin(H);
  const cH = Math.cos(H);
  // Along-runway unit vector in (E, N): (sin H, cos H)
  // Perp unit vector in (E, N):        (cos H, -sin H)
  const pt = (e: number, n: number): [number, number] => [
    lng + e * kmToLng,
    lat + n * kmToLat,
  ];
  return [
    pt(hL * sH + hW * cH,  hL * cH - hW * sH),
    pt(hL * sH - hW * cH,  hL * cH + hW * sH),
    pt(-hL * sH - hW * cH, -hL * cH + hW * sH),
    pt(-hL * sH + hW * cH, -hL * cH - hW * sH),
  ];
}

export const FOOTPRINT_POLYGONS: Record<string, [number, number][]> = {
  // ── Airbases ──────────────────────────────────────────────────────────────
  // MOB — Malmen (Linköping), runway ~15°, 3 km long
  MOB: airfieldRect(58.4065, 15.5267, 3.0, 1.5, 15),

  // FOB_N — Luleå/Kallax, runway 07/25 (~70°), 3 km long
  FOB_N: airfieldRect(65.5438, 22.1219, 3.0, 1.5, 70),

  // FOB_S — Ängelholm/F10, runway 12/30 (~120°), 2.5 km long
  FOB_S: airfieldRect(56.2670, 12.8514, 2.5, 1.2, 120),

  // ROB_N — Vidsel test range, runway ~10°, 2.5 km long
  ROB_N: airfieldRect(66.3228, 20.1492, 2.5, 1.0, 10),

  // ROB_S — Ronneby/F17, runway 05/23 (~50°), 2.5 km long
  ROB_S: airfieldRect(56.2667, 15.2650, 2.5, 1.2, 50),

  // ROB_E — Söderhamn/F15, runway ~5°, 2 km long
  ROB_E: airfieldRect(61.2610, 17.0990, 2.0, 1.0, 5),

  // ── Military fixed assets ─────────────────────────────────────────────────
  // LG — Livgardet, rectangular regiment compound, ~30° heading
  LG: airfieldRect(59.49, 17.75, 2.0, 1.0, 30),

  // Amf1 — Amfibieregementet (Berga naval station), elongated coastal base ~35°
  Amf1: airfieldRect(59.24, 18.24, 2.5, 0.8, 35),

  // Muskö — rock-carved naval base, irregular island polygon
  Musko: [
    [17.970, 59.015],
    [17.995, 59.003],
    [17.990, 58.985],
    [17.985, 58.963],
    [17.960, 58.960],
    [17.948, 58.972],
    [17.946, 58.995],
    [17.958, 59.008],
  ],

  // ── Civilian airports ─────────────────────────────────────────────────────
  // ARN — Arlanda, large airport with N-S and E-W runways
  ARN: [
    [17.968, 59.683],
    [17.968, 59.621],
    [17.900, 59.621],
    [17.879, 59.640],
    [17.879, 59.660],
    [17.900, 59.683],
  ],

  // BMA — Bromma, single runway 06/24 (~60°), compact airport
  BMA: airfieldRect(59.3543, 17.9415, 2.2, 0.8, 60),

  // ── Ammo depots — small rectangular footprints ───────────────────────────
  AMMO_ENKOPING: [
    [17.0814, 59.6373],
    [17.0814, 59.6328],
    [17.0726, 59.6328],
    [17.0726, 59.6373],
  ],

  AMMO_EKSJO: [
    [14.9782, 57.6663],
    [14.9782, 57.6618],
    [14.9698, 57.6618],
    [14.9698, 57.6663],
  ],

  // ── Baltic scenario bases ─────────────────────────────────────────────────
  // ARNA — Uppsala/Ärna (ESCM), runway 01/19 (~10°), 2.6 km
  ARNA: airfieldRect(59.5953, 17.5891, 2.6, 1.2, 10),

  // VISBY — Visby Airport (ESSV), runway 03/21 (~30°), 2.5 km
  VISBY: airfieldRect(57.6627, 18.3462, 2.5, 1.0, 30),
};
