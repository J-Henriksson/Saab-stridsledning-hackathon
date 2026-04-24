import { motion } from "framer-motion";
import { X, Mountain } from "lucide-react";
import type { MapLayerState, BaseMapType } from "@/hooks/useMapLayers";

interface Props {
  state: MapLayerState;
  onBaseMapChange: (base: BaseMapType) => void;
  onToggleOverlay: (key: keyof MapLayerState["overlays"]) => void;
  onOpacityChange: (v: number) => void;
  onToggleDampColors: () => void;
  onClose: () => void;
}

const BASE_OPTIONS: { value: BaseMapType; label: string; sub: string }[] = [
  { value: "dark",      label: "Mörk standard",  sub: "CartoDB Dark Matter" },
  { value: "topo",      label: "Topografi",       sub: "OpenTopoMap" },
  { value: "satellite", label: "Satellit",         sub: "Esri World Imagery" },
  { value: "minimal",   label: "Minimal",          sub: "CartoDB Positron" },
];

const OVERLAY_OPTIONS: { key: keyof MapLayerState["overlays"]; label: string; sub: string }[] = [
  { key: "hillshade",       label: "Hillshade / reliefskuggning", sub: "Esri World Hillshade" },
  { key: "elevationHeatmap",label: "Höjd-heatmap",                sub: "Terrarium DEM tiles" },
  { key: "buildings",       label: "Bebyggelse",                   sub: "CartoDB Light" },
];

export function MapFilterPanel({
  state,
  onBaseMapChange,
  onToggleOverlay,
  onOpacityChange,
  onToggleDampColors,
  onClose,
}: Props) {
  return (
    <motion.div
      key="terrain-filter"
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute left-14 top-1/2 -translate-y-1/2 z-20 w-[260px] flex flex-col gap-0 rounded-lg overflow-hidden border border-amber-500/30"
      style={{ background: "rgba(10, 14, 22, 0.95)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Mountain className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
            Kartfilter
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
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
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded hover:bg-white/5 transition-colors"
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
              <input
                type="radio"
                className="sr-only"
                checked={active}
                onChange={() => onBaseMapChange(opt.value)}
              />
              <div className="flex flex-col leading-none">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: active ? "#e2e8f0" : "#64748b" }}
                >
                  {opt.label}
                </span>
                <span className="text-[8px] font-mono text-slate-600">{opt.sub}</span>
              </div>
            </label>
          );
        })}
      </Section>

      {/* Overlays */}
      <Section label="Overlays">
        {OVERLAY_OPTIONS.map((opt) => {
          const active = state.overlays[opt.key];
          return (
            <label
              key={opt.key}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded hover:bg-white/5 transition-colors"
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggleOverlay(opt.key)}
                className="w-3 h-3 accent-amber-400 flex-shrink-0"
              />
              <div className="flex flex-col leading-none">
                <span
                  className="text-[10px] font-mono"
                  style={{ color: active ? "#e2e8f0" : "#64748b" }}
                >
                  {opt.label}
                </span>
                <span className="text-[8px] font-mono text-slate-600">{opt.sub}</span>
              </div>
            </label>
          );
        })}
      </Section>

      {/* Visuella justeringar */}
      <Section label="Visuella justeringar">
        {/* Opacitet slider */}
        <div className="px-3 py-1.5 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-400">Overlay-opacitet</span>
            <span className="text-[10px] font-mono text-amber-400">{state.overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={state.overlayOpacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="w-full h-1 accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Dämpa färger toggle */}
        <label className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/5 rounded transition-colors">
          <span
            className="text-[10px] font-mono"
            style={{ color: state.dampColors ? "#e2e8f0" : "#64748b" }}
          >
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
          <input
            type="checkbox"
            checked={state.dampColors}
            onChange={onToggleDampColors}
            className="sr-only"
          />
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
