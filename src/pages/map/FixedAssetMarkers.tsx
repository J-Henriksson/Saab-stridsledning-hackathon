import { Marker } from "react-map-gl/maplibre";
import { Shield, Anchor, Plane, Warehouse } from "lucide-react";
import type { FixedMilitaryAsset, FixedAssetType } from "@/types/overlay";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";

const ASSET_CONFIG: Record<
  FixedAssetType,
  { Icon: React.ElementType; color: string }
> = {
  army_regiment:    { Icon: Shield,    color: "#D7AB3A" },
  marine_regiment:  { Icon: Anchor,    color: "#22d3ee" },
  naval_base:       { Icon: Anchor,    color: "#2563eb" },
  airport_civilian: { Icon: Plane,     color: "#94a3b8" },
  ammo_depot:       { Icon: Warehouse, color: "#D9192E" },
};

function AssetMarker({
  asset,
  onSelect,
}: {
  asset: FixedMilitaryAsset;
  onSelect: (asset: FixedMilitaryAsset) => void;
}) {
  const cfg = ASSET_CONFIG[asset.type];
  const { Icon } = cfg;

  return (
    <Marker longitude={asset.lng} latitude={asset.lat} anchor="center">
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(asset); }}
        className="flex flex-col items-center cursor-pointer"
        title={asset.name}
      >
        {/* Hexagonal marker — distinct from circular airbase markers */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            background: "radial-gradient(circle at 50% 40%,#1a2744,#0f172a)",
            border: `2px solid ${cfg.color}`,
            boxShadow: `0 0 8px ${cfg.color}55`,
          }}
        >
          <Icon size={13} color={cfg.color} />
        </div>
        <span
          className="font-mono font-bold mt-0.5"
          style={{
            fontSize: 9,
            color: cfg.color,
            textShadow: `0 0 4px ${cfg.color}88`,
            letterSpacing: "0.05em",
          }}
        >
          {asset.shortName}
        </span>
        {/* Fill bar for ammo depots */}
        {asset.type === "ammo_depot" && asset.fillLevel !== undefined && (
          <div
            className="rounded-full overflow-hidden mt-0.5"
            style={{ width: 28, height: 3, background: "#1e293b" }}
          >
            <div
              style={{
                width: `${asset.fillLevel}%`,
                height: "100%",
                backgroundColor:
                  asset.fillLevel > 60
                    ? "#22c55e"
                    : asset.fillLevel > 30
                    ? "#eab308"
                    : "#ef4444",
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
  showMilitary,
  showCivilian,
  onSelectAsset,
}: {
  showMilitary: boolean;
  showCivilian: boolean;
  onSelectAsset: (asset: FixedMilitaryAsset) => void;
}) {
  const military = FIXED_MILITARY_ASSETS.filter(
    (a) => a.type !== "airport_civilian"
  );
  const civilian = FIXED_MILITARY_ASSETS.filter(
    (a) => a.type === "airport_civilian"
  );

  return (
    <>
      {showMilitary &&
        [...military, ...AMMO_DEPOTS].map((a) => (
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} />
        ))}
      {showCivilian &&
        civilian.map((a) => (
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} />
        ))}
    </>
  );
}
