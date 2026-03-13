import type { Recommendation } from "@/types/game";
import { AlertTriangle, CheckCircle, Wrench, Package, ArrowRight, X, Zap } from "lucide-react";

interface RecommendationFeedProps {
  recommendations: Recommendation[];
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  reassign: <ArrowRight className="h-3.5 w-3.5" />,
  maintenance: <Wrench className="h-3.5 w-3.5" />,
  resupply: <Package className="h-3.5 w-3.5" />,
  rebalance: <Zap className="h-3.5 w-3.5" />,
  schedule: <CheckCircle className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
};

const priorityStyles: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: "hsl(353 74% 47% / 0.08)", border: "hsl(353 74% 47% / 0.25)", color: "hsl(353 74% 42%)" },
  high: { bg: "hsl(42 64% 53% / 0.08)", border: "hsl(42 64% 53% / 0.25)", color: "hsl(42 64% 36%)" },
  medium: { bg: "hsl(220 63% 38% / 0.06)", border: "hsl(220 63% 38% / 0.2)", color: "hsl(220 63% 32%)" },
  low: { bg: "hsl(216 18% 96%)", border: "hsl(215 14% 86%)", color: "hsl(218 15% 50%)" },
};

export function RecommendationFeed({ recommendations, onApply, onDismiss }: RecommendationFeedProps) {
  const active = recommendations.filter((r) => !r.dismissed);

  if (active.length === 0) {
    return (
      <div className="p-4 text-center">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: "hsl(152 60% 38%)" }} />
        <p className="text-[11px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>Inga rekommendationer</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-mono font-bold tracking-wider" style={{ color: "hsl(220 63% 18%)" }}>
          REKOMMENDATIONER ({active.length})
        </h4>
      </div>
      {active.map((rec) => {
        const ps = priorityStyles[rec.priority] ?? priorityStyles.low;
        return (
          <div
            key={rec.id}
            className="rounded-lg overflow-hidden"
            style={{ background: ps.bg, border: `1px solid ${ps.border}` }}
          >
            <div className="px-3 py-2">
              <div className="flex items-start gap-2">
                <span style={{ color: ps.color }} className="mt-0.5 shrink-0">
                  {typeIcons[rec.type] ?? typeIcons.warning}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono font-bold" style={{ color: "hsl(220 63% 18%)" }}>
                    {rec.title}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: "hsl(218 15% 50%)" }}>
                    {rec.explanation}
                  </div>
                  {rec.tradeoff && (
                    <div className="text-[9px] font-mono mt-1 italic" style={{ color: "hsl(218 15% 60%)" }}>
                      Avvägning: {rec.tradeoff}
                    </div>
                  )}
                </div>
                <span
                  className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: `${ps.color}20`, color: ps.color }}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-3 py-1.5"
              style={{ borderTop: `1px solid ${ps.border}` }}
            >
              <button
                onClick={() => onApply(rec.id)}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono font-bold rounded transition-colors"
                style={{
                  background: "hsl(152 60% 32% / 0.12)",
                  color: "hsl(152 60% 28%)",
                  border: "1px solid hsl(152 60% 32% / 0.3)",
                }}
              >
                <CheckCircle className="h-3 w-3" />
                TILLÄMPA
              </button>
              <button
                onClick={() => onDismiss(rec.id)}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono rounded transition-colors"
                style={{ color: "hsl(218 15% 55%)" }}
              >
                <X className="h-3 w-3" />
                AVFÄRDA
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
