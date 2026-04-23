import { useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import type { ProtectedAsset } from "@/types/overlay";

interface Props {
  score: number;
  coveredCount: number;
  totalCritical: number;
  uncoveredAssets: ProtectedAsset[];
  visible: boolean;
}

const PRIORITY_ORDER: Record<ProtectedAsset["priority"], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const PRIORITY_COLOR: Record<ProtectedAsset["priority"], string> = {
  critical: "#FF3B3B",
  high:     "#D7AB3A",
  medium:   "#94a3b8",
  low:      "#64748b",
};

const PRIORITY_LABEL: Record<ProtectedAsset["priority"], string> = {
  critical: "KRITISK",
  high:     "HÖG",
  medium:   "MEDEL",
  low:      "LÅG",
};

export function CoverageScorePanel({
  score, coveredCount, totalCritical, uncoveredAssets, visible,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  const scoreColor = score >= 75 ? "#22c55e" : score >= 50 ? "#D7AB3A" : "#FF3B3B";

  const sorted = [...uncoveredAssets].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  return (
    <div
      className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2"
      style={{ pointerEvents: "auto" }}
    >
      {/* Score widget */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg"
        style={{
          background: "rgba(5,10,20,0.92)",
          border: `1px solid ${scoreColor}55`,
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
        title="Visa täckningsanalys"
      >
        <ShieldAlert size={14} style={{ color: scoreColor }} />
        <div className="text-left">
          <div
            className="font-mono font-black leading-none"
            style={{ fontSize: 22, color: scoreColor, lineHeight: 1 }}
          >
            {score}
          </div>
          <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.45)" }}>
            TÄCKNING
          </div>
        </div>
        <div className="text-left ml-1">
          <div className="text-[10px] font-mono font-bold" style={{ color: "rgba(215,222,225,0.75)" }}>
            {coveredCount}/{totalCritical}
          </div>
          <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.4)" }}>
            kritiska täckta
          </div>
        </div>
        {uncoveredAssets.length > 0 && (
          <span
            className="ml-1 flex items-center justify-center rounded-full font-mono font-black text-[9px]"
            style={{
              width: 16, height: 16,
              background: "#FF3B3B",
              color: "#fff",
            }}
          >
            {uncoveredAssets.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            width: 260,
            background: "rgba(5,10,20,0.95)",
            border: "1px solid rgba(215,171,58,0.25)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: "rgba(215,171,58,0.15)" }}
          >
            <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: "#D7DEE1" }}>
              TÄCKNINGSGAP
            </span>
            <button onClick={() => setOpen(false)}>
              <X size={12} style={{ color: "#64748b" }} />
            </button>
          </div>

          {sorted.length === 0 ? (
            <div className="px-3 py-4 text-[10px] font-mono text-center" style={{ color: "#22c55e" }}>
              Alla prioriterade skyddsobjekt täckta
            </div>
          ) : (
            <div className="flex flex-col divide-y" style={{ divideColor: "rgba(255,255,255,0.05)" }}>
              {sorted.map((a) => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2">
                  <span
                    className="text-[8px] font-mono font-bold px-1 py-0.5 rounded shrink-0"
                    style={{
                      background: `${PRIORITY_COLOR[a.priority]}22`,
                      color: PRIORITY_COLOR[a.priority],
                      border: `1px solid ${PRIORITY_COLOR[a.priority]}44`,
                    }}
                  >
                    {PRIORITY_LABEL[a.priority]}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "#D7DEE1" }}>
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
