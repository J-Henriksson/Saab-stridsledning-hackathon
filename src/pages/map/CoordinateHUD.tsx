import {
  formatLatLonDMS,
  formatLatLonDecimal,
  toMGRS,
} from "@/lib/coords";

type CoordinateHUDProps = {
  cursor: { lat: number; lng: number } | null;
};

// Build off-map placeholders by masking every digit/letter in a sample
// formatted value with an em-dash — separators stay in place so widths
// and punctuation exactly match the real output.
const DASH = "—";
const SAMPLE_LAT = 59.614867;
const SAMPLE_LNG = 17.405289;
const mask = (s: string) => s.replace(/[A-Za-z0-9]/g, DASH);

const DMS_PLACEHOLDER = mask(formatLatLonDMS(SAMPLE_LAT, SAMPLE_LNG));
const DEC_PLACEHOLDER = mask(formatLatLonDecimal(SAMPLE_LAT, SAMPLE_LNG));
const MGRS_PLACEHOLDER = mask(toMGRS(SAMPLE_LAT, SAMPLE_LNG) ?? "");

export function CoordinateHUD({ cursor }: CoordinateHUDProps) {
  const dms = cursor ? formatLatLonDMS(cursor.lat, cursor.lng) : DMS_PLACEHOLDER;
  const dec = cursor ? formatLatLonDecimal(cursor.lat, cursor.lng) : DEC_PLACEHOLDER;
  const mgrs = cursor
    ? toMGRS(cursor.lat, cursor.lng) ?? MGRS_PLACEHOLDER
    : MGRS_PLACEHOLDER;

  return (
    <div
      className="p-3 rounded-xl text-xs font-mono pointer-events-none"
      style={{
        background: "rgba(255,255,255,0.90)",
        border: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      }}
    >
      <div className="font-bold text-gray-500 mb-2 text-[9px] tracking-widest">
        COORDINATES
      </div>

      <div className="space-y-1.5">
        <Row label="CURSOR" value={dms} />
        <Row label="DEC" value={dec} dim />
        <Row label="MGRS" value={mgrs} accent />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  dim,
  accent,
}: {
  label: string;
  value: string;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] tracking-widest text-gray-500 font-bold">
        {label}
      </span>
      <span
        className={[
          "text-[10px] tabular-nums whitespace-nowrap",
          accent ? "text-emerald-700 font-semibold" : dim ? "text-gray-500" : "text-gray-700",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export default CoordinateHUD;
