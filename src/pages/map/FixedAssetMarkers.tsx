import { useState, useEffect } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import { Shield, Anchor, Building2, Warehouse } from "lucide-react";
import type { FixedMilitaryAsset, FixedAssetType } from "@/types/overlay";
import { FIXED_MILITARY_ASSETS, AMMO_DEPOTS } from "@/data/fixedAssets";

// ── Category meta ─────────────────────────────────────────────────────────────
// kritiska platser  → grey
// militär plats     → green
// skyddsobjekt      → grey (naval_base)

const ASSET_CONFIG: Record<
  FixedAssetType,
  {
    Icon: React.ElementType;
    color: string;         // stroke / icon / label
    fillColor: string;     // inner disc fill
    ringColor: string;     // outer dashed ring
    category: "military" | "infra";
    categoryLabel: string;
  }
> = {
  army_regiment: {
    Icon: Shield,
    color: "#2D5A27",
    fillColor: "rgba(45,90,39,0.12)",
    ringColor: "rgba(45,90,39,0.50)",
    category: "military",
    categoryLabel: "MILITÄR PLATS",
  },
  marine_regiment: {
    Icon: Anchor,
    color: "#2D5A27",
    fillColor: "rgba(45,90,39,0.12)",
    ringColor: "rgba(45,90,39,0.50)",
    category: "military",
    categoryLabel: "MILITÄR PLATS",
  },
  naval_base: {
    Icon: Anchor,
    color: "#6B7280",
    fillColor: "rgba(107,114,128,0.12)",
    ringColor: "rgba(107,114,128,0.45)",
    category: "military",
    categoryLabel: "SKYDDSOBJEKT",
  },
  airport_civilian: {
    Icon: Building2,
    color: "#6B7280",
    fillColor: "rgba(107,114,128,0.10)",
    ringColor: "rgba(107,114,128,0.40)",
    category: "infra",
    categoryLabel: "KRITISK PLATS",
  },
  ammo_depot: {
    Icon: Warehouse,
    color: "#6B7280",
    fillColor: "rgba(107,114,128,0.10)",
    ringColor: "rgba(107,114,128,0.40)",
    category: "infra",
    categoryLabel: "KRITISK PLATS",
  },
};

const TYPE_LABELS: Record<FixedAssetType, string> = {
  army_regiment:    "Arméregemente",
  marine_regiment:  "Marineregemente",
  naval_base:       "Marinbas",
  airport_civilian: "Civil flygplats",
  ammo_depot:       "Ammunitionsdepå",
};

// ── Single marker ─────────────────────────────────────────────────────────────

function AssetMarker({
  asset,
  onSelect,
  dimmed,
  scale,
  selected,
}: {
  asset: FixedMilitaryAsset;
  onSelect: (asset: FixedMilitaryAsset) => void;
  dimmed: boolean;
  scale: number;
  selected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = ASSET_CONFIG[asset.type];
  const { Icon } = cfg;
  const isMilitary = cfg.category === "military";
  const isSelectedAmmoDepot = selected && asset.type === "ammo_depot";

  // Inner disc size and outer dashed ring scale with zoom.
  const innerSize = Math.round(34 * scale);
  const outerSize = innerSize + Math.round(28 * scale);

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
        {/* Hover tooltip */}
        {hovered && !dimmed && (
          <div
            className="absolute z-50 rounded-xl border border-gray-200 shadow-lg p-3 text-xs font-mono text-gray-800 whitespace-nowrap"
            style={{
              bottom: outerSize / 2 + 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(12px)",
              pointerEvents: "none",
              minWidth: 170,
            }}
          >
            <div className="font-bold text-[11px] mb-1" style={{ color: cfg.color }}>
              {asset.shortName} — {TYPE_LABELS[asset.type]}
            </div>
            <div className="text-[9px] mb-1.5" style={{ color: cfg.color, opacity: 0.7 }}>
              {cfg.categoryLabel}
            </div>
            <div className="space-y-1 text-[10px] text-gray-600">
              {isMilitary && asset.personnelCount && (
                <div className="flex justify-between gap-4">
                  <span>Personal</span>
                  <span className="font-bold text-gray-700">
                    {asset.personnelCount.toLocaleString("sv-SE")}
                  </span>
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
                  <span
                    className="font-bold"
                    style={{
                      color:
                        asset.runwayStatus === "operational"
                          ? "#2D5A27"
                          : asset.runwayStatus === "limited"
                          ? "#D97706"
                          : "#DC2626",
                    }}
                  >
                    {asset.runwayStatus === "operational"
                      ? "Operativ"
                      : asset.runwayStatus === "limited"
                      ? "Begränsad"
                      : "Stängd"}
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
                  <span
                    className="font-bold"
                    style={{
                      color:
                        asset.fillLevel > 60
                          ? "#22c55e"
                          : asset.fillLevel > 30
                          ? "#D97706"
                          : "#DC2626",
                    }}
                  >
                    {asset.fillLevel}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fused ring + icon: outer dashed ring → inner filled disc → icon */}
        <div
          className="relative flex items-center justify-center flex-shrink-0"
          style={{ width: outerSize, height: outerSize }}
        >
          {/* Outer dashed ring */}
          <svg
            width={outerSize}
            height={outerSize}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            <circle
              cx={outerSize / 2}
              cy={outerSize / 2}
              r={outerSize / 2 - 2}
              fill="none"
              stroke={isSelectedAmmoDepot ? "rgba(96,165,250,0.95)" : cfg.ringColor}
              strokeWidth={isSelectedAmmoDepot ? 2.3 : 1.5}
              strokeDasharray={isSelectedAmmoDepot ? "6 3" : "5 4"}
            />
          </svg>

          {/* Inner filled disc */}
          <div
            className="flex items-center justify-center"
            style={{
              width: innerSize,
              height: innerSize,
              borderRadius: "50%",
              background: isSelectedAmmoDepot ? "rgba(96,165,250,0.18)" : cfg.fillColor,
              border: `1.8px solid ${isSelectedAmmoDepot ? "#60a5fa" : cfg.color}`,
              boxShadow: isSelectedAmmoDepot
                ? "0 0 0 3px rgba(96,165,250,0.32), 0 0 18px rgba(96,165,250,0.45), 0 2px 10px rgba(0,0,0,0.22)"
                : hovered
                ? `0 0 0 3px ${cfg.ringColor}, 0 2px 10px rgba(0,0,0,0.18)`
                : "0 2px 8px rgba(0,0,0,0.13)",
              transition: "box-shadow 0.2s ease",
            }}
          >
            <Icon size={Math.round(14 * scale)} color={isSelectedAmmoDepot ? "#93c5fd" : cfg.color} strokeWidth={1.8} />
          </div>
        </div>

        {/* Label — hide when very small */}
        {scale > 0.5 && (
          <span
            className="font-mono font-bold mt-0.5 block text-center"
            style={{ fontSize: Math.round(9 * scale), color: isSelectedAmmoDepot ? "#93c5fd" : cfg.color, letterSpacing: "0.05em" }}
          >
            {asset.shortName}
          </span>
        )}

        {/* Fill bar for ammo depots */}
        {asset.type === "ammo_depot" && asset.fillLevel !== undefined && scale > 0.5 && (
          <div
            className="rounded-full overflow-hidden mt-0.5"
            style={{ width: Math.round(28 * scale), height: 3, background: "#E5E7EB" }}
          >
            <div
              style={{
                width: `${asset.fillLevel}%`,
                height: "100%",
                backgroundColor:
                  asset.fillLevel > 60
                    ? "#22c55e"
                    : asset.fillLevel > 30
                    ? "#D97706"
                    : "#DC2626",
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

// ── Public component ──────────────────────────────────────────────────────────

export function FixedAssetMarkers({
  showMilitaryBases,
  showCriticalInfra,
  flygvapnetMode,
  onSelectAsset,
  selectedAssetId,
}: {
  showMilitaryBases: boolean;
  showCriticalInfra: boolean;
  flygvapnetMode: boolean;
  onSelectAsset: (asset: FixedMilitaryAsset) => void;
  selectedAssetId?: string | null;
}) {
  const { current: mapRef } = useMap();
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    setZoom(map.getZoom());
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoom", onZoom);
    return () => map.off("zoom", onZoom);
  }, [mapRef]);

  // Scale: tiny at zoom≤4, full size at zoom≥8, capped at 1.
  const scale = Math.max(0.15, Math.min(1, (zoom - 4) / 4));

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
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} dimmed={flygvapnetMode} scale={scale} selected={selectedAssetId === a.id} />
        ))}
      {showCriticalInfra &&
        infraAssets.map((a) => (
          <AssetMarker key={a.id} asset={a} onSelect={onSelectAsset} dimmed={flygvapnetMode} scale={scale} selected={selectedAssetId === a.id} />
        ))}
    </>
  );
}
