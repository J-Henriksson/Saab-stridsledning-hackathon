import { Marker } from "react-map-gl/maplibre";
import type { ProtectedAsset } from "@/types/overlay";

interface Props {
  uncoveredAssets: ProtectedAsset[];
  visible: boolean;
}

const PRIORITY_LABEL: Record<ProtectedAsset["priority"], string> = {
  critical: "KRITISK",
  high:     "HÖG",
  medium:   "MEDEL",
  low:      "LÅG",
};

export function GapMarkers({ uncoveredAssets, visible }: Props) {
  if (!visible || uncoveredAssets.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes coverage-pulse {
          0%   { transform: scale(1);    opacity: 0.7; }
          50%  { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(1);    opacity: 0.7; }
        }
        .coverage-gap-ring {
          animation: coverage-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {uncoveredAssets.map((asset) => (
        <Marker
          key={asset.id}
          longitude={asset.position.lng}
          latitude={asset.position.lat}
          anchor="center"
        >
          <div className="flex flex-col items-center" style={{ pointerEvents: "none" }}>
            {/* Pulsing gap ring */}
            <div
              className="coverage-gap-ring"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "2px solid #FF3B3B",
                background: "transparent",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
            {/* Label */}
            <div
              style={{
                marginTop: 28,
                background: "rgba(255,59,59,0.85)",
                color: "#fff",
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                padding: "1px 4px",
                borderRadius: 2,
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              GAP · {PRIORITY_LABEL[asset.priority]}
            </div>
            <div
              style={{
                background: "rgba(10,10,20,0.82)",
                color: "#FF3B3B",
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 600,
                padding: "1px 4px",
                borderRadius: 2,
                whiteSpace: "nowrap",
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none",
              }}
            >
              {asset.name}
            </div>
          </div>
        </Marker>
      ))}
    </>
  );
}
