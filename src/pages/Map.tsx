import { useState, useCallback } from "react";
import MapGL, { NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";

import { BASE_COORDS, SWEDEN_CENTER, INITIAL_ZOOM, MAP_STYLE } from "./map/constants";
import { SelectedEntity } from "./map/helpers";
import { BaseMarker } from "./map/BaseMarker";
import { SupplyLinesLayer } from "./map/SupplyLinesLayer";
import { AircraftLayer } from "./map/AircraftLayer";
import { BaseDetailPanel } from "./map/BaseDetailPanel";
import { AircraftDetailPanel } from "./map/AircraftDetailPanel";

export default function MapPage() {
  const { state, advanceTurn, resetGame } = useGame();
  const [selected, setSelected] = useState<SelectedEntity>(null);

  const selectedBase =
    selected?.kind === "base" || selected?.kind === "aircraft"
      ? state.bases.find((b) => b.id === selected.baseId)
      : undefined;

  const selectedAircraft =
    selected?.kind === "aircraft"
      ? selectedBase?.aircraft.find((a) => a.id === selected.aircraftId)
      : undefined;

  const handleMapClick = useCallback(() => setSelected(null), []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* Sub-header */}
      <div className="border-b border-border bg-card px-6 py-2.5 flex items-center gap-3">
        <MapPin className="h-4 w-4 text-primary" />
        <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">
          TAKTISK KARTA — FLYGBASGRUPP
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground ml-2">
          Dag {state.day} · Fas: {state.phase}
        </span>
        <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-green inline-block" /> Hög beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-yellow inline-block" /> Medel beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-status-red inline-block" /> Låg beredskap</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Inaktiv bas</span>
        </div>
      </div>

      {/* Map + panel */}
      <div className="flex-1 overflow-hidden flex">

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          <MapGL
            initialViewState={{
              longitude: BASE_COORDS.MOB.lng,
              latitude: BASE_COORDS.MOB.lat,
              zoom: 9,
              pitch: 30,
            }}
            mapStyle={MAP_STYLE}
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            <SupplyLinesLayer bases={state.bases} />
            <AircraftLayer
              bases={state.bases}
              onSelectAircraft={(baseId, aircraftId) =>
                setSelected({ kind: "aircraft", baseId, aircraftId })
              }
            />

            {Object.keys(BASE_COORDS).map((id) => (
              <BaseMarker
                key={id}
                id={id}
                base={state.bases.find((b) => b.id === id)}
                isSelected={selected?.baseId === id}
                onClick={() => setSelected({ kind: "base", baseId: id })}
              />
            ))}
          </MapGL>

          {/* Scanline CRT overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.01) 2px, rgba(0,255,100,0.01) 4px)",
            }}
          />
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="detail"
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[340px] border-l border-border bg-card overflow-y-auto flex flex-col"
            >
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  {selectedAircraft ? (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedAircraft.tailNumber}</div>
                      <div className="text-[10px] text-muted-foreground">{selectedAircraft.type} · {selectedBase?.name}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-foreground font-mono">{selectedBase?.name ?? selected.baseId}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{selectedBase?.type ?? "Reservbas"}</div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedAircraft ? (
                <AircraftDetailPanel
                  aircraft={selectedAircraft}
                  onBack={() => setSelected({ kind: "base", baseId: selected.baseId })}
                />
              ) : selectedBase ? (
                <BaseDetailPanel
                  base={selectedBase}
                  onSelectAircraft={(id) => setSelected({ kind: "aircraft", baseId: selectedBase.id, aircraftId: id })}
                />
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  Bas ej aktiv i detta scenario.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
