import {
  formatDTG,
  formatLatLonDMS,
  formatLatLonDecimal,
  toMGRS,
} from "@/lib/coords";

type CoordinateHUDProps = {
  cursor: { lat: number; lng: number } | null;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

// Build off-map placeholders by masking every digit/letter in a sample
// formatted value with an em-dash — separators (°, ', ", ., spaces) stay
// in place, so widths and punctuation exactly match the real output.
const DASH = "—";
const SAMPLE_LAT = 59.614867;
const SAMPLE_LNG = 17.405289;
const mask = (s: string) => s.replace(/[A-Za-z0-9]/g, DASH);

const DMS_PLACEHOLDER = mask(formatLatLonDMS(SAMPLE_LAT, SAMPLE_LNG));
const DEC_PLACEHOLDER = mask(formatLatLonDecimal(SAMPLE_LAT, SAMPLE_LNG));
const MGRS_PLACEHOLDER = mask(toMGRS(SAMPLE_LAT, SAMPLE_LNG) ?? "");

const MONO_STACK =
  '"JetBrains Mono", "Fira Code", "SF Mono", ui-monospace, Menlo, Consolas, monospace';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "hsl(42 30% 62%)",
  fontWeight: 600,
};

const VALUE_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "hsl(210 30% 92%)",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  textDecoration: "none",
};

export function CoordinateHUD({
  cursor,
  day,
  hour,
  minute,
  second,
}: CoordinateHUDProps) {
  const pad2 = (n: number) => Math.max(0, Math.floor(n)).toString().padStart(2, "0");

  const dtg = formatDTG(day, hour, minute);
  const simClock = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}Z`;

  const dms = cursor ? formatLatLonDMS(cursor.lat, cursor.lng) : DMS_PLACEHOLDER;
  const dec = cursor ? formatLatLonDecimal(cursor.lat, cursor.lng) : DEC_PLACEHOLDER;
  const mgrs = cursor
    ? toMGRS(cursor.lat, cursor.lng) ?? MGRS_PLACEHOLDER
    : MGRS_PLACEHOLDER;

  return (
    <div
      className="absolute top-3 right-3 z-20 pointer-events-none"
      style={{
        fontFamily: MONO_STACK,
        background: "rgba(11, 22, 40, 0.82)",
        border: "1px solid hsl(42 64% 53% / 0.45)",
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 270,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.45), inset 0 0 0 1px hsl(42 64% 53% / 0.08)",
      }}
    >
      {/* DTG — bold amber */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "hsl(42 88% 62%)",
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 8px hsl(42 88% 50% / 0.25)",
        }}
      >
        {dtg}
      </div>

      {/* SIM CLOCK — dimmed */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "hsl(210 18% 58%)",
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        SIM {simClock}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "8px -14px",
          background:
            "linear-gradient(to right, transparent, hsl(42 40% 50% / 0.35), transparent)",
        }}
      />

      {/* CURSOR */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={LABEL_STYLE}>CURSOR</span>
        <span style={VALUE_STYLE}>{dms}</span>
      </div>

      {/* DEC — dimmed */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 3,
        }}
      >
        <span style={LABEL_STYLE}>DEC</span>
        <span
          style={{
            ...VALUE_STYLE,
            fontSize: 10,
            color: "hsl(210 20% 58%)",
          }}
        >
          {dec}
        </span>
      </div>

      {/* MGRS — accent green */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 3,
        }}
      >
        <span style={LABEL_STYLE}>MGRS</span>
        <span
          style={{
            ...VALUE_STYLE,
            color: "hsl(152 65% 70%)",
            fontWeight: 600,
            textShadow: "0 0 6px hsl(152 70% 45% / 0.25)",
          }}
        >
          {mgrs}
        </span>
      </div>
    </div>
  );
}

export default CoordinateHUD;
