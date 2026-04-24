import { useState, useCallback } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import { X } from "lucide-react";
import * as turf from "@turf/turf";
import type { RoadBase, RoadBaseStatus, RoadBaseEchelon, GameAction } from "@/types/game";

const MILITARY_GREEN = "#2D5A27";

const STATUSES: { value: RoadBaseStatus; label: string }[] = [
  { value: "Beredskap", label: "Beredskap" },
  { value: "Operativ",  label: "Operativ"  },
  { value: "Underhåll", label: "Underhåll" },
];

const ECHELONS: { value: RoadBaseEchelon; label: string }[] = [
  { value: "Group",    label: "Grupp"   },
  { value: "Platoon",  label: "Pluton"  },
  { value: "Battalion",label: "Bataljon"},
];

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

function makeCircleGeoJSON(lng: number, lat: number, radiusKm: number): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [turf.circle([lng, lat], radiusKm, { steps: 64, units: "kilometers" })],
  };
}

interface Props {
  roadBase: RoadBase;
  isPlanMode: boolean;
  dispatch: (action: GameAction) => void;
}

export function RoadBaseMarker({ roadBase, isPlanMode, dispatch }: Props) {
  const [liveCoords, setLiveCoords] = useState(roadBase.coords);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState(false);

  // Editable local state for the popup (synced from prop changes)
  const [editName, setEditName]           = useState(roadBase.name);
  const [editStatus, setEditStatus]       = useState<RoadBaseStatus>(roadBase.status);
  const [editEchelon, setEditEchelon]     = useState<RoadBaseEchelon>(roadBase.echelon);
  const [editParent, setEditParent]       = useState(roadBase.parentBaseId);
  const [editRange, setEditRange]         = useState(roadBase.rangeRadius);

  const handleDrag = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    setLiveCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setLiveCoords(coords);
      setIsDragging(false);
      dispatch({ type: "PLAN_UPDATE_COORDS_ROAD_BASE", id: roadBase.id, coords });
    },
    [dispatch, roadBase.id]
  );

  function commitEdit(updates: Partial<Omit<typeof roadBase, "id" | "createdAt" | "isDraggable">>) {
    dispatch({ type: "PLAN_EDIT_ROAD_BASE", id: roadBase.id, updates });
  }

  const showCircle = selected || isDragging;
  const circleCoords = isDragging ? liveCoords : roadBase.coords;
  const sourceId    = `rob-range-${roadBase.id}`;
  const fillLayerId = `rob-range-fill-${roadBase.id}`;
  const lineLayerId = `rob-range-line-${roadBase.id}`;

  const statusColor =
    roadBase.status === "Operativ"  ? "#16a34a" :
    roadBase.status === "Beredskap" ? "#d97706" :
                                      "#6b7280";

  return (
    <>
      {showCircle && (
        <Source id={sourceId} type="geojson" data={makeCircleGeoJSON(circleCoords.lng, circleCoords.lat, editRange)}>
          <Layer id={fillLayerId} type="fill" paint={{ "fill-color": MILITARY_GREEN, "fill-opacity": 0.12 }} />
          <Layer id={lineLayerId} type="line" paint={{ "line-color": MILITARY_GREEN, "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [4, 3] }} />
        </Source>
      )}

      <Marker
        longitude={liveCoords.lng}
        latitude={liveCoords.lat}
        anchor="center"
        draggable={isPlanMode && roadBase.isDraggable}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        <div className="relative flex flex-col items-center">
          {/* Clickable icon */}
          <div
            className={`cursor-pointer ${isPlanMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
            onClick={(e) => { e.stopPropagation(); setSelected((v) => !v); }}
          >
            <RoadBaseIcon echelon={roadBase.echelon} pulse={roadBase.status === "Operativ"} />
            <span className="font-mono font-bold mt-0.5 block text-center" style={{ fontSize: 9, color: MILITARY_GREEN, letterSpacing: "0.05em" }}>
              {roadBase.name}
            </span>
          </div>

          {/* Info / edit popup on click */}
          {selected && !isDragging && (
            <div
              className="absolute z-50 rounded-xl border border-gray-200 shadow-xl p-3 text-xs font-mono text-gray-800"
              style={{
                bottom: 46,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(255,255,255,0.97)",
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                minWidth: 200,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[11px]" style={{ color: MILITARY_GREEN }}>Vägbas</span>
                <button onClick={() => setSelected(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {isPlanMode ? (
                  <>
                    {/* Editable fields */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">Namn</span>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => commitEdit({ name: editName })}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-800"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">Status</span>
                      <select
                        value={editStatus}
                        onChange={(e) => { const v = e.target.value as RoadBaseStatus; setEditStatus(v); commitEdit({ status: v }); }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-800"
                      >
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">Echelon</span>
                      <select
                        value={editEchelon}
                        onChange={(e) => { const v = e.target.value as RoadBaseEchelon; setEditEchelon(v); commitEdit({ echelon: v }); }}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-800"
                      >
                        {ECHELONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">Förband</span>
                      <input
                        value={editParent}
                        onChange={(e) => setEditParent(e.target.value)}
                        onBlur={() => commitEdit({ parentBaseId: editParent })}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-800"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">Räckvidd</span>
                      <input
                        type="number" min={1} max={100}
                        value={editRange}
                        onChange={(e) => setEditRange(Number(e.target.value))}
                        onBlur={() => commitEdit({ rangeRadius: editRange })}
                        className="w-14 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-800 text-right"
                      />
                      <span className="text-[10px] text-gray-500">km</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Read-only display */}
                    {[
                      { label: "Namn",     value: roadBase.name },
                      { label: "Status",   value: roadBase.status },
                      { label: "Echelon",  value: roadBase.echelon },
                      { label: "Förband",  value: roadBase.parentBaseId },
                      { label: "Räckvidd", value: `${roadBase.rangeRadius} km` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-[10px] text-gray-500">{label}</span>
                        <span className="text-[10px] font-bold" style={label === "Status" ? { color: statusColor } : undefined}>{value}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Marker>
    </>
  );
}
