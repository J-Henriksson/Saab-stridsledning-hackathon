import { Base, Aircraft } from "@/types/game";
import { AircraftStatusBadge } from "./StatusBadge";
import { motion } from "framer-motion";
import { ArrowRight, Wrench, Plane, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";

interface AircraftPipelineProps {
  base: Base;
  onStartMaintenance: (aircraftId: string) => void;
  onSendMission: (aircraftId: string) => void;
}

function StageCard({
  title,
  icon,
  count,
  color,
  aircraft,
  action,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  aircraft: Aircraft[];
  action?: boolean;
  actionLabel?: string;
  onAction?: (id: string) => void;
}) {
  return (
    <div className={`bg-card border rounded-lg overflow-hidden flex flex-col ${color}`}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-foreground uppercase">{title}</span>
        </div>
        <span className="text-lg font-mono font-bold text-foreground">{count}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto max-h-40 space-y-1">
        {aircraft.length === 0 ? (
          <div className="text-[10px] text-muted-foreground text-center py-4">Inga flygplan</div>
        ) : (
          aircraft.map((ac) => (
            <motion.div
              key={ac.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/40 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{ac.tailNumber}</span>
                <span className="text-[10px] text-muted-foreground">{ac.type.replace("_", "/")}</span>
              </div>
              <div className="flex items-center gap-2">
                {ac.maintenanceTimeRemaining != null && (
                  <span className="text-[10px] text-status-amber">{ac.maintenanceTimeRemaining}h</span>
                )}
                {ac.maintenanceType && (
                  <span className="text-[10px] text-muted-foreground">{ac.maintenanceType}</span>
                )}
                {ac.currentMission && (
                  <span className="text-[10px] text-status-blue">{ac.currentMission}</span>
                )}
                {action && onAction && (
                  <button
                    onClick={() => onAction(ac.id)}
                    className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export function AircraftPipeline({ base, onStartMaintenance, onSendMission }: AircraftPipelineProps) {
  const mc = base.aircraft.filter((a) => a.status === "mission_capable");
  const onMission = base.aircraft.filter((a) => a.status === "on_mission");
  const nmc = base.aircraft.filter((a) => a.status === "not_mission_capable");
  const inMaint = base.aircraft.filter((a) => a.status === "maintenance");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-sans font-bold text-sm text-foreground">FLYGPLANSFLÖDE</h3>
        <div className="text-[10px] font-mono text-muted-foreground">
          Totalt: {base.aircraft.length} fpl
        </div>
      </div>

      {/* Flow visualization */}
      <div className="p-4">
        {/* Flow arrows diagram */}
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-mono text-muted-foreground">
          <span className="px-2 py-1 rounded bg-status-green/10 text-status-green border border-status-green/30">Klargöring</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-blue/10 text-status-blue border border-status-blue/30">Uppdrag</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-muted text-muted-foreground border border-border">Mottagning</span>
          <ArrowRight className="h-3 w-3" />
          <span className="px-2 py-1 rounded bg-status-amber/10 text-status-amber border border-status-amber/30">Underhåll</span>
          <RotateCcw className="h-3 w-3 text-primary" />
        </div>

        {/* Stage cards in 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          <StageCard
            title="Operativa / Klargöring"
            icon={<CheckCircle className="h-4 w-4 text-status-green" />}
            count={mc.length}
            color="border-status-green/30"
            aircraft={mc}
            action
            actionLabel="→ Uppdrag"
            onAction={onSendMission}
          />
          <StageCard
            title="På uppdrag"
            icon={<Plane className="h-4 w-4 text-status-blue" />}
            count={onMission.length}
            color="border-status-blue/30"
            aircraft={onMission}
          />
          <StageCard
            title="Fel — Kräver åtgärd"
            icon={<AlertTriangle className="h-4 w-4 text-status-red" />}
            count={nmc.length}
            color="border-status-red/30"
            aircraft={nmc}
            action
            actionLabel="→ UH"
            onAction={onStartMaintenance}
          />
          <StageCard
            title="Under underhåll"
            icon={<Wrench className="h-4 w-4 text-status-amber" />}
            count={inMaint.length}
            color="border-status-amber/30"
            aircraft={inMaint}
          />
        </div>
      </div>
    </div>
  );
}
