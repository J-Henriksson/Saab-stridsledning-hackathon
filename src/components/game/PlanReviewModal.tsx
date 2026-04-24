import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { GameState } from "@/types/game";
import { analyzePlan, type PlanAnalysis } from "@/lib/planAnalysis";
import { ContextualRecommendation } from "./ContextualRecommendation";

interface Props {
  state: GameState;
  onConfirm: () => void;
  onBack: () => void;
}

const TYPE_CONFIG = {
  positive: { color: "#4aD7AA", label: "GODKÄND PLAN", Icon: CheckCircle },
  warning:  { color: "#D7AB3A", label: "VARNINGAR HITTADE", Icon: AlertTriangle },
  neutral:  { color: "#8899cc", label: "ANALYS KLAR", Icon: Info },
};

export function PlanReviewModal({ state, onConfirm, onBack }: Props) {
  const [phase, setPhase] = useState<"loading" | "result">("loading");
  const [analysis, setAnalysis] = useState<PlanAnalysis | null>(null);

  useEffect(() => {
    analyzePlan(state).then((result) => {
      setAnalysis(result);
      setPhase("result");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = analysis ? TYPE_CONFIG[analysis.type] : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.80)" }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-[520px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}
        >
          <Sparkles className="w-5 h-5 shrink-0" style={{ color: "#D7AB3A" }} />
          <div>
            <div className="text-xs font-mono font-bold" style={{ color: "#D7AB3A" }}>
              TAKTISK AI-ANALYS
            </div>
            <div className="text-base font-mono font-black text-white">
              Stridsplan — Granskning
            </div>
          </div>
          {cfg && (
            <div
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold"
              style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}`, color: cfg.color }}
            >
              <cfg.Icon className="w-3 h-3" />
              {cfg.label}
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-10 h-10" style={{ color: "#D7AB3A" }} />
              </motion.div>
              <div className="text-sm font-mono font-bold text-white">AI analyserar stridsplanen…</div>
              <div className="text-xs font-mono" style={{ color: "#8899bb" }}>
                Kontrollerar täckning, hotnivåer och svagheter
              </div>
            </div>
          )}

          {phase === "result" && analysis && (
            <>
              <ContextualRecommendation text={analysis.recommendation} type={analysis.type} />

              {analysis.concerns.length > 0 && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{ background: "#1a2a4a", border: "1px solid #2a3a6a" }}
                >
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: "#8899bb" }}>
                    Identifierade risker
                  </div>
                  <ul className="space-y-1.5">
                    {analysis.concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-mono" style={{ color: "#ccd4e8" }}>
                        <span style={{ color: "#D7AB3A" }} className="shrink-0 mt-0.5">▸</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#1a4a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}
                >
                  ✅ Godkänn och fortsätt
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#2a2a3a", border: "1px solid #5566aa", color: "#8899cc" }}
                >
                  ← Gå tillbaka
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
