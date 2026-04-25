import { useState, useEffect, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import { SWEDEN_LAND_RINGS } from "@/data/geoBoundaries";

export function SwedenOutline() {
  const { current: map } = useMap();
  const [, setTick] = useState(0);

  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!map) return;
    const m = map.getMap();
    m.on("move", rerender);
    return () => { m.off("move", rerender); };
  }, [map, rerender]);

  if (!map) return null;
  const m = map.getMap();

  const projectRing = (ring: [number, number][]) => {
    const points = ring.map(([lng, lat]) => {
      const p = m.project([lng, lat]);
      return `${p.x},${p.y}`;
    });
    return `M${points.join(" L")}Z`;
  };

  const pathData = SWEDEN_LAND_RINGS.map(projectRing).join(" ");

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <defs>
        <filter id="outline-glow">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {/* Glow */}
      <path
        d={pathData}
        fill="none"
        stroke="#22c55e"
        strokeWidth={10}
        strokeOpacity={0.15}
        filter="url(#outline-glow)"
      />
      {/* Fill */}
      <path
        d={pathData}
        fill="#0a1f14"
        fillOpacity={0.5}
        stroke="none"
        fillRule="evenodd"
      />
      {/* Border */}
      <path
        d={pathData}
        fill="none"
        stroke="#34d399"
        strokeWidth={2}
        strokeOpacity={0.7}
      />
    </svg>
  );
}
