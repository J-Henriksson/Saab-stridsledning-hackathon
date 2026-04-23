import { motion } from "framer-motion";
import { Aircraft } from "@/types/game";

interface Props {
  aircraft: Aircraft;
  totalBays: number;
  onContinue: () => void;
  onReturnToApron: () => void;
}

export function LastBayWarningModal({ aircraft, totalBays, onContinue, onReturnToApron }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-[460px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}>
          <span className="text-2xl font-mono font-black" style={{ color: "#D7AB3A" }}>!</span>
          <div>
            <div className="text-xs font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>
              VARNING — SISTA UNDERHALLSPLATSEN
            </div>
            <div className="text-base font-mono font-black text-white">
              {aircraft.tailNumber} — sista lediga platsen
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: "#1a3a6a", border: "1px solid #2a5a9a" }}>
            <div className="text-xs font-mono leading-relaxed" style={{ color: "#ccd4e8" }}>
              Det finns bara <span style={{ color: "#D7AB3A", fontWeight: "bold" }}>1 ledig plats</span> kvar
              av {totalBays} underhallshallar. Om du placerar{" "}
              <span style={{ color: "#D7AB3A", fontWeight: "bold" }}>{aircraft.tailNumber}</span> här
              kommer inga fler plan kunna gå in i service.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onReturnToApron}
              className="flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: "#1a2a4a", border: "1px solid #5566aa", color: "#8899cc" }}
            >
              Tillbaka till uppstallningsplats
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: "#5a2a1a", border: "1px solid #D7AB3A", color: "#D7AB3A" }}
            >
              Fortsatt — placera i hangar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
