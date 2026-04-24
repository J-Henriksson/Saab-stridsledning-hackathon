import { useState } from "react";
import { motion } from "framer-motion";
import { X, Mountain } from "lucide-react";
import type { MapLayerState, BaseMapType, OverlayConfig, OverlayKey } from "@/hooks/useMapLayers";

interface Props {
  state: MapLayerState;
  onBaseMapChange: (base: BaseMapType) => void;
  onToggleOverlay: (key: OverlayKey) => void;
  onSetOverlayOpacity: (key: OverlayKey, v: number) => void;
  onToggleDampColors: () => void;
  onHoverChange: (key: OverlayKey | null) => void;
  hasObserver: boolean; // true if a base/asset is selected (needed for radarShadow)
  onClose: () => void;
}

const BASE_OPTIONS: { value: BaseMapType; label: string; sub: string }[] = [
  { value: "voyager",   label: "Terräng",          sub: "CartoDB Voyager (standard)" },
  { value: "dark",      label: "Mörk standard",    sub: "CartoDB Dark Matter" },
  { value: "topo",      label: "Topografi",         sub: "OpenTopoMap" },
  { value: "satellite", label: "Satellit",           sub: "Esri World Imagery" },
  { value: "minimal",   label: "Minimal",            sub: "CartoDB Positron" },
];

interface OverlayOption {
  key: OverlayKey;
  label: string;
  sub: string;
  defaultOpacity: number;
  disabledOnSatellite?: boolean;
}

const OVERLAY_OPTIONS: OverlayOption[] = [
  {
    key: "hillshade",
    label: "Bergsområden",
    sub: "Esri Hillshade — reliefskuggning",
    defaultOpacity: 35,
    disabledOnSatellite: true,
  },
  {
    key: "radarShadow",
    label: "Radarskugga",
    sub: "Viewshed 200 km — höjdhinder 500 m AGL",
    defaultOpacity: 25,
  },
  {
    key: "ocean",
    label: "Öppet vatten",
    sub: "Esri Ocean — flygkorridorer",
    defaultOpacity: 30,
  },
];

export function MapFilterPanel({
  state,
  onBaseMapChange,
  onToggleOverlay,
  onSetOverlayOpacity,
  onToggleDampColors,
  onHoverChange,
  hasObserver,
  onClose,
}: Props) {
  const [hovered, setHovered] = useState<OverlayKey | null>(null);

  const handleMouseEnter = (key: OverlayKey) => {
    setHovered(key);
    onHoverChange(key);
  };
  const handleMouseLeave = () => {
    setHovered(null);
    onHoverChange(null);
  };

  return (
    <motion.div
      key="terrain-filter"
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute left-14 top-1/2 -translate-y-1/2 z-20 w-[268px] flex flex-col gap-0 rounded-lg overflow-hidden border border-amber-500/30"
      style={{ background: "rgba(10, 14, 22, 0.97)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Mountain className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
            Kartfilter
          </span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Baslager */}
      <Section label="Baslager">
        {BASE_OPTIONS.map((opt) => {
          const active = state.baseMap === opt.value;
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <span
                className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                style={{
                  borderColor: active ? "#D7AB3A" : "#475569",
                  background: active ? "#D7AB3A" : "transparent",
                }}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
              </span>
              <input type="radio" className="sr-only" checked={active} onChange={() => onBaseMapChange(opt.value)} />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-mono" style={{ color: active ? "#e2e8f0" : "#64748b" }}>
                  {opt.label}
                </span>
                <span className="text-[8px] font-mono text-slate-600">{opt.sub}</span>
              </div>
            </label>
          );
        })}
      </Section>

      {/* Taktiska overlays */}
      <Section label="Taktiska overlays">
        {OVERLAY_OPTIONS.map((opt) => {
          const cfg: OverlayConfig = state.overlays[opt.key];
          const isSatDisabled = opt.disabledOnSatellite && state.baseMap === "satellite";
          const isHovered = hovered === opt.key;
          const showSlider = cfg.active || isHovered;

          return (
            <div
              key={opt.key}
              className="flex flex-col"
              onMouseEnter={() => handleMouseEnter(opt.key)}
              onMouseLeave={handleMouseLeave}
            >
              <label
                className={`flex items-start gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                  isSatDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={cfg.active}
                  disabled={isSatDisabled}
                  onChange={() => !isSatDisabled && onToggleOverlay(opt.key)}
                  className="w-3 h-3 mt-0.5 accent-amber-400 flex-shrink-0"
                />
                <div className="flex flex-col leading-none flex-1 min-w-0">
                  <span className="text-[10px] font-mono" style={{ color: cfg.active ? "#e2e8f0" : "#64748b" }}>
                    {opt.label}
                  </span>
                  <span className="text-[8px] font-mono text-slate-600 truncate">{opt.sub}</span>
                  {isSatDisabled && (
                    <span className="text-[8px] font-mono text-amber-600 mt-0.5">
                      Ej tillgängligt med Satellit-baslager
                    </span>
                  )}
                  {opt.key === "radarShadow" && cfg.active && !hasObserver && (
                    <span className="text-[8px] font-mono text-amber-500 mt-0.5">
                      ⚠ Välj en bas eller tillgång på kartan
                    </span>
                  )}
                </div>
              </label>

              {/* Inline opacity slider — shown when active or hovered */}
              {showSlider && !isSatDisabled && (
                <div className="px-3 pb-1.5 flex items-center gap-2">
                  <div className="w-2.5 border-l border-slate-700 self-stretch ml-1.5" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cfg.opacity}
                    onChange={(e) => onSetOverlayOpacity(opt.key, Number(e.target.value))}
                    className="flex-1 h-1 accent-amber-400 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-[9px] font-mono text-amber-400 w-7 text-right shrink-0">
                    {cfg.opacity}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* Visuella justeringar */}
      <Section label="Visuella justeringar">
        <label className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors">
          <span className="text-[10px] font-mono" style={{ color: state.dampColors ? "#e2e8f0" : "#64748b" }}>
            Dämpa färger
          </span>
          <div
            className="relative w-7 h-4 rounded-full transition-colors"
            style={{ background: state.dampColors ? "#D7AB3A" : "#1e293b" }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
              style={{ transform: state.dampColors ? "translateX(14px)" : "translateX(2px)" }}
            />
          </div>
          <input type="checkbox" checked={state.dampColors} onChange={onToggleDampColors} className="sr-only" />
        </label>
      </Section>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-amber-500/10 last:border-0">
      <div className="px-3 pt-2 pb-0.5">
        <span className="text-[8px] font-mono font-bold tracking-widest text-slate-600 uppercase">
          {label}
        </span>
      </div>
      <div className="flex flex-col pb-1">{children}</div>
    </div>
  );
}
