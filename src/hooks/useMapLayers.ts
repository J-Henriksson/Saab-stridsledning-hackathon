import { useState, useCallback } from "react";

export type BaseMapType = "voyager" | "dark" | "topo" | "satellite" | "minimal";

export interface OverlayConfig {
  active: boolean;
  opacity: number; // 0–100
}

export interface MapLayerState {
  baseMap: BaseMapType;
  overlays: {
    hillshade:   OverlayConfig;
    radarShadow: OverlayConfig;
    ocean:       OverlayConfig;
  };
  dampColors: boolean;
}

export type OverlayKey = keyof MapLayerState["overlays"];

const STORAGE_KEY = "saab-map-layers-v2";

const DEFAULT_STATE: MapLayerState = {
  baseMap: "voyager",
  overlays: {
    hillshade:   { active: false, opacity: 35 },
    radarShadow: { active: false, opacity: 25 },
    ocean:       { active: false, opacity: 30 },
  },
  dampColors: false,
};

function loadState(): MapLayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<MapLayerState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      overlays: { ...DEFAULT_STATE.overlays, ...(parsed.overlays ?? {}) },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: MapLayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
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
    (key: OverlayKey) =>
      update({
        ...state,
        overlays: {
          ...state.overlays,
          [key]: { ...state.overlays[key], active: !state.overlays[key].active },
        },
      }),
    [state, update]
  );

  const setOverlayOpacity = useCallback(
    (key: OverlayKey, opacity: number) =>
      update({
        ...state,
        overlays: {
          ...state.overlays,
          [key]: { ...state.overlays[key], opacity },
        },
      }),
    [state, update]
  );

  const toggleDampColors = useCallback(
    () => update({ ...state, dampColors: !state.dampColors }),
    [state, update]
  );

  return { mapLayerState: state, setBaseMap, toggleOverlay, setOverlayOpacity, toggleDampColors };
}
