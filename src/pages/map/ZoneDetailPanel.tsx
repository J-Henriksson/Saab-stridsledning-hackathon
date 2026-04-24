import { Shield, Clock, Trash2 } from "lucide-react";
import type { TacticalZone, UserZoneType, FixedZoneType } from "@/types/overlay";

const TYPE_LABELS: Record<UserZoneType | FixedZoneType, string> = {
  restricted:    "Restriktionszon",
  surveillance:  "Övervakningszon",
  logistics:     "Logistikzon",
  roadstrip:     "Vägstripzon",
  no_fly:        "Flygförbudszon",
  high_security: "Hög säkerhetszon",
};

const TYPE_COLORS: Record<UserZoneType | FixedZoneType, string> = {
  restricted:    "#D9192E",
  surveillance:  "#D7AB3A",
  logistics:     "#2563eb",
  roadstrip:     "#22d3ee",
  no_fly:        "#D9192E",
  high_security: "#7c3aed",
};

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2 text-[10px]">
      <span className="text-muted-foreground font-mono shrink-0">{label}</span>
      <span
        className={`font-mono font-bold text-right ${
          highlight ? "text-red-400" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ZoneDetailPanel({
  zone,
  onDelete,
  currentHour,
  currentDay,
}: {
  zone: TacticalZone;
  onDelete: () => void;
  currentHour: number;
  currentDay: number;
}) {
  const typeKey = (zone.userType ?? zone.fixedType) as UserZoneType | FixedZoneType | undefined;
  const typeLabel = typeKey ? TYPE_LABELS[typeKey] : "Okänd zon";
  const typeColor = typeKey ? TYPE_COLORS[typeKey] : "#94a3b8";

  let ttlText: string | null = null;
  let ttlCritical = false;
  if (zone.expiresAtDay !== undefined && zone.expiresAtHour !== undefined) {
    const hoursLeft =
      (zone.expiresAtDay - currentDay) * 24 + (zone.expiresAtHour - currentHour);
    ttlText = hoursLeft > 0 ? `${hoursLeft}h` : "Utgått";
    ttlCritical = hoursLeft <= 2;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Zone type header */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 shrink-0" style={{ color: typeColor }} />
        <span className="text-xs font-mono font-bold" style={{ color: typeColor }}>
          {typeLabel}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <Row
          label="Kategori"
          value={zone.category === "fixed" ? "PERMANENT" : "TEMPORÄR"}
        />
        <Row
          label="Form"
          value={zone.shape === "circle" ? "Cirkel" : "Polygon"}
        />
        {zone.shape === "circle" && zone.radiusKm != null && (
          <Row label="Radii" value={`${zone.radiusKm.toFixed(1)} km`} />
        )}
        {zone.center && (
          <Row
            label="Position"
            value={`${zone.center.lat.toFixed(4)}°N  ${zone.center.lng.toFixed(4)}°E`}
          />
        )}
        {zone.shape === "polygon" && zone.coordinates && (
          <Row label="Punkter" value={`${zone.coordinates.length} st`} />
        )}
        {ttlText && (
          <div className="flex items-center gap-1.5 mt-1">
            <Clock
              className="h-3 w-3 shrink-0"
              style={{ color: ttlCritical ? "#ef4444" : "#94a3b8" }}
            />
            <Row label="Utgår om" value={ttlText} highlight={ttlCritical} />
          </div>
        )}
        {zone.createdBy && (
          <Row label="Skapad av" value={zone.createdBy} />
        )}
        {zone.description && (
          <div className="pt-2 text-[10px] text-muted-foreground font-mono leading-relaxed border-t border-border">
            {zone.description}
          </div>
        )}
      </div>

      {/* Delete button (user zones only) */}
      {zone.category === "user" && (
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono transition-colors"
          style={{
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.05)",
          }}
        >
          <Trash2 className="h-3 w-3" />
          Ta bort zon
        </button>
      )}
    </div>
  );
}
