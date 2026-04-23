import { useState } from "react";
import { Layers, X } from "lucide-react";
import type { DrawingMode, OverlayLayerVisibility } from "@/types/overlay";

const DRAW_TOOLS: {
  mode: DrawingMode;
  label: string;
  color: string;
}[] = [
  { mode: "circle_restricted",   label: "Restriktionszon", color: "#D9192E" },
  { mode: "circle_surveillance", label: "Övervakningszon", color: "#D7AB3A" },
  { mode: "circle_logistics",    label: "Logistikzon",     color: "#2563eb" },
  { mode: "polygon_roadstrip",   label: "Vägstripzon",     color: "#22d3ee" },
];

const LAYER_ITEMS: { key: keyof OverlayLayerVisibility; label: string }[] = [
  { key: "militaryAssets",         label: "Militära tillgångar" },
  { key: "civilianInfrastructure", label: "Civil infrastruktur" },
  { key: "activeZones",            label: "Aktiva zoner" },
  { key: "coverageRings",          label: "Täckningsområden" },
];

interface ZoneToolbarProps {
  drawingMode: DrawingMode;
  onSetDrawingMode: (mode: DrawingMode) => void;
  visibility: OverlayLayerVisibility;
  onToggleVisibility: (key: keyof OverlayLayerVisibility) => void;
  activeZoneCount: number;
}

export function ZoneToolbar({
  drawingMode,
  onSetDrawingMode,
  visibility,
  onToggleVisibility,
  activeZoneCount,
}: ZoneToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2"
      style={{ pointerEvents: "auto" }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        title="Zonverktyg"
        style={{
          background: expanded ? "rgba(215,171,58,0.15)" : "rgba(5,10,20,0.85)",
          border: `1px solid ${expanded ? "#D7AB3A" : "rgba(215,171,58,0.3)"}`,
          color: "#D7AB3A",
          backdropFilter: "blur(6px)",
        }}
      >
        <Layers size={16} />
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-1 p-2 rounded-lg"
          style={{
            background: "rgba(5,10,20,0.92)",
            border: "1px solid rgba(215,171,58,0.25)",
            backdropFilter: "blur(8px)",
            minWidth: 148,
          }}
        >
          {/* Drawing tools section */}
          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-0.5"
            style={{ color: "#64748b" }}
          >
            RITVERKTYG
          </div>
          {DRAW_TOOLS.map((tool) => {
            const isActive = drawingMode === tool.mode;
            return (
              <button
                key={tool.mode}
                onClick={() => onSetDrawingMode(isActive ? "none" : tool.mode)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all"
                style={{
                  background: isActive ? `${tool.color}22` : "transparent",
                  border: `1px solid ${isActive ? tool.color : "transparent"}`,
                  color: isActive ? tool.color : "#94a3b8",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: tool.color, opacity: isActive ? 1 : 0.4 }}
                />
                <span className="text-[10px] font-mono flex-1">{tool.label}</span>
                {isActive && <X size={10} opacity={0.6} />}
              </button>
            );
          })}

          <div
            style={{ height: 1, background: "rgba(215,171,58,0.15)" }}
            className="my-1"
          />

          {/* Layer toggles section */}
          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-0.5"
            style={{ color: "#64748b" }}
          >
            LAGER ({activeZoneCount} aktiva)
          </div>
          {LAYER_ITEMS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none"
              style={{ color: visibility[key] ? "#e2e8f0" : "#64748b" }}
            >
              <input
                type="checkbox"
                checked={visibility[key]}
                onChange={() => onToggleVisibility(key)}
                className="w-3 h-3 accent-amber-400"
              />
              <span className="text-[10px] font-mono">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
