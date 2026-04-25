import React, { useState, useCallback } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { ExtendedRadarUnit } from '../../types/radarUnit';

interface RadarMarkerProps {
  unit: ExtendedRadarUnit;
  zoom: number;
  onDrag: (position: { lat: number; lng: number }) => void;
  onDragEnd: (id: string, position: { lat: number; lng: number }) => void;
  onClick: (unit: ExtendedRadarUnit) => void;
}

export const RadarMarker: React.FC<RadarMarkerProps> = ({
  unit,
  onDrag,
  onDragEnd,
  onClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos,    setDragPos]    = useState(unit.position);

  const handleDragStart = useCallback(() => setIsDragging(true), []);

  const handleDrag = useCallback((evt: any) => {
    const pos = { lat: evt.lngLat.lat, lng: evt.lngLat.lng };
    setDragPos(pos);
    onDrag(pos);
  }, [onDrag]);

  const handleDragEnd = useCallback((evt: any) => {
    setIsDragging(false);
    const pos = { lat: evt.lngLat.lat, lng: evt.lngLat.lng };
    onDragEnd(unit.id, pos);
  }, [unit.id, onDragEnd]);

  return (
    <Marker
      longitude={isDragging ? dragPos.lng : unit.position.lng}
      latitude={isDragging ? dragPos.lat : unit.position.lat}
      anchor="center"
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.originalEvent.stopPropagation(); onClick(unit); }}
    >
      <div className="relative flex items-center justify-center cursor-pointer group">
        {/* Invisible hit-area — pulse rendering is handled by RadarPulseLayer canvas */}
        <div style={{ width: 20, height: 20 }} />
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 font-mono border border-slate-700">
          {unit.name}
        </div>
      </div>
    </Marker>
  );
};
