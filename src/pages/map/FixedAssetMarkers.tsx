import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { Shield, Anchor, Building2, Warehouse } from "lucide-react";
import type { FixedMilitaryAsset, FixedAssetType } from "@/types/overlay";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";

const ASSET_CONFIG: Record<
  FixedAssetType,
  { Icon: React.ElementType; color: string; category: "military" | "infra" }
> = {
  army_regiment:    { Icon: Shield,    color: "#2D5A27", category: "military" },
  marine_regiment:  { Icon: Anchor,    color: "#2D5A27", category: "military" },
  naval_base:       { Icon: Anchor,    color: "#2D5A27", category: "military" },
  airport_civilian: { Icon: Building2, color: "#708090", category: "infra" },
  ammo_depot:       { Icon: Warehouse, color: "#708090", category: "infra" },
};

const TYPE_LABELS: Record<FixedAssetType, string> = {
  army_regiment:    "Arméregemente",
  marine_regiment:  "Marineregemente",
  naval_base:       "Marinbas",
  airport_civilian: "Civil flygplats",
  ammo_depot:       "Ammunitionsdepå",
};

function AssetMarker({
  asset,
  onSelect,
  dimmed,
}: {
  asset: FixedMilitaryAsset;
  onSelect: (asset: FixedMilitaryAsset) => void;
  dimmed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = ASSET_CONFIG[asset.type];
  const { Icon } = cfg;
  const isMilitary = cfg.category === "military";

  return (
    <Marker longitude={asset.lng} latitude={asset.lat} anchor="center">
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(asset); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex flex-col items-center cursor-pointer relative"
        style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity 0.3s ease" }}
        title={asset.name}
      >
        {/* Hover data card */}
        {hovered && !dimmed && (
          <div
            className="absolute z-50 rounded-xl border border-gray-200 shadow-lg p-3 text-xs font-mono text-gray-800 whitespace-nowrap"
            style={{
              bottom: 46,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              pointerEvents: "none",
              minWidth: 170,
            }}
          >
            <div className="font-bold text-[11px] mb-1.5" style={{ color: cfg.color }}>
              {asset.shortName} — {TYPE_LABELS[asset.type]}
            </div>
            <div className="space-y-1 text-[10px] text-gray-600">
              {isMilitary && asset.personnelCount && (
                <div className="flex justify-between gap-4">
                  <span>Personal</span>
                  <span className="font-bold text-gray-700">{asset.personnelCount.toLocaleString("sv-SE")}</span>
                </div>
              )}
              {isMilitary && asset.activeUnits && asset.activeUnits.length > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  {asset.activeUnits.map((u) => (
                    <div key={u} className="text-[9px] text-gray-500">{u}</div>
                  ))}
                </div>
              )}
              {!isMilitary && asset.icao && (
                <div className="flex justify-between gap-4">
                  <span>ICAO</span>
                  <span className="font-bold text-gray-700">{asset.icao}</span>
                </div>
              )}
              {!isMilitary && asset.runwayStatus && (
                <div className="flex justify-between gap-4">
                  <span>Status</span>
                  <span className="font-bold" style={{
                    color: asset.runwayStatus === "operational" ? "#2D5A27" : asset.runwayStatus === "limited" ? "#D97706" : "#DC2626"
                  }}>
                    {asset.runwayStatus === "operational" ? "Operativ" : asset.runwayStatus === "limited" ? "Begränsad" : "Stängd"}
                  </span>
                </div>
              )}
              {asset.capacity && (
                <div className="flex justify-between gap-4">
                  <span>Kapacitet</span>
                  <span className="font-bold text-gray-700">{asset.capacity}</span>
                </div>
              )}
              {asset.type === "ammo_depot" && asset.fillLevel !== undefined && (
                <div className="flex justify-between gap-4">
                  <span>Fyllnadsgrad</span>
                  <span className="font-bold" style={{
                    color: asset.fillLevel > 60 ? "#22c55e" : asset.fillLevel > 30 ? "#D97706" : "#DC2626"
                  }}>{asset.fillLevel}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hexagonal marker */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            background: "#ffffff",
            outline: `2px solid ${cfg.color}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Icon size={13} color={cfg.color} />
        </div>
        <span
          className="font-mono font-bold mt-0.5"
          style={{
            fontSize: 9,
            color: cfg.color,
            letterSpacing: "0.05em",
          }}
        >
          {asset.shortName}
        </span>

        {/* Fill bar for ammo depots */}
        {asset.type === "ammo_depot" && asset.fillLevel !== undefined && (
          <div
            className="rounded-full overflow-hidden mt-0.5"
            style={{ width: 28, height: 3, background: "#E5E7EB" }}
          >
            <div
              style={{
                width: `${asset.fillLevel}%`,
                height: "100%",
                backgroundColor: asset.fillLevel > 60 ? "#22c55e" : asset.fillLevel > 30 ? "#D97706" : "#DC2626",
                borderRadius: "9999px",
                transition: "width 0.3s",
              }}
            />
          </div>
        )}
      </div>
    </Marker>
  );
}

export function FixedAssetMarkers({
  showMilitaryBases,
  showCriticalInfra,
  flygvapnetMode,
  onSelectAsset,
}: {
  showMilitaryBases: boolean;
  showCriticalInfra: boolean;
  flygvapnetMode: boolean;
  onSelectAsset: (asset: FixedMilitaryAsset) => void;
}) {
  const militaryAssets = FIXED_MILITARY_ASSETS.filter(
    (a) => ASSET_CONFIG[a.type].category === "military"
  );
  const infraAssets = [
    ...FIXED_MILITARY_ASSETS.filter((a) => ASSET_CONFIG[a.type].category === "infra"),
    ...AMMO_DEPOTS,
  ];

  return (
    <>
      {showMilitaryBases &&
        militaryAssets.map((a) => (
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} dimmed={flygvapnetMode} />
        ))}
      {showCriticalInfra &&
        infraAssets.map((a) => (
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} dimmed={flygvapnetMode} />
        ))}
    </>
  );
}
