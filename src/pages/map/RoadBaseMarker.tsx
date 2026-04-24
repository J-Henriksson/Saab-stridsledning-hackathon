import { useState, useCallback } from "react";
import { Marker } from "react-map-gl/maplibre";
import type { RoadBase, GameAction } from "@/types/game";

const MILITARY_GREEN = "#2D5A27";

function EchelonMark({ echelon }: { echelon: RoadBase["echelon"] }) {
  if (echelon === "Group") {
    return (
      <>
        <circle cx="11" cy="5" r="2" fill={MILITARY_GREEN} />
        <circle cx="17" cy="5" r="2" fill={MILITARY_GREEN} />
      </>
    );
  }
  if (echelon === "Platoon") {
    return <circle cx="14" cy="5" r="2" fill={MILITARY_GREEN} />;
  }
  return (
    <text x="14" y="7" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="bold" fill={MILITARY_GREEN}>
      I
    </text>
  );
}

function RoadBaseIcon({ echelon, pulse }: { echelon: RoadBase["echelon"]; pulse: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className={pulse ? "animate-pulse" : undefined}>
      <EchelonMark echelon={echelon} />
      <rect x="4" y="10" width="20" height="14" fill={MILITARY_GREEN} fillOpacity={0.15} stroke={MILITARY_GREEN} strokeWidth={1.5} rx="1" />
      <line x1="5"  y1="21" x2="23" y2="21" stroke={MILITARY_GREEN} strokeWidth={1.5} />
      <line x1="14" y1="12" x2="14" y2="20" stroke={MILITARY_GREEN} strokeWidth={1.2} />
      <line x1="8"  y1="15" x2="20" y2="15" stroke={MILITARY_GREEN} strokeWidth={1.2} />
      <line x1="11" y1="19" x2="17" y2="19" stroke={MILITARY_GREEN} strokeWidth={1.0} />
    </svg>
  );
}

interface Props {
  roadBase: RoadBase;
  isPlanMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  dispatch: (action: GameAction) => void;
}

export function RoadBaseMarker({ roadBase, isPlanMode, isSelected, onSelect, dispatch }: Props) {
  const [liveCoords, setLiveCoords] = useState(roadBase.coords);

  const handleDrag = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    setLiveCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
  }, []);

  const handleDragEnd = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setLiveCoords(coords);
      dispatch({ type: "PLAN_UPDATE_COORDS_ROAD_BASE", id: roadBase.id, coords });
    },
    [dispatch, roadBase.id]
  );

  return (
    <Marker
      longitude={liveCoords.lng}
      latitude={liveCoords.lat}
      anchor="center"
      draggable={isPlanMode && roadBase.isDraggable}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`flex flex-col items-center ${isPlanMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <div style={isSelected ? { filter: "drop-shadow(0 0 5px #2D5A27)" } : undefined}>
          <RoadBaseIcon echelon={roadBase.echelon} pulse={roadBase.status === "Operativ"} />
        </div>
        <span
          className="font-mono font-bold mt-0.5 block text-center"
          style={{ fontSize: 9, color: MILITARY_GREEN, letterSpacing: "0.05em" }}
        >
          {roadBase.name}
        </span>
      </div>
    </Marker>
  );
}
