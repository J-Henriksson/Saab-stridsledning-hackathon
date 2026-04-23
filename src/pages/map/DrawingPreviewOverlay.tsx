import { useState, useEffect, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import type { DrawingState } from "./ZoneDrawingTool";

const ZONE_COLORS: Record<string, string> = {
  circle_restricted:   "#D9192E",
  circle_surveillance: "#D7AB3A",
  circle_logistics:    "#2563eb",
  polygon_roadstrip:   "#22d3ee",
};

export function DrawingPreviewOverlay({ drawState }: { drawState: DrawingState }) {
  const { current: mapRef } = useMap();
  const [, setTick] = useState(0);

  const rerender = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!mapRef) return;
    const m = mapRef.getMap();
    m.on("move", rerender);
    return () => { m.off("move", rerender); };
  }, [mapRef, rerender]);

  if (!mapRef || drawState.mode === "none") return null;
  const m = mapRef.getMap();
  const color = ZONE_COLORS[drawState.mode] ?? "#ffffff";

  // Circle preview
  if (
    drawState.mode !== "polygon_roadstrip" &&
    drawState.step === "center_placed" &&
    drawState.center &&
    drawState.currentMousePos
  ) {
    const cp = m.project([drawState.center.lng, drawState.center.lat]);
    const rp = m.project([drawState.currentMousePos.lng, drawState.currentMousePos.lat]);
    const r = Math.sqrt((rp.x - cp.x) ** 2 + (rp.y - cp.y) ** 2);

    const radiusKm = turf
      .distance(
        turf.point([drawState.center.lng, drawState.center.lat]),
        turf.point([drawState.currentMousePos.lng, drawState.currentMousePos.lat]),
        { units: "kilometers" }
      )
      .toFixed(1);

    return (
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <circle cx={cp.x} cy={cp.y} r={5} fill={color} opacity={0.9} />
        <circle
          cx={cp.x}
          cy={cp.y}
          r={r}
          fill={color}
          fillOpacity={0.08}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <text
          x={cp.x + r * 0.6 + 4}
          y={cp.y - 6}
          fill={color}
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {radiusKm} km
        </text>
      </svg>
    );
  }

  // Polygon preview
  if (
    drawState.mode === "polygon_roadstrip" &&
    (drawState.polygonPoints.length > 0 || drawState.currentMousePos)
  ) {
    const allPoints: [number, number][] = [
      ...drawState.polygonPoints,
      drawState.currentMousePos
        ? [drawState.currentMousePos.lng, drawState.currentMousePos.lat]
        : drawState.polygonPoints[drawState.polygonPoints.length - 1] ?? [0, 0],
    ];

    const projected = allPoints.map(([lng, lat]) => m.project([lng, lat]));
    const d = projected.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

    return (
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          d={d}
          fill={color}
          fillOpacity={0.12}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        {drawState.polygonPoints.map(([lng, lat], i) => {
          const p = m.project([lng, lat]);
          return <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} opacity={0.9} />;
        })}
        {drawState.polygonPoints.length > 0 && (
          <text
            x={projected[0].x + 8}
            y={projected[0].y - 6}
            fill={color}
            fontSize={10}
            fontFamily="monospace"
          >
            {drawState.polygonPoints.length} pkt — dubbelklicka för att avsluta
          </text>
        )}
      </svg>
    );
  }

  return null;
}
