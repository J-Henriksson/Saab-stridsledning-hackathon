import { useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { TopBar } from "@/components/game/TopBar";
import { FleetGrid } from "@/components/game/FleetGrid";
import { ResourceDetail } from "@/components/game/ResourceDetail";
import { PersonnelPanel } from "@/components/game/PersonnelPanel";
import { OptimizationPanel } from "@/components/game/OptimizationPanel";
import { EventLog } from "@/components/game/EventLog";
import { AIAgent } from "@/components/game/AIAgent";
import { toast } from "sonner";
import { BaseType } from "@/types/game";

const Index = () => {
  const { state, advanceTurn, startMaintenance, sendOnMission, getResourceSummary, resetGame } = useGameState();
  const [selectedBaseId, setSelectedBaseId] = useState<BaseType>("MOB");

  const selectedBase = state.bases.find((b) => b.id === selectedBaseId)!;

  const handleStartMaintenance = (aircraftId: string) => {
    if (selectedBase.maintenanceBays.occupied >= selectedBase.maintenanceBays.total) {
      toast.error("Alla underhållsplatser är upptagna!");
      return;
    }
    startMaintenance(selectedBaseId, aircraftId);
    toast.success(`Underhåll påbörjat på ${aircraftId}`);
  };

  const handleSendMission = (aircraftId: string) => {
    sendOnMission(selectedBaseId, aircraftId, "DCA");
    toast.success(`${aircraftId} skickad på DCA-uppdrag`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* Base selector tabs */}
      <div className="border-b border-border bg-card px-4 flex items-center gap-1">
        {state.bases.map((base) => {
          const mc = base.aircraft.filter((a) => a.status === "mission_capable").length;
          const total = base.aircraft.length;
          const isSelected = base.id === selectedBaseId;
          return (
            <button
              key={base.id}
              onClick={() => setSelectedBaseId(base.id)}
              className={`px-4 py-2.5 text-xs font-mono border-b-2 transition-colors ${
                isSelected
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-bold">{base.id}</span>
              <span className="ml-2 text-[10px]">
                {mc}/{total} MC
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0">
        {/* Main content - single base focus */}
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <FleetGrid
                base={selectedBase}
                onStartMaintenance={handleStartMaintenance}
                onSendMission={handleSendMission}
              />
              <PersonnelPanel base={selectedBase} />
              <EventLog events={state.events.filter((e) => !e.base || e.base === selectedBaseId)} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <OptimizationPanel state={state} baseId={selectedBaseId} />
              <ResourceDetail base={selectedBase} phase={state.phase} />
            </div>
          </div>
        </div>

        {/* AI Agent sidebar */}
        <div className="border-l border-border h-full hidden lg:flex flex-col">
          <AIAgent getResourceSummary={getResourceSummary} />
        </div>
      </div>
    </div>
  );
};

export default Index;
