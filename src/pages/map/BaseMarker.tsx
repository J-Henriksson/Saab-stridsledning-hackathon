import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { Base } from "@/types/game";
import { statusColor, fuelColor } from "./helpers";
import { BASE_COORDS, BASE_ICAO, BASE_RUNWAY_STATUS, BASE_ACTIVE_UNITS } from "./constants";
import { getAircraft } from "@/core/units/helpers";

function readinessPct(base: Base | undefined): number {
  if (!base) return 0;
  const list = getAircraft(base);
  if (list.length === 0) return 0;
  const mc = list.filter((a) => a.status === "ready").length;
  return Math.round((mc / list.length) * 100);
}

const MILITARY_GREEN = "#2D5A27";

export function BaseMarker({
  id,
  base,
  isSelected,
  onClick,
  flygvapnetMode = false,
  showAirbases = true,
  dimmed = false,
}: {
  id: string;
  base: Base | undefined;
  isSelected: boolean;
  onClick: () => void;
  flygvapnetMode?: boolean;
  showAirbases?: boolean;
  dimmed?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const coords = BASE_COORDS[id];
  if (!coords || !showAirbases) return null;

  const readinessColor = statusColor(base);
  const isMainBase = id === "MOB";
  const size = isMainBase ? 46 : 34;
  const acList = base ? getAircraft(base) : [];
  const mc = acList.filter((a) => a.status === "ready").length;
  const onMission = acList.filter((a) => a.status === "on_mission").length;
  const pct = readinessPct(base);
  const hasAircraft = acList.length > 0;
  const isBottleneck = base && (
    (hasAircraft && mc / acList.length < 0.4) ||
    base.maintenanceBays.occupied >= base.maintenanceBays.total ||
    base.fuel < 20
  );

  const icao = BASE_ICAO[id] ?? id;
  const runwayStatus = BASE_RUNWAY_STATUS[id] ?? "operational";
  const activeUnits = BASE_ACTIVE_UNITS[id] ?? [];

  const runwayStatusColor = runwayStatus === "operational" ? "#2D5A27" : runwayStatus === "limited" ? "#D97706" : "#DC2626";
  const runwayStatusLabel = runwayStatus === "operational" ? "Operativ" : runwayStatus === "limited" ? "Begränsad" : "Stängd";

  return (
    <Marker longitude={coords.lng} latitude={coords.lat} anchor="center">
      <div
        className="relative flex flex-col items-center"
        style={{ cursor: base ? "pointer" : "default", opacity: dimmed ? 0.15 : 1, transition: "opacity 0.35s ease" }}
        onClick={(e) => { e.stopPropagation(); if (base) onClick(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hover data card */}
        {hovered && (
          <div
            className="absolute z-50 rounded-xl border border-gray-200 shadow-lg p-3 text-xs font-mono text-gray-800 whitespace-nowrap"
            style={{
              bottom: size + 28,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              pointerEvents: "none",
              minWidth: 180,
            }}
          >
            <div className="font-bold text-[11px] mb-1.5" style={{ color: MILITARY_GREEN }}>{icao} — {id.replace("_", " ")}</div>
            <div className="space-y-1 text-[10px] text-gray-600">
              <div className="flex justify-between gap-4">
                <span>Beredskap</span>
                <span className="font-bold" style={{ color: readinessColor }}>{pct}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Bana</span>
                <span className="font-bold" style={{ color: runwayStatusColor }}>{runwayStatusLabel}</span>
              </div>
              {activeUnits.length > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  {activeUnits.map((u) => (
                    <div key={u} className="text-[9px] text-gray-500">{u}</div>
                  ))}
                </div>
              )}
              {base && (
                <div className="flex justify-between gap-4 pt-1 border-t border-gray-100">
                  <span>Bränsle</span>
                  <span className="font-bold" style={{ color: fuelColor(base.fuel) }}>{base.fuel}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottleneck dashed warning ring */}
        {isBottleneck && (
          <div
            className="absolute rounded-full"
            style={{
              width: size + 10,
              height: size + 10,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px dashed #DC2626",
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />
        )}

        {/* Circle body */}
        <div
          className={`rounded-full flex items-center justify-center ${flygvapnetMode ? "airbase-pulse" : ""}`}
          style={{
            width: size,
            height: size,
            background: "#ffffff",
            border: `${isSelected ? 3 : isMainBase ? 2.5 : 2}px solid ${base ? readinessColor : MILITARY_GREEN}`,
            opacity: base ? 1 : 0.5,
            boxShadow: isSelected
              ? `0 0 0 3px ${MILITARY_GREEN}33, 0 4px 16px rgba(45,90,39,0.35)`
              : `0 2px 10px rgba(45,90,39,0.25)`,
            transform: isSelected ? "scale(1.18)" : "scale(1)",
            transition: "transform 0.25s ease-out, box-shadow 0.25s ease-out",
          }}
        >
          <span
            className="font-mono font-bold"
            style={{
              fontSize: isMainBase ? 11 : 8,
              color: base ? readinessColor : MILITARY_GREEN,
              letterSpacing: "0.04em",
            }}
          >
            {id.replace("_", " ")}
          </span>
        </div>

        {/* MC count badge */}
        {base && mc > 0 && (
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: 17,
              height: 17,
              top: -3,
              right: -5,
              background: "#EFF6FF",
              border: "1.5px solid #2563eb",
            }}
          >
            <span className="text-[8px] font-bold text-blue-600 font-mono">{mc}</span>
          </div>
        )}

        {/* On-mission badge */}
        {base && onMission > 0 && (
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: 16,
              height: 16,
              top: -3,
              left: -5,
              background: "#F0FDF4",
              border: "1.5px solid #22c55e",
            }}
          >
            <span className="text-[7px] font-bold text-green-600 font-mono">{onMission}</span>
          </div>
        )}

        {/* ICAO label */}
        <span
          className="font-mono mt-1"
          style={{
            fontSize: 9,
            color: MILITARY_GREEN,
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          {icao}
        </span>

        {/* Fuel bar */}
        {base && (
          <div
            className="rounded-full overflow-hidden mt-0.5"
            style={{ width: 36, height: 3, background: "#E5E7EB" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${base.fuel}%`,
                backgroundColor: fuelColor(base.fuel),
              }}
            />
          </div>
        )}
      </div>
    </Marker>
  );
}
