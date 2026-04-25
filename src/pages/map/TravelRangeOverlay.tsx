import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { GeoPosition } from "@/types/units";
import type { BaseType } from "@/types/game";
import { createCircleGeoJSON } from "@/utils/geoDistance";
import { createEllipseGeoJSON } from "@/utils/travelRange";

interface Props {
  unitPosition: GeoPosition;
  /** Effective max one-way range in km. */
  maxRangeKm: number;
  /** Selected return base, if any. */
  returnBase?: { id: BaseType; name: string; coords: GeoPosition } | null;
}

/**
 * Renders the geometric travel-range visualization:
 *   • red dashed circle = max one-way range
 *   • green-shaded ellipse = round-trip-feasible region given a return base
 *   • highlight ring + label = chosen return base
 */
export function TravelRangeOverlay({ unitPosition, maxRangeKm, returnBase }: Props) {
  const circleData = useMemo(() => {
    if (maxRangeKm <= 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: [createCircleGeoJSON(unitPosition, maxRangeKm * 1000, 96)],
    };
  }, [unitPosition.lat, unitPosition.lng, maxRangeKm]);

  const ellipseData = useMemo(() => {
    if (!returnBase || maxRangeKm <= 0) return null;
    const feat = createEllipseGeoJSON(unitPosition, returnBase.coords, maxRangeKm, 128);
    return { type: "FeatureCollection" as const, features: [feat] };
  }, [unitPosition.lat, unitPosition.lng, returnBase, maxRangeKm]);

  if (!circleData) return null;

  return (
    <>
      {/* Round-trip ellipse (drawn first so it sits behind the one-way circle) */}
      {ellipseData && (
        <Source id="travel-range-ellipse" type="geojson" data={ellipseData}>
          <Layer
            id="travel-range-ellipse-fill"
            type="fill"
            paint={{ "fill-color": "#22c55e", "fill-opacity": 0.10 }}
            filter={["==", ["get", "reachable"], true]}
          />
          <Layer
            id="travel-range-ellipse-line"
            type="line"
            paint={{
              "line-color": "#22c55e",
              "line-width": 1.5,
              "line-opacity": 0.85,
            }}
            filter={["==", ["get", "reachable"], true]}
          />
        </Source>
      )}

      {/* Max one-way circle */}
      <Source id="travel-range-max" type="geojson" data={circleData}>
        <Layer
          id="travel-range-max-fill"
          type="fill"
          paint={{ "fill-color": "#ef4444", "fill-opacity": 0.05 }}
        />
        <Layer
          id="travel-range-max-line"
          type="line"
          paint={{
            "line-color": "#ef4444",
            "line-width": 1.5,
            "line-dasharray": [3, 3],
            "line-opacity": 0.85,
          }}
        />
      </Source>

      {/* Return-base highlight */}
      {returnBase && (
        <Marker
          longitude={returnBase.coords.lng}
          latitude={returnBase.coords.lat}
          anchor="center"
        >
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
                left: -22,
                top: -22,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "2px solid #22c55e",
                boxShadow: "0 0 12px rgba(34,197,94,0.65)",
                background: "rgba(34,197,94,0.10)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 28,
                top: -10,
                whiteSpace: "nowrap",
                background: "rgba(8,12,20,0.85)",
                border: "1px solid rgba(34,197,94,0.55)",
                color: "#22c55e",
                padding: "2px 6px",
                fontFamily: "monospace",
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              ↩ {returnBase.id}
            </div>
          </div>
        </Marker>
      )}
    </>
  );
}
