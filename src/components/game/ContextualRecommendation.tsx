import { Sparkles } from "lucide-react";

interface ContextualRecommendationProps {
  text: string;
  type: "positive" | "warning" | "neutral";
}

const styles = {
  positive: { bg: "#0a2a1a", border: "#2a6a4a", color: "#4aD7AA" },
  warning:  { bg: "#2a1a0a", border: "#6a4a1a", color: "#D7AB3A" },
  neutral:  { bg: "#0a1832", border: "#2a3a5a", color: "#8899cc" },
};

export function ContextualRecommendation({ text, type }: ContextualRecommendationProps) {
  const s = styles[type];
  return (
    <div
      className="rounded-xl px-3 py-2.5 flex items-start gap-2"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: s.color }} />
      <div className="text-[10px] font-mono leading-relaxed" style={{ color: s.color }}>
        <span className="font-bold">REKOMMENDATION: </span>
        {text}
      </div>
    </div>
  );
}
