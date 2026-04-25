import { useMemo } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import type { GeoPosition } from "@/types/units";
import type { Reachability, ThreatRing } from "@/utils/battleIntel";

export interface TargetIntel {
  id: string;
  name: string;
  position: GeoPosition;
  reachability: Reachability;
  pathThreatened: boolean;
}

interface Props {
  intelByTarget: TargetIntel[];
  unitPosition: GeoPosition;
  /** Pinned target id, if any. */
  pinnedTargetId: string | null;
  /** Coords of the chosen return base, for the strike-route line. */
  returnBaseCoords?: GeoPosition | null;
  /** All hostile threat rings — used to render the SAM-exposed legs in red. */
  threatRings: ThreatRing[];
}

const REACHABILITY_COLOR: Record<Reachability, string> = {
  strike_return: "#22c55e",
  strike_only:   "#f59e0b",
  out_of_reach:  "#6b7280",
};

/**
 * Renders the AI-augmented battle-intel layer:
 *   • per-target halo rings (color = reachability, red chevron when path is threatened)
 *   • the strike-route line for the pinned target (unit → target → returnBase)
 *
 * The hover tooltip is rendered separately by BattleIntelTooltip.
 */
export function BattleIntelOverlay({
  intelByTarget,
  unitPosition,
  pinnedTargetId,
  returnBaseCoords,
  threatRings,
}: Props) {
  const pinned = pinnedTargetId
    ? intelByTarget.find((t) => t.id === pinnedTargetId) ?? null
    : null;

  const strikeRouteData = useMemo(() => {
    if (!pinned) return null;
    const coords: [number, number][] = [
      [unitPosition.lng, unitPosition.lat],
      [pinned.position.lng, pinned.position.lat],
    ];
    if (returnBaseCoords) coords.push([returnBaseCoords.lng, returnBaseCoords.lat]);
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { threatened: pinned.pathThreatened },
          geometry: { type: "LineString" as const, coordinates: coords },
        },
      ],
    };
  }, [pinned, unitPosition.lat, unitPosition.lng, returnBaseCoords?.lat, returnBaseCoords?.lng]);

  // Threatened-leg overlay: a separate red dashed layer rendered ON TOP of the white route,
  // showing where the route enters SAM coverage.
  const threatenedLegsData = useMemo(() => {
    if (!pinned || !pinned.pathThreatened) return null;
    // Approximate "exposed" leg as the segment unit→target (and target→base if return set);
    // we don't currently slice the line by ring boundary — instead we color the whole leg red
    // when it's threatened. This reads clearly without overstating precision.
    const features: GeoJSON.Feature[] = [];
    const legA: [number, number][] = [
      [unitPosition.lng, unitPosition.lat],
      [pinned.position.lng, pinned.position.lat],
    ];
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: legA },
    });
    if (returnBaseCoords) {
      const legB: [number, number][] = [
        [pinned.position.lng, pinned.position.lat],
        [returnBaseCoords.lng, returnBaseCoords.lat],
      ];
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: legB },
      });
    }
    return { type: "FeatureCollection" as const, features };
  }, [pinned, unitPosition.lat, unitPosition.lng, returnBaseCoords?.lat, returnBaseCoords?.lng]);

  return (
    <>
      {/* Strike route — base layer (white outline + colored line) */}
      {strikeRouteData && (
        <Source id="battle-intel-route" type="geojson" data={strikeRouteData}>
          <Layer
            id="battle-intel-route-casing"
            type="line"
            paint={{
              "line-color": "#0b1220",
              "line-width": 5,
              "line-opacity": 0.6,
            }}
          />
          <Layer
            id="battle-intel-route-line"
            type="line"
            paint={{
              "line-color": [
                "case",
                ["get", "threatened"], "#ef4444",
                "#facc15",
              ],
              "line-width": 2.25,
              "line-dasharray": [2, 2],
              "line-opacity": 0.95,
            }}
          />
        </Source>
      )}

      {/* Threatened-leg highlight (red overlay only when path crosses SAM) */}
      {threatenedLegsData && (
        <Source id="battle-intel-threatened" type="geojson" data={threatenedLegsData}>
          <Layer
            id="battle-intel-threatened-line"
            type="line"
            paint={{
              "line-color": "#ef4444",
              "line-width": 3.5,
              "line-opacity": 0.55,
            }}
          />
        </Source>
      )}

      {/* Per-target halos rendered as DOM markers (so they overlay the SVG markers) */}
      {intelByTarget.map((t) => (
        <Marker
          key={t.id}
          longitude={t.position.lng}
          latitude={t.position.lat}
          anchor="center"
        >
          <Halo intel={t} pinned={t.id === pinnedTargetId} />
        </Marker>
      ))}

      {/* Suppress unused threatRings warning — reserved for future per-ring accent rendering */}
      {threatRings.length === 0 ? null : null}
    </>
  );
}

function Halo({ intel, pinned }: { intel: TargetIntel; pinned: boolean }) {
  const color = REACHABILITY_COLOR[intel.reachability];
  const dim = intel.reachability === "out_of_reach";
  const size = dim ? 30 : 36;

  return (
    <div
      style={{
        pointerEvents: "none",
        position: "relative",
        width: 0,
        height: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${dim ? 1 : 1.5}px ${dim ? "dashed" : "solid"} ${color}`,
          boxShadow: pinned ? `0 0 14px ${color}` : undefined,
          opacity: dim ? 0.55 : 0.9,
          background: dim ? "rgba(15,23,42,0.35)" : `${color}1a`,
        }}
      />
      {intel.pathThreatened && intel.reachability !== "out_of_reach" && (
        <div
          style={{
            position: "absolute",
            left: size / 2 - 4,
            top: -size / 2 - 6,
            color: "#ef4444",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: 700,
            textShadow: "0 0 4px rgba(0,0,0,0.85)",
            pointerEvents: "none",
          }}
          title="Flygväg korsar fientligt luftvärn"
        >
          ⚠
        </div>
      )}
    </div>
  );
}
