import type { TurnPhase } from "@/types/game";
import { PHASE_DEFINITIONS, PHASE_ORDER } from "@/data/config/phases";
import { Check, ChevronRight } from "lucide-react";

interface TurnPhaseTrackerProps {
  currentPhase: TurnPhase;
  turnNumber: number;
  onAdvancePhase: () => void;
}

export function TurnPhaseTracker({ currentPhase, turnNumber, onAdvancePhase }: TurnPhaseTrackerProps) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const currentDef = PHASE_DEFINITIONS.find((p) => p.id === currentPhase);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "hsl(0 0% 100%)",
        border: "1px solid hsl(215 14% 84%)",
        boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          borderBottom: "1px solid hsl(215 14% 88%)",
          background: "linear-gradient(90deg, hsl(220 63% 18% / 0.06), transparent)",
        }}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-sans font-bold text-sm" style={{ color: "hsl(220 63% 18%)" }}>
            SPELVARV {turnNumber}
          </h3>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
            style={{
              background: "hsl(42 64% 53% / 0.15)",
              color: "hsl(42 64% 40%)",
              border: "1px solid hsl(42 64% 53% / 0.3)",
            }}
          >
            {currentDef?.shortLabel ?? currentPhase}
          </span>
        </div>
        <button
          onClick={onAdvancePhase}
          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "var(--gradient-gold, hsl(42 64% 53%))",
            color: "hsl(220 63% 14%)",
            boxShadow: "0 1px 6px hsl(42 64% 53% / 0.3)",
          }}
        >
          {currentDef?.buttonLabel ?? "NÄSTA FAS"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Phase steps */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-0.5 min-w-max">
          {PHASE_DEFINITIONS.map((phase, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div key={phase.id} className="flex items-center">
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono font-bold transition-all"
                  style={{
                    background: isCurrent
                      ? "hsl(220 63% 18%)"
                      : isCompleted
                      ? "hsl(152 60% 32% / 0.12)"
                      : "hsl(216 18% 96%)",
                    color: isCurrent
                      ? "hsl(42 64% 62%)"
                      : isCompleted
                      ? "hsl(152 60% 32%)"
                      : "hsl(218 15% 60%)",
                    border: isCurrent
                      ? "1px solid hsl(42 64% 53% / 0.5)"
                      : isCompleted
                      ? "1px solid hsl(152 60% 32% / 0.3)"
                      : "1px solid hsl(215 14% 88%)",
                  }}
                  title={phase.description}
                >
                  {isCompleted && <Check className="h-3 w-3" />}
                  {phase.shortLabel}
                </div>
                {idx < PHASE_DEFINITIONS.length - 1 && (
                  <ChevronRight
                    className="h-3 w-3 mx-0.5 shrink-0"
                    style={{
                      color: isCompleted ? "hsl(152 60% 40%)" : "hsl(218 15% 75%)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current phase description */}
      {currentDef && (
        <div
          className="px-4 py-2 text-[10px] font-mono"
          style={{
            borderTop: "1px solid hsl(215 14% 90%)",
            color: "hsl(218 15% 50%)",
            background: "hsl(216 18% 98%)",
          }}
        >
          {currentDef.description}
        </div>
      )}
    </div>
  );
}
