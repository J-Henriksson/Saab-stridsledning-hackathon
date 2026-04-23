import { useMemo } from "react";
import { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { LineLayout, LinePaint } from "maplibre-gl";
import { Base } from "@/types/game";
import { SUPPLY_LINES, BASE_COORDS } from "./constants";

export function SupplyLinesLayer({ bases }: { bases: Base[] }) {
  const { geojson, stressedMidpoints } = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    const midpoints: { lng: number; lat: number }[] = [];

    for (const [aId, bId] of SUPPLY_LINES) {
      const coordsA = BASE_COORDS[aId];
      const coordsB = BASE_COORDS[bId];
      if (!coordsA || !coordsB) continue;

      const aBase = bases.find((b) => b.id === aId);
      const bBase = bases.find((b) => b.id === bId);
      const active = !!(aBase && bBase);
      const totalAc = (aBase?.aircraft.length ?? 0) + (bBase?.aircraft.length ?? 0);
      const avgFuel = ((aBase?.fuel ?? 100) + (bBase?.fuel ?? 100)) / 2;
      const flowIntensity = active ? Math.max(1.5, Math.min(4, totalAc / 10 + (100 - avgFuel) / 40)) : 1;
      const stressed = active && avgFuel < 30;

      features.push({
        type: "Feature",
        properties: { active, stressed, flowIntensity },
        geometry: {
          type: "LineString",
          coordinates: [
            [coordsA.lng, coordsA.lat],
            [coordsB.lng, coordsB.lat],
          ],
        },
      });

      if (stressed) {
        midpoints.push({
          lng: (coordsA.lng + coordsB.lng) / 2,
          lat: (coordsA.lat + coordsB.lat) / 2,
        });
      }
    }

    return {
      geojson: { type: "FeatureCollection" as const, features },
      stressedMidpoints: midpoints,
    };
  }, [bases]);

  // Wide soft glow behind the line
  const glowLayout: LineLayout = { "line-cap": "round", "line-join": "round" };
  const glowPaint: LinePaint = {
    "line-color": ["case",
      ["get", "stressed"], "#ef4444",
      ["get", "active"], "#2563eb",
      "#1e293b",
    ],
    "line-width": ["case",
      ["get", "active"], ["+", ["get", "flowIntensity"], 6],
      3,
    ],
    "line-blur": 6,
    "line-opacity": ["case", ["get", "active"], 0.2, 0.05],
  };

  // Solid base line — always visible
  const solidLayout: LineLayout = { "line-cap": "round", "line-join": "round" };
  const solidPaint: LinePaint = {
    "line-color": ["case",
      ["get", "stressed"], "#ef4444",
      ["get", "active"], "#2563eb",
      "#1e293b",
    ],
    "line-width": ["case",
      ["get", "active"], ["get", "flowIntensity"],
      0.8,
    ],
    "line-opacity": ["case", ["get", "active"], 0.45, 0.2],
  };

  // Thin dashed overlay for texture
  const dashLayout: LineLayout = { "line-cap": "round", "line-join": "round" };
  const dashPaint: LinePaint = {
    "line-color": ["case",
      ["get", "stressed"], "#fca5a5",
      ["get", "active"], "#60a5fa",
      "#334155",
    ],
    "line-width": ["case",
      ["get", "active"], ["-", ["get", "flowIntensity"], 0.5],
      0.5,
    ],
    "line-dasharray": [6, 8],
    "line-opacity": ["case", ["get", "active"], 0.35, 0.1],
  };

  return (
    <>
      <Source id="supply-lines" type="geojson" data={geojson}>
        <Layer id="supply-lines-glow" type="line" layout={glowLayout} paint={glowPaint} />
        <Layer id="supply-lines-solid" type="line" layout={solidLayout} paint={solidPaint} />
        <Layer id="supply-lines-dash" type="line" layout={dashLayout} paint={dashPaint} />
      </Source>

      {/* Stressed midpoint pulse */}
      {stressedMidpoints.map((pt, i) => (
        <Marker key={`stress-${i}`} longitude={pt.lng} latitude={pt.lat} anchor="center">
          <div
            className="rounded-full animate-ping"
            style={{
              width: 10,
              height: 10,
              backgroundColor: "#ef4444",
              animationDuration: "1.5s",
            }}
          />
        </Marker>
      ))}
    </>
  );
}
