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

  const RADAR_TEAL = '#22c55e';
  const RADAR_AMBER = '#D7AB3A';
  const RADAR_GREY = '#6B7280';

  // Graticule 25/50/75% — operational only
  const graticuleGeoJSON = useMemo(() => {
    if (!showCoverage) return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
    const features: GeoJSON.Feature[] = [];
    units
      .filter((u) => u.status === 'operational')
      .forEach((u) => {
        const pos = draggingUnitId === u.id && dragPos ? dragPos : u.position;
        [0.25, 0.5, 0.75].forEach((frac) => {
          const c = createCircleGeoJSON(pos, u.rangeRadius * frac);
          features.push({ ...c, properties: { id: u.id, frac } });
        });
      });
    return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
  }, [units, draggingUnitId, dragPos, showCoverage]);

  // Coverage GeoJSON — every unit (including maintenance) so coverage gaps are visible
  const coverageGeoJSON = useMemo(() => {
    if (!showCoverage) return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;

    const features = units.map((u) => {
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

  return (
    <>
      {/* Graticule — thin 25/50/75% range rings */}
      <Source id="radar-src-graticule" type="geojson" data={graticuleGeoJSON}>
        <Layer
          id="radar-graticule-line"
          type="line"
          paint={{
            'line-color': RADAR_TEAL,
            'line-width': 0.75,
            'line-opacity': 0.22,
            'line-dasharray': [2, 4],
          }}
        />
      </Source>

      <Source id="radar-src-outer-all" type="geojson" data={coverageGeoJSON}>
        <Layer
          id="radar-fill-layer-all"
          type="fill"
          paint={{
            'fill-color': [
              'match', ['get', 'status'],
              'operational', RADAR_TEAL,
              'standby', RADAR_AMBER,
              'maintenance', RADAR_GREY,
              RADAR_TEAL,
            ],
            'fill-opacity': [
              'match', ['get', 'status'],
              'operational', 0.04,
              'standby', 0.02,
              'maintenance', 0,
              0,
            ],
          }}
        />

        <Layer
          id="radar-stroke-layer-all"
          type="line"
          paint={{
            'line-color': [
              'match', ['get', 'status'],
              'operational', RADAR_TEAL,
              'standby', RADAR_AMBER,
              'maintenance', RADAR_GREY,
              RADAR_TEAL,
            ],
            'line-width': 1.5,
            'line-opacity': [
              'match', ['get', 'status'],
              'operational', 0.85,
              'standby', 0.55,
              'maintenance', 0.4,
              0.85,
            ],
            'line-dasharray': [
              'case',
              ['==', ['get', 'status'], 'standby'], ['literal', [4, 3]],
              ['==', ['get', 'status'], 'maintenance'], ['literal', [1, 4]],
              ['literal', [1, 0]],
            ],
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
