import { useState } from "react";
import { Layers, X, Plane, Shield, Package } from "lucide-react";
import type { DrawingMode, CategoryId } from "@/types/overlay";
import { BASE_COORDS } from "./constants";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";

const DRAW_TOOLS: { mode: DrawingMode; label: string; color: string }[] = [
  { mode: "circle_restricted",   label: "Restriktionszon", color: "#D9192E" },
  { mode: "circle_surveillance", label: "Övervakningszon", color: "#D7AB3A" },
  { mode: "circle_logistics",    label: "Logistikzon",     color: "#2563eb" },
  { mode: "polygon_roadstrip",   label: "Vägstripzon",     color: "#22d3ee" },
];

interface CategoryDef {
  id: CategoryId;
  label: string;
  color: string;
  Icon: React.ElementType;
  count: number;
}

interface Props {
  visibility: Record<CategoryId, boolean>;
  onToggle: (cat: CategoryId) => void;
  drawingMode: DrawingMode;
  onSetDrawingMode: (mode: DrawingMode) => void;
  activeZoneCount: number;
}

export function FilterSidebar({
  visibility,
  onToggle,
  drawingMode,
  onSetDrawingMode,
  activeZoneCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const airbaseCount = Object.keys(BASE_COORDS).length;
  const armyNavyCount = FIXED_MILITARY_ASSETS.filter(
    (a) => a.type === "army_regiment" || a.type === "marine_regiment" || a.type === "naval_base"
  ).length;
  const civilCount = FIXED_MILITARY_ASSETS.filter((a) => a.type === "airport_civilian").length;
  const ammoCount = AMMO_DEPOTS.length + activeZoneCount;

  const CATEGORIES: CategoryDef[] = [
    { id: "airbases",   label: "Flygvapnet",     color: "#2D5A27", Icon: Plane,   count: airbaseCount   },
    { id: "army_navy",  label: "Armén + Marinen", color: "#2D5A27", Icon: Shield,  count: armyNavyCount  },
    { id: "civil",      label: "Civil luftfart",  color: "#708090", Icon: Plane,   count: civilCount     },
    { id: "ammo_zones", label: "Ammo & Zoner",    color: "#D97706", Icon: Package, count: ammoCount      },
  ];

  return (
    <div
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2"
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all"
        title="Lagerhanterare"
        style={{
          background: expanded ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.90)",
          border: `1px solid ${expanded ? "rgba(45,90,39,0.35)" : "rgba(180,180,180,0.5)"}`,
          color: expanded ? "#2D5A27" : "#6b7280",
          backdropFilter: "blur(8px)",
        }}
      >
        <Layers size={16} />
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-0.5 p-3 rounded-2xl shadow-xl"
          style={{
            background: "rgba(255,255,255,0.93)",
            border: "1px solid rgba(255,255,255,0.65)",
            backdropFilter: "blur(14px)",
            minWidth: 186,
          }}
        >
          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-1.5"
            style={{ color: "#9ca3af" }}
          >
            LAGER
          </div>

          {CATEGORIES.map((cat) => {
            const isOn = visibility[cat.id];
            return (
              <div key={cat.id} className="flex items-center gap-2 px-1 py-1 rounded-lg">
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-colors duration-200"
                  style={{ background: isOn ? cat.color : "#d1d5db" }}
                />
                <cat.Icon size={11} color={isOn ? cat.color : "#d1d5db"} />
                <span
                  className="text-[10px] font-mono flex-1 transition-colors duration-200"
                  style={{ color: isOn ? "#1f2937" : "#9ca3af" }}
                >
                  {cat.label}
                </span>
                <span className="text-[9px] font-mono" style={{ color: "#d1d5db" }}>
                  {cat.count}
                </span>
                <button
                  onClick={() => onToggle(cat.id)}
                  className="relative shrink-0 rounded-full transition-colors duration-200"
                  style={{
                    width: 28,
                    height: 16,
                    background: isOn ? cat.color : "#d1d5db",
                  }}
                >
                  <span
                    className="absolute rounded-full bg-white shadow transition-transform duration-200"
                    style={{
                      width: 12,
                      height: 12,
                      top: 2,
                      left: 2,
                      transform: isOn ? "translateX(12px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>
            );
          })}

          <div className="my-2" style={{ height: 1, background: "rgba(0,0,0,0.07)" }} />

          <div
            className="text-[9px] font-mono tracking-widest px-1 mb-1"
            style={{ color: "#9ca3af" }}
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
                  color: isActive ? tool.color : "#6b7280",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: tool.color, opacity: isActive ? 1 : 0.45 }}
                />
                <span className="text-[10px] font-mono flex-1">{tool.label}</span>
                {isActive && <X size={10} opacity={0.6} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
