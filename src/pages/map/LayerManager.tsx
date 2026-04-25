import { useState } from "react";
import { Layers, X, Plane, Shield, Building2, ShieldAlert, MapPin, Mountain, Radio, TrainFront } from "lucide-react";
import type { DrawingMode, OverlayLayerVisibility } from "@/types/overlay";

const MILITARY_GREEN = "#2D5A27";
const RADAR_TEAL = "#00E5C7";

const DRAW_TOOLS: { mode: DrawingMode; label: string; color: string }[] = [
  { mode: "circle_restricted",   label: "Restriktionszon", color: "#D9192E" },
  { mode: "circle_surveillance", label: "Övervakningszon", color: "#D97706" },
  { mode: "circle_logistics",    label: "Logistikzon",     color: "#2563eb" },
  { mode: "polygon_roadstrip",   label: "Vägstripzon",     color: "#0891b2" },
];

const LAYER_ITEMS: {
  key: keyof OverlayLayerVisibility;
  label: string;
  Icon: React.ElementType;
  color: string;
  solo?: boolean;
}[] = [
  { key: "flygvapnet",    label: "Flygvapnet / Flygbaser", Icon: Plane,       color: MILITARY_GREEN, solo: true },
  { key: "militaryBases", label: "Militära baser",          Icon: Shield,      color: MILITARY_GREEN },
  { key: "criticalInfra", label: "Kritisk infrastruktur",   Icon: Building2,   color: "#708090" },
  { key: "skyddsobjekt",  label: "Skyddsobjekt",            Icon: ShieldAlert, color: "#D97706" },
  { key: "radarUnits",    label: "Radarstationer",          Icon: Radio,       color: RADAR_TEAL },
  { key: "activeZones",   label: "Aktiva zoner",            Icon: MapPin,      color: "#2563eb" },
  { key: "railroad",      label: "Järnväg",                 Icon: TrainFront,  color: "#78350f" },
];

interface LayerManagerProps {
  drawingMode: DrawingMode;
  onSetDrawingMode: (mode: DrawingMode) => void;
  visibility: OverlayLayerVisibility;
  onToggleVisibility: (key: keyof OverlayLayerVisibility) => void;
  activeZoneCount: number;
  terrainFilterOpen?: boolean;
  onOpenTerrainFilter?: () => void;
}

export function LayerManager({
  drawingMode,
  onSetDrawingMode,
  visibility,
  onToggleVisibility,
  activeZoneCount,
  terrainFilterOpen = false,
  onOpenTerrainFilter,
}: LayerManagerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2"
      style={{ pointerEvents: "auto" }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        title="Lagerhanterare"
        style={{
          background: expanded ? `${MILITARY_GREEN}18` : "rgba(255,255,255,0.88)",
          border: `1.5px solid ${expanded ? MILITARY_GREEN : "rgba(45,90,39,0.30)"}`,
          color: MILITARY_GREEN,
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
        }}
      >
        <Layers size={16} />
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-1 p-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: `1px solid rgba(45,90,39,0.18)`,
            backdropFilter: "blur(14px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            minWidth: 168,
          }}
        >
          {/* Drawing tools section */}
          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-1"
            style={{ color: "#9CA3AF" }}
          >
            RITVERKTYG
          </div>
          {DRAW_TOOLS.map((tool) => {
            const isActive = drawingMode === tool.mode;
            return (
              <button
                key={tool.mode}
                onClick={() => onSetDrawingMode(isActive ? "none" : tool.mode)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
                style={{
                  background: isActive ? `${tool.color}18` : "transparent",
                  border: `1px solid ${isActive ? tool.color : "transparent"}`,
                  color: isActive ? tool.color : "#6B7280",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: tool.color, opacity: isActive ? 1 : 0.45 }}
                />
                <span className="text-[10px] font-mono flex-1">{tool.label}</span>
                {isActive && <X size={10} opacity={0.5} />}
              </button>
            );
          })}

          {onOpenTerrainFilter && (
            <button
              onClick={onOpenTerrainFilter}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg w-full text-left transition-all mt-0.5"
              style={{
                background: terrainFilterOpen ? `${MILITARY_GREEN}18` : "transparent",
                border: `1px solid ${terrainFilterOpen ? MILITARY_GREEN : "transparent"}`,
                color: terrainFilterOpen ? MILITARY_GREEN : "#6B7280",
              }}
            >
              <Mountain size={12} />
              <span className="text-[10px] font-mono flex-1">Kartfilter</span>
            </button>
          )}

          <div
            style={{ height: 1, background: "rgba(45,90,39,0.12)" }}
            className="my-1.5"
          />

          {/* Layer toggles section */}
          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-1"
            style={{ color: "#9CA3AF" }}
          >
            LAGER ({activeZoneCount} aktiva)
          </div>

          {LAYER_ITEMS.map(({ key, label, Icon, color, solo }) => {
            const isOn = visibility[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-all"
                style={{
                  background: isOn ? `${color}10` : "transparent",
                  border: `1px solid ${isOn ? `${color}30` : "transparent"}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!isOn}
                  onChange={() => onToggleVisibility(key)}
                  className="sr-only"
                />
                {/* Custom toggle indicator */}
                <span
                  className="flex items-center justify-center w-4 h-4 rounded shrink-0"
                  style={{
                    background: isOn ? color : "#E5E7EB",
                    transition: "background 0.2s",
                  }}
                >
                  {isOn && <Icon size={9} color="#ffffff" />}
                </span>
                <span
                  className="text-[10px] font-mono flex-1"
                  style={{ color: isOn ? "#374151" : "#9CA3AF" }}
                >
                  {label}
                </span>
                {solo && isOn && (
                  <span
                    className="text-[8px] font-bold rounded px-1 py-0.5"
                    style={{ background: `${color}20`, color }}
                  >
                    SOLO
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
