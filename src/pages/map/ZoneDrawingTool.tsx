import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";
import * as turf from "@turf/turf";
import type { DrawingMode, TacticalZone, UserZoneType } from "@/types/overlay";

export interface DrawingState {
  mode: DrawingMode;
  step: "idle" | "center_placed";
  center?: { lng: number; lat: number };
  currentMousePos?: { lng: number; lat: number };
  polygonPoints: [number, number][];
}

const USER_TYPE_MAP: Partial<Record<DrawingMode, UserZoneType>> = {
  circle_restricted:   "restricted",
  circle_surveillance: "surveillance",
  circle_logistics:    "logistics",
  polygon_roadstrip:   "roadstrip",
};

const NAME_MAP: Record<UserZoneType, string> = {
  restricted:   "Restriktionszon",
  surveillance: "Övervakningszon",
  logistics:    "Logistikzon",
  roadstrip:    "Vägstripzon",
};

export function useZoneDrawing({
  mode,
  onZoneComplete,
}: {
  mode: DrawingMode;
  onZoneComplete: (zone: Omit<TacticalZone, "id" | "createdAtHour" | "createdAtDay">) => void;
}) {
  const { current: mapRef } = useMap();
  const [drawState, setDrawState] = useState<DrawingState>({
    mode: "none",
    step: "idle",
    polygonPoints: [],
  });

  useEffect(() => {
    setDrawState({ mode, step: "idle", center: undefined, currentMousePos: undefined, polygonPoints: [] });
  }, [mode]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onCompleteRef = useRef(onZoneComplete);
  onCompleteRef.current = onZoneComplete;

  useEffect(() => {
    if (!mapRef) return;
    const m = mapRef.getMap();

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const currentMode = modeRef.current;
      if (currentMode === "none") return;
      e.preventDefault();
      const { lng, lat } = e.lngLat;

      if (currentMode === "polygon_roadstrip") {
        setDrawState((prev) => ({
          ...prev,
          polygonPoints: [...prev.polygonPoints, [lng, lat]],
        }));
        return;
      }

      // Circle mode: toggle center/radius
      setDrawState((prev) => {
        if (prev.step === "idle") {
          return { ...prev, step: "center_placed", center: { lng, lat } };
        }
        if (prev.step === "center_placed" && prev.center) {
          const radiusKm = turf.distance(
            turf.point([prev.center.lng, prev.center.lat]),
            turf.point([lng, lat]),
            { units: "kilometers" }
          );
          const userType = USER_TYPE_MAP[currentMode];
          if (userType) {
            const ts = new Date().toISOString().slice(11, 16);
            onCompleteRef.current({
              name: `${NAME_MAP[userType]} ${ts}`,
              category: "user",
              shape: "circle",
              center: prev.center,
              radiusKm: Math.max(0.1, radiusKm),
              userType,
              description: `Ritad kl ${ts}`,
              createdBy: "OPERATÖR",
            });
          }
          return { ...prev, step: "idle", center: undefined, currentMousePos: undefined };
        }
        return prev;
      });
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (modeRef.current === "none") return;
      setDrawState((prev) => ({
        ...prev,
        currentMousePos: { lng: e.lngLat.lng, lat: e.lngLat.lat },
      }));
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      if (modeRef.current !== "polygon_roadstrip") return;
      e.preventDefault();
      setDrawState((prev) => {
        if (prev.polygonPoints.length >= 2) {
          const ts = new Date().toISOString().slice(11, 16);
          onCompleteRef.current({
            name: `Vägstripzon ${ts}`,
            category: "user",
            shape: "polygon",
            coordinates: prev.polygonPoints,
            userType: "roadstrip",
            description: "Nödlandningsstripzon längs väg",
            createdBy: "OPERATÖR",
          });
        }
        return { ...prev, step: "idle", polygonPoints: [] };
      });
    };

    m.getCanvas().style.cursor = mode !== "none" ? "crosshair" : "";
    m.on("click", handleClick);
    m.on("mousemove", handleMouseMove);
    m.on("dblclick", handleDblClick);

    return () => {
      m.off("click", handleClick);
      m.off("mousemove", handleMouseMove);
      m.off("dblclick", handleDblClick);
      m.getCanvas().style.cursor = "";
    };
  }, [mapRef, mode]);

  return drawState;
}
