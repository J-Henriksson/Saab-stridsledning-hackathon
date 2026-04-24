import React, { useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { ExtendedRadarUnit } from '../../types/radarUnit';
import { RadarMarker } from './RadarMarker';
import { createCircleGeoJSON } from '../../utils/geoDistance';

interface RadarLayerProps {
  units: ExtendedRadarUnit[];
  zoom: number;
  onUpdateUnit: (id: string, updates: Partial<ExtendedRadarUnit>) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showCoverage?: boolean;
}

export const RadarLayer: React.FC<RadarLayerProps> = ({
  units,
  zoom,
  onUpdateUnit,
  selectedId,
  onSelect,
  showCoverage = true,
}) => {
  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleMarkerClick = (unit: ExtendedRadarUnit) => {
    onSelect(unit.id);
  };

  const handleDrag = (id: string, position: { lat: number; lng: number }) => {
    setDraggingUnitId(id);
    setDragPos(position);
  };

  const handleDragEnd = (id: string, position: { lat: number; lng: number }) => {
    setDraggingUnitId(null);
    setDragPos(null);
    onUpdateUnit(id, { position });
  };

  const radarTeal = '#00E5C7';

  // 1. Consolidated coverage GeoJSON (Outer Rings)
  const coverageGeoJSON = useMemo(() => {
    if (!showCoverage) return { type: 'FeatureCollection', features: [] };

    const features = units
      .filter((u) => u.status !== 'maintenance')
      .map((u) => {
        const pos = draggingUnitId === u.id && dragPos ? dragPos : u.position;
        const circle = createCircleGeoJSON(pos, u.rangeRadius);
        return {
          ...circle,
          properties: {
            id: u.id,
            status: u.status,
          },
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;
  }, [units, draggingUnitId, dragPos, showCoverage]);

  // 2. Consolidated detection GeoJSON (Inner Rings)
  const innerRingsGeoJSON = useMemo(() => {
    if (!showCoverage) return { type: 'FeatureCollection', features: [] };

    const features = units
      .filter((u) => u.status === 'operational' && u.detectedContactIds.length > 0)
      .map((u) => {
        const pos = draggingUnitId === u.id && dragPos ? dragPos : u.position;
        const circle = createCircleGeoJSON(pos, u.rangeRadius * 0.15);
        return {
          ...circle,
          properties: {
            id: u.id,
          },
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection;
  }, [units, draggingUnitId, dragPos, showCoverage]);

  return (
    <>
      <Source id="radar-src-outer-all" type="geojson" data={coverageGeoJSON}>
        {/* Background Fill - High contrast */}
        <Layer
          id="radar-fill-layer-all"
          type="fill"
          paint={{
            'fill-color': radarTeal,
            'fill-opacity': [
              'case',
              ['==', ['get', 'status'], 'operational'],
              0.08, // Increased opacity
              0.04
            ],
          }}
        />

        {/* White Outline "Halo" for contrast against water/land */}
        <Layer
          id="radar-stroke-halo-all"
          type="line"
          paint={{
            'line-color': '#FFFFFF',
            'line-width': 5,
            'line-opacity': 0.3,
          }}
        />
        
        {/* Main Glow Layer */}
        <Layer
          id="radar-glow-layer-all"
          type="line"
          paint={{
            'line-color': radarTeal,
            'line-width': 8,
            'line-opacity': 0.2,
            'line-blur': 6,
          }}
        />

        {/* Primary Tactical Stroke */}
        <Layer
          id="radar-stroke-layer-all"
          type="line"
          paint={{
            'line-color': radarTeal,
            'line-width': 3,
            'line-opacity': [
              'case',
              ['==', ['get', 'status'], 'standby'],
              0.5,
              1.0 // FULL opacity for operational
            ],
            'line-dasharray': [
              'case',
              ['==', ['get', 'status'], 'standby'],
              ['literal', [4, 3]],
              ['literal', [1, 0]]
            ],
          }}
        />
      </Source>

      {/* Threat Rings */}
      <Source id="radar-src-inner-all" type="geojson" data={innerRingsGeoJSON}>
        <Layer
          id="radar-inner-stroke-all"
          type="line"
          paint={{
            'line-color': '#FF3B3B',
            'line-width': 4,
            'line-opacity': 0.9,
            'line-dasharray': [2, 2],
          }}
        />
      </Source>

      {/* Markers */}
      {units.map((unit) => (
        <RadarMarker
          key={unit.id}
          unit={unit}
          zoom={zoom}
          onDrag={(pos) => handleDrag(unit.id, pos)}
          onDragEnd={handleDragEnd}
          onClick={handleMarkerClick}
        />
      ))}
    </>
  );
};
