import { GameState } from "@/types/game";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle, Target } from "lucide-react";

interface OptimizationPanelProps {
  state: GameState;
  baseId: string;
}

export function OptimizationPanel({ state, baseId }: OptimizationPanelProps) {
  const base = state.bases.find((b) => b.id === baseId);
  if (!base) return null;

  const mc = base.aircraft.filter((a) => a.status === "ready").length;
  const total = base.aircraft.length;
  const readinessRate = total > 0 ? (mc / total) * 100 : 0;

  const nmcWaiting = base.aircraft.filter((a) => a.status === "unavailable").length;
  const baysAvailable = base.maintenanceBays.total - base.maintenanceBays.occupied;
  const criticalParts = base.spareParts.filter((p) => p.quantity / p.maxQuantity < 0.3);
  const lowAmmo = base.ammunition.filter((a) => a.quantity / a.max < 0.3);

  const issues: { severity: "critical" | "warning" | "info"; text: string }[] = [];

  if (nmcWaiting > 0 && baysAvailable > 0) {
    issues.push({ severity: "critical", text: `${nmcWaiting} NMC-flygplan väntar – ${baysAvailable} UH-platser lediga! Starta underhåll omedelbart.` });
  }
  if (nmcWaiting > 0 && baysAvailable === 0) {
    issues.push({ severity: "warning", text: `${nmcWaiting} NMC-flygplan väntar men alla UH-platser är upptagna.` });
  }
  if (base.fuel < 30) {
    issues.push({ severity: "critical", text: `Bränslenivå kritiskt låg (${base.fuel.toFixed(0)}%). Begär påfyllning!` });
  } else if (base.fuel < 60) {
    issues.push({ severity: "warning", text: `Bränslenivå under 60%. Planera påfyllning.` });
  }
  if (criticalParts.length > 0) {
    issues.push({ severity: "critical", text: `Kritiskt låga reservdelar: ${criticalParts.map((p) => p.name).join(", ")}` });
  }
  if (lowAmmo.length > 0) {
    issues.push({ severity: "warning", text: `Låg ammunition: ${lowAmmo.map((a) => a.type).join(", ")}` });
  }
  if (readinessRate >= 80) {
    issues.push({ severity: "info", text: `Hög beredskapsgrad (${readinessRate.toFixed(0)}%). Basen är i gott skick.` });
  }

  return (
    <div className="bg-card border border-primary/30 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-sans font-bold text-sm text-foreground">OPTIMERING & INSIKTER</h3>
        </div>
      </div>

      {/* Readiness gauge */}
      <div className="px-4 py-4 border-b border-border">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Beredskapsgrad</div>
          <div className={`text-4xl font-mono font-bold ${readinessRate >= 70 ? "text-status-green" : readinessRate >= 40 ? "text-status-amber" : "text-status-red"}`}>
            {readinessRate.toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">{mc} av {total} flygplan operativa</div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
          <motion.div
            className={`h-full rounded-full ${readinessRate >= 70 ? "bg-status-green" : readinessRate >= 40 ? "bg-status-amber" : "bg-status-red"}`}
            animate={{ width: `${readinessRate}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 space-y-2">
        {issues.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">Inga akuta åtgärder krävs</div>
        ) : (
          issues.map((issue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-start gap-2 p-2.5 rounded text-xs border ${
                issue.severity === "critical"
                  ? "border-status-red/30 bg-status-red/5"
                  : issue.severity === "warning"
                  ? "border-status-amber/30 bg-status-amber/5"
                  : "border-status-green/30 bg-status-green/5"
              }`}
            >
              {issue.severity === "critical" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-status-red shrink-0 mt-0.5" />
              ) : issue.severity === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-status-green shrink-0 mt-0.5" />
              )}
              <span className="text-foreground">{issue.text}</span>
            </motion.div>
          ))
        )}
      </div>

      {/* Quick stats */}
      <div className="px-4 py-3 border-t border-border grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground">Uppdrag idag</div>
          <div className="text-lg font-mono font-bold text-status-blue">
            {base.aircraft.filter((a) => a.status === "on_mission").length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">I UH</div>
          <div className="text-lg font-mono font-bold text-status-amber">
            {base.aircraft.filter((a) => a.status === "under_maintenance").length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Väntar</div>
          <div className="text-lg font-mono font-bold text-status-red">
            {nmcWaiting}
          </div>
        </div>
      </div>
    </div>
  );
}
