import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import type { DroneUnit } from "@/types/units";
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
}

interface TooltipState {
  droneId: string;
  x: number;
  y: number;
}

export function DroneLayer({ drones, selectedDroneId, onSelectDrone }: DroneLayerProps) {
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

      {drones.map((drone) => {
        const isAirborne = drone.movement.state === "airborne";
        const color = AFFIL_COLORS[drone.affiliation] ?? "#e2e8f0";
        const isSelected = selectedDroneId === drone.id;

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
                filter: isSelected
                  ? `drop-shadow(0 0 5px ${color})`
                  : undefined,
                transform: isSelected ? "scale(1.2)" : undefined,
                transition: "transform 120ms ease",
              }}
              onMouseEnter={(e) => setTooltip({ droneId: drone.id, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTooltip({ droneId: drone.id, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setTooltip(null)}
            >
              <UnitSymbol sidc={drone.sidc} size={28} title={drone.name} />
            </div>
          </Marker>
        );
      })}
    </>
  );
}
