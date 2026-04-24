// Geodetic helpers for tactical coordinate display.
// WGS84 ellipsoid, UTM projection (k0 = 0.9996), MGRS 100km grid squares.
// No external dependencies — inline implementation.

const WGS84_A = 6378137; // semi-major axis (m)
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);
const WGS84_EP2 = WGS84_E2 / (1 - WGS84_E2);
const K0 = 0.9996;

const LAT_BANDS = "CDEFGHJKLMNPQRSTUVWX"; // 20 bands × 8° (X is 12°)
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type UTMCoord = {
  zone: number;
  band: string;
  easting: number;
  northing: number;
  hemisphere: "N" | "S";
};

function latBand(lat: number): string | null {
  if (lat < -80 || lat > 84) return null;
  let idx = Math.floor((lat + 80) / 8);
  if (idx >= 20) idx = 19; // X band extends to 84°
  return LAT_BANDS[idx];
}

function utmZoneFor(lat: number, lng: number): number {
  let zone = Math.floor((lng + 180) / 6) + 1;
  // Norway exception: 32V
  if (lat >= 56 && lat < 64 && lng >= 3 && lng < 12) return 32;
  // Svalbard exceptions
  if (lat >= 72 && lat < 84) {
    if (lng >= 0 && lng < 9) return 31;
    if (lng >= 9 && lng < 21) return 33;
    if (lng >= 21 && lng < 33) return 35;
    if (lng >= 33 && lng < 42) return 37;
  }
  return zone;
}

export function toUTM(lat: number, lng: number): UTMCoord | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const band = latBand(lat);
  if (!band) return null;

  const zone = utmZoneFor(lat, lng);
  const lambda0Deg = (zone - 1) * 6 - 180 + 3;
  const lambda0 = (lambda0Deg * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = WGS84_EP2 * cosPhi * cosPhi;
  const A = cosPhi * (lambda - lambda0);

  const e2 = WGS84_E2;
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const M =
    WGS84_A *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));

  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A3 * A;
  const A5 = A4 * A;
  const A6 = A5 * A;

  const easting =
    K0 *
      N *
      (A +
        ((1 - T + C) * A3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * WGS84_EP2) * A5) / 120) +
    500000;

  let northing =
    K0 *
    (M +
      N *
        tanPhi *
        (A2 / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * WGS84_EP2) * A6) / 720));

  const hemisphere: "N" | "S" = lat >= 0 ? "N" : "S";
  if (hemisphere === "S") northing += 10000000;

  return { zone, band, easting, northing, hemisphere };
}

const COL_LETTERS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const ROW_ODD = "ABCDEFGHJKLMNPQRSTUV";
const ROW_EVEN = "FGHJKLMNPQRSTUVABCDE";

export function toMGRS(lat: number, lng: number): string | null {
  const utm = toUTM(lat, lng);
  if (!utm) return null;

  const { zone, band, easting, northing } = utm;

  const colSet = COL_LETTERS[(zone - 1) % 3];
  const colIdx = Math.floor(easting / 100000) - 1;
  if (colIdx < 0 || colIdx >= colSet.length) return null;
  const colLetter = colSet[colIdx];

  const rowSeq = zone % 2 === 1 ? ROW_ODD : ROW_EVEN;
  const rowIdx = Math.floor(northing / 100000) % 20;
  const rowLetter = rowSeq[rowIdx];

  const e = Math.floor(easting % 100000)
    .toString()
    .padStart(5, "0");
  const n = Math.floor(northing % 100000)
    .toString()
    .padStart(5, "0");

  return `${zone}${band} ${colLetter}${rowLetter} ${e} ${n}`;
}

function dms(value: number): { d: number; m: number; s: number } {
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  // Handle 60-second rollover
  if (s === 60) return { d, m: m + 1, s: 0 };
  return { d, m, s };
}

export function formatLatLonDMS(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";
  const latHem = lat >= 0 ? "N" : "S";
  const lngHem = lng >= 0 ? "E" : "W";
  const la = dms(lat);
  const lo = dms(lng);
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");
  return `${latHem}${pad2(la.d)}°${pad2(la.m)}'${pad2(la.s)}" ${lngHem}${pad3(lo.d)}°${pad2(lo.m)}'${pad2(lo.s)}"`;
}

export function formatLatLonDecimal(lat: number, lng: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "—";
  const latHem = lat >= 0 ? "N" : "S";
  const lngHem = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}°${latHem} ${Math.abs(lng).toFixed(5)}°${lngHem}`;
}

export function formatDTG(
  day: number,
  hour: number,
  minute: number,
  now: Date = new Date()
): string {
  const d = Math.max(1, Math.min(31, Math.floor(day)));
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const mon = MONTHS[now.getMonth()];
  const yy = (now.getFullYear() % 100).toString().padStart(2, "0");
  return `${pad2(d)}${pad2(h)}${pad2(m)}Z ${mon} ${yy}`;
}
