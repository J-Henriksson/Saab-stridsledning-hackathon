import { AlertTriangle, Shield, Clock } from "lucide-react";
import type { BorderAlert } from "@/lib/enemyAnalysis";

export function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
      <div className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest mb-1.5">
        Identifierade varningar
      </div>
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono text-foreground">
          <span className="text-amber-400 shrink-0">▸</span>
          {w}
        </div>
      ))}
    </div>
  );
}

export function BorderAlertPanel({ alert }: { alert: BorderAlert }) {
  const isClose = alert.distanceKm < 15;
  const isMedium = alert.distanceKm < 40;

  const accentColor = isClose ? "#f87171" : isMedium ? "#D7AB3A" : "#94a3b8";
  const bgColor = isClose
    ? "rgba(239,68,68,0.06)"
    : isMedium
    ? "rgba(215,171,58,0.06)"
    : "rgba(100,116,139,0.06)";
  const borderStyle = isClose
    ? "rgba(239,68,68,0.30)"
    : isMedium
    ? "rgba(215,171,58,0.30)"
    : "rgba(100,116,139,0.20)";
  const urgency = isClose ? "KRITISK" : isMedium ? "HÖG" : "MEDEL";

  return (
    <div
      className="rounded-lg p-3 space-y-2.5"
      style={{ background: bgColor, border: `1px solid ${borderStyle}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            GRÄNSNÄRHET — SVENSK {alert.zone}
          </span>
        </div>
        <span
          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: `${accentColor}20`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          {urgency}
        </span>
      </div>

      {/* Distance + direction + time */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono">
        <span className="font-bold" style={{ color: accentColor }}>
          {Math.round(alert.distanceKm)} km till {alert.zone}
        </span>
        {alert.approaching && (
          <span className="flex items-center gap-1 text-red-400">
            ▶ Rör sig mot gränsen
          </span>
        )}
        {alert.timeEstimateMin !== undefined && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />~{alert.timeEstimateMin} min
          </span>
        )}
      </div>

      {/* Predicted actions */}
      {alert.predictedActions.length > 0 && (
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Trolig avsikt
          </div>
          {alert.predictedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono text-foreground">
              <span className="shrink-0" style={{ color: accentColor }}>
                ▸
              </span>
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Recommended actions */}
      {alert.recommendedActions.length > 0 && (
        <div
          className="rounded p-2 space-y-1"
          style={{
            background: "rgba(100,116,139,0.08)",
            border: "1px solid rgba(100,116,139,0.15)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-blue-400/80">
              Rekommenderade åtgärder
            </span>
          </div>
          {alert.recommendedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono text-foreground">
              <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
              {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
