import { formatHoursMinutes } from "@/utils/travelRange";
import type { Reachability, ThreatRing, BestReturnBase } from "@/utils/battleIntel";

const REACHABILITY_LABEL: Record<Reachability, string> = {
  strike_return: "STRIKE & RETUR",
  strike_only:   "STRIKE — INGEN RETUR",
  out_of_reach:  "UTANFÖR RÄCKVIDD",
};

const REACHABILITY_COLOR: Record<Reachability, string> = {
  strike_return: "#22c55e",
  strike_only:   "#f59e0b",
  out_of_reach:  "#94a3b8",
};

interface Props {
  x: number;
  y: number;
  targetName: string;
  targetCategory: string;
  reachability: Reachability;
  oneWayKm: number;
  roundTripKm?: number;
  cruiseSpeedKts: number;
  /** Hours to fly the one-way leg at cruise. */
  etaToTargetHours: number;
  /** Hours to fly target → base, if returnBase is set. */
  etaTargetToBaseHours?: number;
  /** Effective max range — used to compute fuel-remaining estimates. */
  maxRangeKm: number;
  pathThreats: ThreatRing[];
  bestReturn?: BestReturnBase | null;
  currentReturnBaseId?: string | null;
}

/**
 * Hover tooltip for an enemy target while travel-range mode is active.
 * Pure presentational — positioning and visibility are managed by the parent.
 */
export function BattleIntelTooltip({
  x,
  y,
  targetName,
  targetCategory,
  reachability,
  oneWayKm,
  roundTripKm,
  cruiseSpeedKts,
  etaToTargetHours,
  etaTargetToBaseHours,
  maxRangeKm,
  pathThreats,
  bestReturn,
  currentReturnBaseId,
}: Props) {
  const fuelAtTargetPct = maxRangeKm > 0
    ? Math.max(0, 100 - (oneWayKm / maxRangeKm) * 100)
    : 0;
  const fuelAtBasePct = maxRangeKm > 0 && roundTripKm != null
    ? Math.max(0, 100 - (roundTripKm / maxRangeKm) * 100)
    : null;

  const recommendBetter =
    bestReturn &&
    currentReturnBaseId &&
    bestReturn.baseId !== currentReturnBaseId &&
    bestReturn.savedKm > 5;

  return (
    <div
      style={{
        position: "absolute",
        left: x + 14,
        top: y - 10,
        pointerEvents: "none",
        zIndex: 60,
        minWidth: 240,
        maxWidth: 300,
        background: "rgba(8,12,20,0.94)",
        border: `1px solid ${REACHABILITY_COLOR[reachability]}`,
        borderRadius: 4,
        padding: "8px 10px",
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        color: "#e2e8f0",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          color: REACHABILITY_COLOR[reachability],
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginBottom: 4,
        }}
      >
        {REACHABILITY_LABEL[reachability]}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc", marginBottom: 2 }}>
        {targetName}
      </div>
      <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {targetCategory}
      </div>

      <Row label="Avstånd" value={`${oneWayKm.toFixed(0)} km`} />
      <Row label="Tid till mål" value={formatHoursMinutes(etaToTargetHours)} />
      <Row label="Bränsle vid mål" value={`${fuelAtTargetPct.toFixed(0)}%`} />
      <Row label="Cruise" value={`${cruiseSpeedKts.toFixed(0)} kt`} />

      {roundTripKm != null && (
        <>
          <Divider />
          <Row label="Tur & retur" value={`${roundTripKm.toFixed(0)} km`} />
          {etaTargetToBaseHours != null && (
            <Row
              label="Tid mål → bas"
              value={formatHoursMinutes(etaTargetToBaseHours)}
            />
          )}
          {fuelAtBasePct != null && (
            <Row
              label="Bränsle vid bas"
              value={`${fuelAtBasePct.toFixed(0)}%`}
              valueColor={fuelAtBasePct < 5 ? "#ef4444" : fuelAtBasePct < 15 ? "#f59e0b" : "#22c55e"}
            />
          )}
        </>
      )}

      {pathThreats.length > 0 && (
        <>
          <Divider />
          <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 2 }}>
            ⚠ Flygväg korsar {pathThreats.length} fientlig{pathThreats.length === 1 ? "" : "a"} ring{pathThreats.length === 1 ? "" : "ar"}
          </div>
          <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5" }}>
            {pathThreats.slice(0, 4).map((r) => (
              <li key={r.id}>
                {r.name} ({r.category === "radar" ? "radar" : "SAM"} {r.radiusKm}km)
              </li>
            ))}
            {pathThreats.length > 4 && (
              <li>+{pathThreats.length - 4} fler</li>
            )}
          </ul>
        </>
      )}

      {recommendBetter && (
        <>
          <Divider />
          <div style={{ color: "#22c55e" }}>
            Rekommenderad retur: <b>{bestReturn!.baseId}</b> (sparar {bestReturn!.savedKm.toFixed(0)} km)
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: valueColor ?? "#e2e8f0", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        marginTop: 5,
        marginBottom: 5,
        borderTop: "1px solid rgba(148,163,184,0.20)",
      }}
    />
  );
}
