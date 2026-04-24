import { useEffect, useMemo, useState } from "react";
import { Layer, Marker, Source } from "react-map-gl/maplibre";
import type { Base, GameAction } from "@/types/game";
import { BASE_COORDS } from "./constants";
import { getAircraft } from "@/core/units/helpers";
import gripenSilhouette from "@/assets/gripen-silhouette.png";
import type { TacticalZone } from "@/types/overlay";
import { useIncursionDetection } from "./useIncursionDetection";

const REBASE_VISUAL_PERIOD = 350;
const VISIBLE_AIRBORNE_STATUSES = new Set(["on_mission", "returning"]);
const PATROL_HISTORY_SECONDS = 12;
const PATROL_FUTURE_SECONDS = 8;
const TRACK_SAMPLE_COUNT = 28;

interface AircraftPosition {
  id: string;
  baseId: string;
  homeBaseId: string;
  callsign?: string;
  lng: number;
  lat: number;
  angle: number;
  isRebase?: boolean;
  radarActive?: boolean;
  radarRangeKm?: number;
  radarAzimuthHalfDeg?: number;
  isTargeted?: boolean;
  pastTrackCoordinates: [number, number][];
  futureTrajectoryCoordinates: [number, number][];
  destination?: { lat: number; lng: number };
}

function normalizeAngle(angleDeg: number) {
  return ((angleDeg % 360) + 360) % 360;
}

function computeHeading(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return normalizeAngle((Math.atan2(y, x) * 180) / Math.PI);
}

function hashNumber(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function projectCoordinate(
  origin: { lat: number; lng: number },
  bearingDeg: number,
  distanceKm: number,
) {
  const angularDistance = distanceKm / 6371;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

function buildSectorPolygon(
  center: { lat: number; lng: number },
  headingDeg: number,
  rangeKm: number,
  halfAngleDeg: number,
) {
  const start = headingDeg - halfAngleDeg;
  const end = headingDeg + halfAngleDeg;
  const steps = 18;
  const coordinates: [number, number][] = [[center.lng, center.lat]];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = start + ((end - start) * index) / steps;
    const point = projectCoordinate(center, bearing, rangeKm);
    coordinates.push([point.lng, point.lat]);
  }

  coordinates.push([center.lng, center.lat]);
  return coordinates;
}

function projectRelativeOffset(
  anchor: { lat: number; lng: number },
  headingDeg: number,
  forwardKm: number,
  lateralKm: number,
) {
  const heading = normalizeAngle(headingDeg);
  const forwardPoint =
    Math.abs(forwardKm) > 0.001
      ? projectCoordinate(
          anchor,
          forwardKm >= 0 ? heading : normalizeAngle(heading + 180),
          Math.abs(forwardKm),
        )
      : anchor;

  if (Math.abs(lateralKm) <= 0.001) return forwardPoint;

  const lateralBearing =
    lateralKm >= 0
      ? normalizeAngle(heading + 90)
      : normalizeAngle(heading - 90);

  return projectCoordinate(forwardPoint, lateralBearing, Math.abs(lateralKm));
}

function getPatrolPattern(id: string, headingDeg: number, speedKt: number) {
  const seed = hashNumber(id);
  const baseHeading = headingDeg || (seed % 360);
  const majorAxisKm = Math.max(5.5, Math.min(15, 6 + (speedKt / 115) + (seed % 5) * 1.1));
  const minorAxisKm = Math.max(1.8, Math.min(6.5, majorAxisKm * 0.38));
  const angularVelocity = 0.16 + Math.min(0.2, speedKt / 2400) + (seed % 7) * 0.004;
  const startPhase = (seed % 19) * 0.28;

  return { baseHeading, majorAxisKm, minorAxisKm, angularVelocity, startPhase };
}

function samplePatrolPosition(
  anchor: { lat: number; lng: number },
  aircraftId: string,
  headingDeg: number,
  speedKt: number,
  phase: number,
) {
  const pattern = getPatrolPattern(aircraftId, headingDeg, speedKt);
  const theta = phase * pattern.angularVelocity + pattern.startPhase;
  const current = projectRelativeOffset(
    anchor,
    pattern.baseHeading,
    Math.cos(theta) * pattern.majorAxisKm,
    Math.sin(theta) * pattern.minorAxisKm,
  );
  const next = projectRelativeOffset(
    anchor,
    pattern.baseHeading,
    Math.cos(theta + 0.03) * pattern.majorAxisKm,
    Math.sin((theta + 0.03) * pattern.minorAxisKm / pattern.minorAxisKm) * pattern.minorAxisKm,
  );

  return {
    lat: current.lat,
    lng: current.lng,
    angle: computeHeading(current, next),
  };
}

function buildPatrolTrack(
  anchor: { lat: number; lng: number },
  aircraftId: string,
  headingDeg: number,
  speedKt: number,
  phase: number,
  fromOffset: number,
  toOffset: number,
) {
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= TRACK_SAMPLE_COUNT; index += 1) {
    const offset = fromOffset + ((toOffset - fromOffset) * index) / TRACK_SAMPLE_COUNT;
    const point = samplePatrolPosition(anchor, aircraftId, headingDeg, speedKt, phase + offset);
    coordinates.push([point.lng, point.lat]);
  }

  return coordinates;
}

function sampleBaseOrbitPosition(
  center: { lat: number; lng: number },
  orbitIndex: number,
  phase: number,
) {
  const baseAngle = (orbitIndex * 137.5) % 360;
  const orbitRadius = 0.35 + (orbitIndex % 3) * 0.15;
  const orbitSpeed = 4.32 + (orbitIndex % 4) * 1.62;
  const currentAngle = baseAngle + phase * orbitSpeed;
  const rad = (currentAngle * Math.PI) / 180;
  const lng = center.lng + Math.cos(rad) * orbitRadius;
  const lat = center.lat + Math.sin(rad) * orbitRadius * 0.6;
  const vx = -Math.sin(rad);
  const vy = -Math.cos(rad) * 0.6;
  const angle = Math.atan2(vy, vx) * (180 / Math.PI);

  return { lat, lng, angle };
}

function buildBaseOrbitTrack(
  center: { lat: number; lng: number },
  orbitIndex: number,
  phase: number,
  fromOffset: number,
  toOffset: number,
) {
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= TRACK_SAMPLE_COUNT; index += 1) {
    const offset = fromOffset + ((toOffset - fromOffset) * index) / TRACK_SAMPLE_COUNT;
    const point = sampleBaseOrbitPosition(center, orbitIndex, phase + offset);
    coordinates.push([point.lng, point.lat]);
  }

  return coordinates;
}

function buildRebaseTrack(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  startProgress: number,
  endProgress: number,
) {
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= TRACK_SAMPLE_COUNT; index += 1) {
    const progress = startProgress + ((endProgress - startProgress) * index) / TRACK_SAMPLE_COUNT;
    coordinates.push([
      origin.lng + (destination.lng - origin.lng) * progress,
      origin.lat + (destination.lat - origin.lat) * progress,
    ]);
  }

  return coordinates;
}

export function AircraftLayer({
  bases,
  currentHour,
  onSelectAircraft,
  selectedAircraftId,
  onPositionUpdate,
  tacticalZones,
  dispatch,
}: {
  bases: Base[];
  currentHour?: number;
  currentDay?: number;
  onSelectAircraft?: (baseId: string, aircraftId: string) => void;
  selectedAircraftId?: string;
  onPositionUpdate?: (lng: number, lat: number) => void;
  tacticalZones?: TacticalZone[];
  dispatch?: (action: GameAction) => void;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      setPhase(((now - startedAt) / 1000) % 360);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const aircraftPositions = useMemo(() => {
    const positions: AircraftPosition[] = [];

    for (const base of bases) {
      const baseCoords = BASE_COORDS[base.id];
      if (!baseCoords) continue;

      const visibleAircraft = getAircraft(base).filter((aircraft) =>
        VISIBLE_AIRBORNE_STATUSES.has(aircraft.status),
      );

      let orbitIndex = 0;
      for (const aircraft of visibleAircraft) {
        const homeBaseId = aircraft.homeBaseId ?? base.id;
        const actualOffset =
          Math.abs((aircraft.position?.lat ?? baseCoords.lat) - baseCoords.lat) +
          Math.abs((aircraft.position?.lng ?? baseCoords.lng) - baseCoords.lng);
        const isRebase = aircraft.currentMission === "REBASE" && !!aircraft.rebaseTarget;

        const dest = aircraft.movement.destination;
        const resolvedDest = typeof dest === "string" ? BASE_COORDS[dest] : dest;

        // FORCE airborne logic for anyone on mission/returning
        const forceAirborne = aircraft.status === "on_mission" || aircraft.status === "returning";

        if (aircraft.movement.state === "airborne" || forceAirborne) {
          const heading = aircraft.movement.heading ?? 0;
          
          // Use actual position from engine, add tiny jitter for 'life'
          const jitterTheta = phase * 0.1;
          const currentLng = (aircraft.position?.lng ?? baseCoords.lng) + Math.cos(jitterTheta) * 0.0005;
          const currentLat = (aircraft.position?.lat ?? baseCoords.lat) + Math.sin(jitterTheta) * 0.0005;
          
          const aircraftHeading = resolvedDest 
            ? computeHeading({ lat: currentLat, lng: currentLng }, resolvedDest)
            : heading;

          // Build tracks: from launch base to current, and from current to destination
          const pastTrack: [number, number][] = [
            [baseCoords.lng, baseCoords.lat],
            [currentLng, currentLat]
          ];
          const futureTrack: [number, number][] = resolvedDest ? [
            [currentLng, currentLat],
            [resolvedDest.lng, resolvedDest.lat]
          ] : [];

          positions.push({
            id: aircraft.id,
            baseId: base.id,
            homeBaseId,
            callsign: aircraft.callsign,
            lng: currentLng,
            lat: currentLat,
            angle: aircraftHeading,
            isRebase: isRebase,
            radarActive: aircraft.radarActive,
            radarRangeKm: aircraft.radarRangeKm,
            radarAzimuthHalfDeg: aircraft.radarAzimuthHalfDeg,
            isTargeted: aircraft.isTargeted,
            pastTrackCoordinates: pastTrack,
            futureTrajectoryCoordinates: futureTrack,
            destination: resolvedDest,
          });
          continue;
        }

        const current = sampleBaseOrbitPosition(baseCoords, orbitIndex, phase);

        positions.push({
          id: aircraft.id,
          baseId: base.id,
          homeBaseId,
          callsign: aircraft.callsign,
          lng: current.lng,
          lat: current.lat,
          angle: current.angle,
          isRebase: false,
          radarActive: aircraft.radarActive,
          radarRangeKm: aircraft.radarRangeKm,
          radarAzimuthHalfDeg: aircraft.radarAzimuthHalfDeg,
          isTargeted: aircraft.isTargeted,
          pastTrackCoordinates: buildBaseOrbitTrack(
            baseCoords,
            orbitIndex,
            phase,
            -PATROL_HISTORY_SECONDS,
            0,
          ),
          futureTrajectoryCoordinates: buildBaseOrbitTrack(
            baseCoords,
            orbitIndex,
            phase,
            0,
            PATROL_FUTURE_SECONDS,
          ),
          destination: resolvedDest,
        });
        orbitIndex += 1;
      }
    }

    return positions;
  }, [bases, phase]);

  useEffect(() => {
    if (!selectedAircraftId || !onPositionUpdate) return;
    const position = aircraftPositions.find((item) => item.id === selectedAircraftId);
    if (position) onPositionUpdate(position.lng, position.lat);
  }, [aircraftPositions, selectedAircraftId, onPositionUpdate]);

  const restrictedZones = useMemo(
    () =>
      (tacticalZones ?? []).filter(
        (zone) =>
          zone.userType === "restricted" ||
          zone.fixedType === "no_fly" ||
          zone.fixedType === "high_security",
      ),
    [tacticalZones],
  );

  useIncursionDetection({
    aircraftPoints: aircraftPositions.map((position) => ({
      id: position.id,
      tailNumber: position.callsign ?? position.id,
      lng: position.lng,
      lat: position.lat,
    })),
    restrictedZones,
    dispatch: dispatch ?? (() => {}),
    currentHour: currentHour ?? 0,
  });

  const baseLinkGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions
        .map((position) => {
          const homeBaseCoords = BASE_COORDS[position.homeBaseId];
          if (!homeBaseCoords) return null;

          return {
            type: "Feature" as const,
            properties: {
              id: position.id,
              selected: position.id === selectedAircraftId,
            },
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [homeBaseCoords.lng, homeBaseCoords.lat],
                [position.lng, position.lat],
              ],
            },
          };
        })
        .filter(Boolean),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  const destinationLinkGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions
        .map((position) => {
          if (!position.destination) return null;

          return {
            type: "Feature" as const,
            properties: {
              id: position.id,
              selected: position.id === selectedAircraftId,
            },
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [position.lng, position.lat],
                [position.destination.lng, position.destination.lat],
              ],
            },
          };
        })
        .filter(Boolean),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  const destinationMarkerGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions
        .map((position) => {
          if (!position.destination) return null;

          return {
            type: "Feature" as const,
            properties: {
              id: position.id,
              selected: position.id === selectedAircraftId,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [position.destination.lng, position.destination.lat],
            },
          };
        })
        .filter(Boolean),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  const pastTracksGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions.map((position) => ({
        type: "Feature" as const,
        properties: {
          id: position.id,
          selected: position.id === selectedAircraftId,
          targeted: !!position.isTargeted,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: position.pastTrackCoordinates,
        },
      })),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  const futureTrajectoryGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions.map((position) => ({
        type: "Feature" as const,
        properties: {
          id: position.id,
          selected: position.id === selectedAircraftId,
          targeted: !!position.isTargeted,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: position.futureTrajectoryCoordinates,
        },
      })),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  const radarConeGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: aircraftPositions
        .filter(
          (position) =>
            position.radarActive &&
            position.radarRangeKm &&
            position.radarAzimuthHalfDeg,
        )
        .map((position) => ({
          type: "Feature" as const,
          properties: {
            id: position.id,
            selected: position.id === selectedAircraftId,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[
              ...buildSectorPolygon(
                { lat: position.lat, lng: position.lng },
                position.angle,
                position.radarRangeKm!,
                position.radarAzimuthHalfDeg!,
              ),
            ]],
          },
        })),
    }),
    [aircraftPositions, selectedAircraftId],
  );

  return (
    <>
      <Source id="aircraft-home-base-links" type="geojson" data={baseLinkGeojson}>
        <Layer
          id="aircraft-home-base-links-line"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["get", "selected"], false],
              "#67e8f9",
              "#93c5fd",
            ],
            "line-width": [
              "case",
              ["boolean", ["get", "selected"], false],
              1.8,
              1.1,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["get", "selected"], false],
              0.72,
              0.2,
            ],
            "line-dasharray": [4, 4],
          }}
        />
      </Source>

      <Source id="aircraft-destination-links" type="geojson" data={destinationLinkGeojson}>
        <Layer
          id="aircraft-destination-links-line"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["get", "selected"], false],
              "#fbbf24",
              "#fde047",
            ],
            "line-width": [
              "case",
              ["boolean", ["get", "selected"], false],
              1.8,
              1.1,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["get", "selected"], false],
              0.85,
              0.4,
            ],
            "line-dasharray": [2, 2],
          }}
        />
      </Source>

      <Source id="aircraft-destination-markers" type="geojson" data={destinationMarkerGeojson}>
        <Layer
          id="aircraft-destination-markers-circle"
          type="circle"
          paint={{
            "circle-radius": [
              "case",
              ["boolean", ["get", "selected"], false],
              6,
              4,
            ],
            "circle-color": "#fbbf24",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": [
              "case",
              ["boolean", ["get", "selected"], false],
              0.9,
              0.6,
            ],
          }}
        />
      </Source>

      <Source id="aircraft-radar-cones" type="geojson" data={radarConeGeojson}>
        <Layer
          id="aircraft-radar-cones-fill"
          type="fill"
          paint={{
            "fill-color": [
              "case",
              ["boolean", ["get", "selected"], false],
              "#67e8f9",
              "#22c55e",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["get", "selected"], false],
              0.16,
              0.1,
            ],
          }}
        />
        <Layer
          id="aircraft-radar-cones-outline"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["boolean", ["get", "selected"], false],
              "#67e8f9",
              "#4ade80",
            ],
            "line-width": 1,
            "line-opacity": 0.45,
          }}
        />
      </Source>

      <Source id="aircraft-past-tracks" type="geojson" data={pastTracksGeojson}>
        <Layer
          id="aircraft-past-tracks-line"
          type="line"
          paint={{
            "line-color": "#ffea00",
            "line-width": 3,
            "line-opacity": 1.0,
          }}
        />
      </Source>

      <Source id="aircraft-future-trajectory" type="geojson" data={futureTrajectoryGeojson}>
        <Layer
          id="aircraft-future-trajectory-line"
          type="line"
          paint={{
            "line-color": "#ff9100",
            "line-width": 2,
            "line-opacity": 0.8,
            "line-dasharray": [2, 2],
          }}
        />
      </Source>

      {aircraftPositions.map((aircraft) => {
        const isSelected = aircraft.id === selectedAircraftId;
        const filter = aircraft.isTargeted
          ? "brightness(0) invert(1) sepia(1) saturate(8) hue-rotate(-10deg) drop-shadow(0 0 6px #ef4444)"
          : aircraft.isRebase
          ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(160deg) drop-shadow(0 0 5px #22d3ee88)"
          : "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(90deg) drop-shadow(0 0 4px #22c55e88)";

        return (
          <Marker
            key={aircraft.id}
            longitude={aircraft.lng}
            latitude={aircraft.lat}
            anchor="center"
            style={{ zIndex: isSelected ? 3 : 2 }}
          >
            <div className="relative">
              {aircraft.isTargeted && (
                <span
                  className="absolute inset-0 rounded-full border border-red-400"
                  style={{
                    transform: "scale(1.8)",
                    boxShadow: "0 0 12px rgba(239,68,68,0.45)",
                  }}
                />
              )}
              <img
                src={gripenSilhouette}
                alt=""
                width={isSelected ? 24 : 20}
                style={{
                  cursor: onSelectAircraft ? "pointer" : "default",
                  transform: `rotate(${aircraft.angle}deg)`,
                  filter,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectAircraft?.(aircraft.baseId, aircraft.id);
                }}
              />
            </div>
          </Marker>
        );
      })}
    </>
  );
}
