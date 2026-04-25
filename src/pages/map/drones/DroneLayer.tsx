import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import type { DroneUnit } from "@/types/units";
import { ISRDroneIcon, StrikeDroneIcon } from "@/components/symbols/UnitIcons";
import { UnitSymbol } from "@/components/map/UnitSymbol";

const AIRBORNE_PULSE = `
@keyframes drone-pulse {
  0%, 100% { opacity: 0.35; transform: translate(-50%,-50%) scale(1); }
  50%       { opacity: 1;    transform: translate(-50%,-50%) scale(1.8); }
}
`;

const AFFIL_COLORS: Record<string, string> = {
  friend:  "#22c55e",
  hostile: "#ef4444",
  neutral: "#a3a3a3",
  unknown: "#eab308",
  pending: "#a78bfa",
};

interface DroneLayerProps {
  drones: DroneUnit[];
  selectedDroneId?: string | null;
  onSelectDrone?: (droneId: string) => void;
  iconStyle?: "custom" | "nato";
  highlightBaseId?: string | null;
}

interface TooltipState {
  droneId: string;
  x: number;
  y: number;
}

export function DroneLayer({ drones, selectedDroneId, onSelectDrone, iconStyle = "custom", highlightBaseId }: DroneLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const hoveredDrone = tooltip ? drones.find((d) => d.id === tooltip.droneId) : null;

  return (
    <>
      <style>{AIRBORNE_PULSE}</style>

      {/* Hover tooltip */}
      {tooltip && hoveredDrone && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            zIndex: 9999,
            pointerEvents: "none",
            background: "rgba(15,20,30,0.92)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#e2e8f0",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{hoveredDrone.name}</div>
          <div>Status: {hoveredDrone.status}</div>
          <div>Bränsle: {Math.round(hoveredDrone.fuel)}%</div>
          <div>Bas: {hoveredDrone.currentBase ?? hoveredDrone.lastBase ?? "–"}</div>
        </div>
      )}

      {drones.filter((d) => d.movement.state === "airborne" || (d.movement.state !== "airborne" && d.currentBase === null)).map((drone) => {
        const color = AFFIL_COLORS[drone.affiliation] ?? "#e2e8f0";
        const isSelected = selectedDroneId === drone.id;
        const droneBase = (drone as any).currentBase ?? (drone as any).lastBase ?? null;
        const isDimmed = !!highlightBaseId && drone.affiliation !== "hostile" && droneBase !== highlightBaseId;

        return (
          <Marker
            key={drone.id}
            longitude={drone.position.lng}
            latitude={drone.position.lat}
            anchor="center"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrone?.(drone.id);
              }}
              style={{
                cursor: "pointer",
                position: "relative",
                opacity: isDimmed ? 0.15 : 1,
                filter: isSelected
                  ? `drop-shadow(0 0 5px ${color})`
                  : undefined,
                transform: isSelected ? "scale(1.2)" : undefined,
                transition: "transform 120ms ease, opacity 0.35s ease",
              }}
              onMouseEnter={(e) => setTooltip({ droneId: drone.id, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTooltip({ droneId: drone.id, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
            >
              {iconStyle === "nato"
                ? <UnitSymbol sidc={drone.sidc} size={28} title={drone.name} />
                : drone.type === "STRIKE_DRONE"
                  ? <StrikeDroneIcon size={28} color={color} />
                  : <ISRDroneIcon    size={28} color={color} />
              }
            </div>
          </Marker>
        );
      })}
    </>
  );
}
