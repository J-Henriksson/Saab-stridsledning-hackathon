import { useMemo, useState, useEffect, useCallback } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import {
  SWEDEN_EEZ_RING,
  SWEDEN_FIR_RING,
  SWEDEN_NORWAY_BORDER,
  SWEDEN_FINLAND_BORDER,
} from "@/data/geoBoundaries";

export interface BoundaryVisibility {
  eez: boolean;
  fir: boolean;
  land: boolean;
}

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  eez:     { line: "#38bdf8", fill: "#0ea5e9" },  // sky-blue  (water)
  fir:     { line: "#a78bfa", fill: "#7c3aed" },  // violet    (airspace)
  norway:  { line: "#fb923c", fill: "none"    },  // orange    (land border)
  finland: { line: "#34d399", fill: "none"    },  // emerald   (land border)
};

// ── GeoJSON features ─────────────────────────────────────────────────────────
// Polygon fills for closed rings (EEZ, FIR)
const FILL_FEATURES: GeoJSON.Feature[] = [
  {
    type: "Feature",
    properties: { kind: "eez" },
    geometry: { type: "Polygon", coordinates: [SWEDEN_EEZ_RING] },
  },
  {
    type: "Feature",
    properties: { kind: "fir" },
    geometry: { type: "Polygon", coordinates: [SWEDEN_FIR_RING] },
  },
];

// Line features for all boundaries
const LINE_FEATURES: GeoJSON.Feature<GeoJSON.LineString>[] = [
  { type: "Feature", properties: { kind: "eez"     }, geometry: { type: "LineString", coordinates: SWEDEN_EEZ_RING        } },
  { type: "Feature", properties: { kind: "fir"     }, geometry: { type: "LineString", coordinates: SWEDEN_FIR_RING        } },
  { type: "Feature", properties: { kind: "norway"  }, geometry: { type: "LineString", coordinates: SWEDEN_NORWAY_BORDER  } },
  { type: "Feature", properties: { kind: "finland" }, geometry: { type: "LineString", coordinates: SWEDEN_FINLAND_BORDER } },
];

const ALL_FEATURES: GeoJSON.Feature[] = [...FILL_FEATURES, ...LINE_FEATURES];

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const HIT_LAYER_IDS = ["geo-eez-hit", "geo-fir-hit", "geo-norway-hit", "geo-finland-hit"];

const KIND_LABEL: Record<string, { label: string; sub: string }> = {
  eez:     { label: "Sjögräns (EEZ)",       sub: "Vattenterritorium" },
  fir:     { label: "Luftrumsgräns (FIR)",  sub: "Stockholm FIR ESOS" },
  norway:  { label: "Landgräns Sverige–NO", sub: "Nationsgräns" },
  finland: { label: "Landgräns Sverige–FI", sub: "Nationsgräns" },
};

interface HoverInfo { x: number; y: number; kind: string }

export function GeoBoundariesLayer({ vis }: { vis: BoundaryVisibility }) {
  const { current: mapRef } = useMap();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const features = ALL_FEATURES.filter(f => {
      const k = f.properties!.kind as string;
      if (k === "eez")                       return vis.eez;
      if (k === "fir")                       return vis.fir;
      if (k === "norway" || k === "finland") return vis.land;
      return false;
    });
    return { type: "FeatureCollection", features };
  }, [vis]);

  const hasAny = vis.eez || vis.fir || vis.land;

  const onMouseMove = useCallback((e: maplibregl.MapMouseEvent) => {
    const map = mapRef?.getMap();
    if (!map) return;
    const features = map.queryRenderedFeatures(e.point, { layers: HIT_LAYER_IDS });
    if (features.length > 0) {
      const kind = (features[0].properties as any)?.kind as string;
      map.getCanvas().style.cursor = "crosshair";
      setHover({ x: e.point.x, y: e.point.y, kind });
    } else {
      map.getCanvas().style.cursor = "";
      setHover(null);
    }
  }, [mapRef]);

  const onMouseLeave = useCallback(() => {
    const map = mapRef?.getMap();
    if (map) map.getCanvas().style.cursor = "";
    setHover(null);
  }, [mapRef]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.on("mousemove", onMouseMove);
    map.on("mouseleave", onMouseLeave as any);
    return () => {
      map.off("mousemove", onMouseMove);
      map.off("mouseleave", onMouseLeave as any);
    };
  }, [mapRef, onMouseMove, onMouseLeave]);

  const hoverInfo  = hover ? KIND_LABEL[hover.kind] : null;
  const hoveredKind = hover?.kind ?? "__none__";

  return (
    <>
      <Source id="geo-boundaries" type="geojson" data={hasAny ? data : EMPTY}>

        {/* ── Polygon fills (EEZ + FIR) ──────────────────────────────────── */}
        <Layer
          id="geo-eez-fill"
          type="fill"
          filter={["all", ["==", ["geometry-type"], "Polygon"], ["==", ["get", "kind"], "eez"]]}
          paint={{
            "fill-color": C.eez.fill,
            "fill-opacity": hoveredKind === "eez" ? 0.12 : 0.06,
          }}
        />
        <Layer
          id="geo-fir-fill"
          type="fill"
          filter={["all", ["==", ["geometry-type"], "Polygon"], ["==", ["get", "kind"], "fir"]]}
          paint={{
            "fill-color": C.fir.fill,
            "fill-opacity": hoveredKind === "fir" ? 0.12 : 0.05,
          }}
        />

        {/* ── Visible lines ──────────────────────────────────────────────── */}
        <Layer
          id="geo-eez-line"
          type="line"
          filter={["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "kind"], "eez"]]}
          paint={{
            "line-color": C.eez.line,
            "line-width": hoveredKind === "eez" ? 2.5 : 1.5,
            "line-opacity": hoveredKind === "eez" ? 1 : 0.75,
            "line-dasharray": [8, 5],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="geo-fir-line"
          type="line"
          filter={["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "kind"], "fir"]]}
          paint={{
            "line-color": C.fir.line,
            "line-width": hoveredKind === "fir" ? 2.5 : 1.4,
            "line-opacity": hoveredKind === "fir" ? 1 : 0.7,
            "line-dasharray": [10, 3, 2, 3],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="geo-norway-line"
          type="line"
          filter={["==", ["get", "kind"], "norway"]}
          paint={{
            "line-color": C.norway.line,
            "line-width": hoveredKind === "norway" ? 3 : 1.8,
            "line-opacity": hoveredKind === "norway" ? 1 : 0.8,
            "line-dasharray": [5, 3],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />
        <Layer
          id="geo-finland-line"
          type="line"
          filter={["==", ["get", "kind"], "finland"]}
          paint={{
            "line-color": C.finland.line,
            "line-width": hoveredKind === "finland" ? 3 : 1.8,
            "line-opacity": hoveredKind === "finland" ? 1 : 0.8,
            "line-dasharray": [5, 3],
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />

        {/* ── Glow highlight on hover ────────────────────────────────────── */}
        <Layer
          id="geo-highlight-glow"
          type="line"
          filter={["==", ["get", "kind"], hoveredKind]}
          paint={{
            "line-color": ["match", ["get", "kind"],
              "eez",     C.eez.line,
              "fir",     C.fir.line,
              "norway",  C.norway.line,
              "finland", C.finland.line,
              "#ffffff",
            ],
            "line-width": 10,
            "line-opacity": 0.25,
            "line-blur": 6,
          }}
          layout={{ "line-cap": "round", "line-join": "round" }}
        />

        {/* ── Hit-area lines (invisible, wide for easy hover) ───────────── */}
        <Layer id="geo-eez-hit"     type="line" filter={["==", ["get", "kind"], "eez"]}
          paint={{ "line-color": "transparent", "line-width": 18, "line-opacity": 0 }} />
        <Layer id="geo-fir-hit"     type="line" filter={["==", ["get", "kind"], "fir"]}
          paint={{ "line-color": "transparent", "line-width": 18, "line-opacity": 0 }} />
        <Layer id="geo-norway-hit"  type="line" filter={["==", ["get", "kind"], "norway"]}
          paint={{ "line-color": "transparent", "line-width": 18, "line-opacity": 0 }} />
        <Layer id="geo-finland-hit" type="line" filter={["==", ["get", "kind"], "finland"]}
          paint={{ "line-color": "transparent", "line-width": 18, "line-opacity": 0 }} />

      </Source>

      {/* Hover tooltip */}
      {hover && hoverInfo && (
        <div
          style={{
            position: "absolute",
            left: hover.x + 14,
            top: hover.y - 12,
            pointerEvents: "none",
            zIndex: 20,
          }}
          className="bg-slate-900/95 border border-slate-600 rounded px-2.5 py-1.5 text-white font-mono shadow-lg"
        >
          <div className="text-[11px] font-semibold leading-tight">{hoverInfo.label}</div>
          <div className="text-[10px] text-slate-400 leading-tight">{hoverInfo.sub}</div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{ position: "absolute", bottom: 28, right: 10, zIndex: 10, pointerEvents: "none" }}
        className="bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2.5 font-mono text-[10px] text-white shadow-lg min-w-[180px]"
      >
        <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-2">Gränser</div>

        {/* FIR — airspace */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, backgroundColor: C.fir.fill, opacity: 0.4, borderRadius: 2 }} />
            <svg width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke={C.fir.line} strokeWidth="1.8"
                strokeDasharray="7 2 1.5 2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-slate-200">Luftrum (FIR)</span>
        </div>

        {/* EEZ — water */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, backgroundColor: C.eez.fill, opacity: 0.4, borderRadius: 2 }} />
            <svg width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke={C.eez.line} strokeWidth="1.8"
                strokeDasharray="6 4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-slate-200">Sjöterritorium (EEZ)</span>
        </div>

        {/* Norway */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, opacity: 0 }} />
            <svg width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke={C.norway.line} strokeWidth="1.8"
                strokeDasharray="4 3" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-slate-200">Landgräns NO</span>
        </div>

        {/* Finland */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, opacity: 0 }} />
            <svg width="24" height="8">
              <line x1="0" y1="4" x2="24" y2="4" stroke={C.finland.line} strokeWidth="1.8"
                strokeDasharray="4 3" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-slate-200">Landgräns FI</span>
        </div>
      </div>
    </>
  );
}
