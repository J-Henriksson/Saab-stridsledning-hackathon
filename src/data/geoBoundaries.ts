// Simplified Swedish geographic boundary coordinates [lng, lat] (GeoJSON order).
// Approximations for visualization — not geodetically authoritative.

// ── Swedish EEZ ───────────────────────────────────────────────────────────────
// Median lines in the Baltic Sea and Kattegat/Skagerrak, clockwise from west.
export const SWEDEN_EEZ_RING: [number, number][] = [
  [10.4, 58.9],
  [10.6, 57.8],
  [11.8, 56.5],
  [12.6, 55.4],
  [14.2, 55.0],
  [16.5, 55.2],
  [18.2, 55.5],
  [19.8, 56.1],
  [20.9, 57.0],
  [21.6, 57.9],
  [22.2, 58.8],
  [21.5, 59.6],
  [20.3, 60.2],
  [19.8, 60.5],
  [19.2, 60.3],
  [18.7, 60.0],
  [18.4, 59.5],
  [17.5, 58.8],
  [16.4, 57.6],
  [15.2, 56.3],
  [13.4, 55.9],
  [11.8, 56.8],
  [10.9, 58.0],
  [10.4, 58.9],
];

// ── Swedish FIR ESOS ──────────────────────────────────────────────────────────
// Stockholm FIR — covers Sweden and adjacent Baltic airspace (ICAO simplified).
export const SWEDEN_FIR_RING: [number, number][] = [
  [4.5,  57.0],
  [4.5,  58.5],
  [6.5,  62.0],
  [9.0,  64.5],
  [12.0, 66.5],
  [16.0, 69.5],
  [20.0, 69.5],
  [28.0, 68.0],
  [28.0, 60.0],
  [24.0, 57.5],
  [20.0, 55.0],
  [15.0, 54.5],
  [10.0, 54.5],
  [7.5,  55.5],
  [4.5,  57.0],
];

// ── Sweden–Norway land border ─────────────────────────────────────────────────
// From Strömstad (southwest coast) north to Treriksröset (tri-point).
export const SWEDEN_NORWAY_BORDER: [number, number][] = [
  [11.15, 58.88],
  [11.50, 59.50],
  [11.92, 59.91],
  [12.10, 60.60],
  [11.98, 61.03],
  [12.15, 62.03],
  [12.20, 63.00],
  [12.98, 64.10],
  [14.00, 65.10],
  [14.50, 66.00],
  [15.50, 67.00],
  [16.50, 68.00],
  [18.00, 68.30],
  [20.06, 68.42],  // Treriksröset
];

// ── Sweden–Finland land border ────────────────────────────────────────────────
// From Haparanda/Torneå (Gulf of Bothnia) north to Treriksröset.
export const SWEDEN_FINLAND_BORDER: [number, number][] = [
  [23.98, 65.78],  // Haparanda
  [23.60, 66.10],
  [23.00, 66.60],
  [22.50, 67.10],
  [22.00, 67.60],
  [21.20, 68.10],
  [20.50, 68.30],
  [20.06, 68.42],  // Treriksröset
];
