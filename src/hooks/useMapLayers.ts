import { useState, useCallback } from "react";

export type BaseMapType = "dark" | "topo" | "satellite" | "minimal";

export interface MapLayerState {
  baseMap: BaseMapType;
  overlays: {
    hillshade: boolean;
    elevationHeatmap: boolean;
    buildings: boolean;
  };
  overlayOpacity: number;
  dampColors: boolean;
}

const STORAGE_KEY = "saab-map-layers";

const DEFAULT_STATE: MapLayerState = {
  baseMap: "dark",
  overlays: { hillshade: false, elevationHeatmap: false, buildings: false },
  overlayOpacity: 60,
  dampColors: false,
};

function loadState(): MapLayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: MapLayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function useMapLayers() {
  const [state, setState] = useState<MapLayerState>(loadState);

  const update = useCallback((next: MapLayerState) => {
    saveState(next);
    setState(next);
  }, []);

  const setBaseMap = useCallback(
    (baseMap: BaseMapType) => update({ ...state, baseMap }),
    [state, update]
  );

  const toggleOverlay = useCallback(
    (key: keyof MapLayerState["overlays"]) =>
      update({ ...state, overlays: { ...state.overlays, [key]: !state.overlays[key] } }),
    [state, update]
  );

  const setOpacity = useCallback(
    (overlayOpacity: number) => update({ ...state, overlayOpacity }),
    [state, update]
  );

  const toggleDampColors = useCallback(
    () => update({ ...state, dampColors: !state.dampColors }),
    [state, update]
  );

  return { mapLayerState: state, setBaseMap, toggleOverlay, setOpacity, toggleDampColors };
}
