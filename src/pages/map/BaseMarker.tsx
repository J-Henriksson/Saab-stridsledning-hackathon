import { Marker } from "react-map-gl/maplibre";
import { Base } from "@/types/game";
import { statusColor, fuelColor } from "./helpers";
import { BASE_COORDS } from "./constants";

export function BaseMarker({
  id,
  base,
  isSelected,
  onClick,
}: {
  id: string;
  base: Base | undefined;
  isSelected: boolean;
  onClick: () => void;
}) {
  const coords = BASE_COORDS[id];
  if (!coords) return null;

  const color = statusColor(base);
  const isMainBase = id === "MOB";
  const size = isMainBase ? 46 : 34;
  const mc = base ? base.aircraft.filter((a) => a.status === "ready").length : 0;
  const onMission = base ? base.aircraft.filter((a) => a.status === "on_mission").length : 0;
  const isBottleneck = base && (
    mc / base.aircraft.length < 0.4 ||
    base.maintenanceBays.occupied >= base.maintenanceBays.total ||
    base.fuel < 20
  );

  return (
    <Marker longitude={coords.lng} latitude={coords.lat} anchor="center">
      <div
        className="relative flex flex-col items-center"
        style={{ cursor: base ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          if (base) onClick();
        }}
      >
        {/* Outer glow */}
        {base && (
          <div
            className="absolute rounded-full"
            style={{
              width: size + 20,
              height: size + 20,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${color}33 0%, ${color}11 40%, transparent 70%)`,
              animation: "pulse 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Bottleneck ring */}
        {isBottleneck && (
          <div
            className="absolute rounded-full"
            style={{
              width: size + 10,
              height: size + 10,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              border: "2.5px dashed #ef4444",
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
        )}

        {/* Circle body */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: size,
            height: size,
            background: base
              ? `radial-gradient(circle at 50% 40%, #1a2744, #0f172a)`
              : "#0a0f1a",
            border: `${isSelected ? 2.5 : isMainBase ? 2.5 : 1.8}px solid ${base ? color : "#1e293b"}`,
            opacity: base ? 1 : 0.4,
            boxShadow: isSelected
              ? `0 0 18px ${color}88, 0 0 36px ${color}44, inset 0 0 8px ${color}22`
              : base ? `0 0 8px ${color}44` : "none",
            transform: isSelected ? "scale(1.18)" : "scale(1)",
            transition: "transform 0.25s ease-out, box-shadow 0.25s ease-out",
          }}
        >
          <span
            className="font-mono font-bold"
            style={{
              fontSize: isMainBase ? 12 : 9,
              color: base ? color : "#334155",
              textShadow: base ? `0 0 6px ${color}88` : "none",
              letterSpacing: "0.05em",
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
              width: 18,
              height: 18,
              top: -2,
              right: -6,
              background: "#1e3a5f",
              border: "1px solid #2563eb",
              boxShadow: "0 0 6px #2563eb66",
            }}
          >
            <span className="text-[8px] font-bold text-blue-400 font-mono">{mc}</span>
          </div>
        )}

        {/* On-mission badge */}
        {base && onMission > 0 && (
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: 16,
              height: 16,
              top: -2,
              left: -6,
              background: "#0f2e1a",
              border: "1px solid #22c55e",
              boxShadow: "0 0 6px #22c55e66",
            }}
          >
            <span className="text-[7px] font-bold text-green-500 font-mono">{onMission}</span>
          </div>
        )}

        {/* Label */}
        <span
          className="font-mono mt-1"
          style={{
            fontSize: base ? 10 : 8,
            color: base ? "#94a3b8" : "#334155",
            textShadow: base ? "0 0 4px #0008" : "none",
          }}
        >
          {id}
        </span>

        {/* Fuel bar */}
        {base && (
          <div
            className="rounded-full overflow-hidden mt-0.5"
            style={{ width: 36, height: 3, background: "#1e293b" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${base.fuel}%`,
                backgroundColor: fuelColor(base.fuel),
                boxShadow: `0 0 4px ${fuelColor(base.fuel)}88`,
              }}
            />
          </div>
        )}
      </div>
    </Marker>
  );
}
