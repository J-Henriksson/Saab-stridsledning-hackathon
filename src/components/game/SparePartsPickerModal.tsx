import { motion } from "framer-motion";
import { Aircraft, SparePartStock } from "@/types/game";

interface Props {
  aircraft: Aircraft;
  spareParts: SparePartStock[];
  onSelect: (partId: string, partName: string) => void;
  onClose: () => void;
}

export function SparePartsPickerModal({ aircraft, spareParts, onSelect, onClose }: Props) {
  const available = spareParts.filter((p) => p.quantity > 0);
  const depleted = spareParts.filter((p) => p.quantity === 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-[480px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: "#0a1d3e", borderBottom: "1px solid #D7AB3A44" }}>
          <span className="text-2xl font-mono font-black" style={{ color: "#D7AB3A" }}>LRU</span>
          <div>
            <div className="text-xs font-mono font-bold" style={{ color: "#D7AB3A" }}>RESERVDELSFÖRRÅD — LRU-BYTE</div>
            <div className="text-base font-mono font-black text-white">
              {aircraft.tailNumber} — välj komponent att byta
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="text-xs font-mono" style={{ color: "#8899bb" }}>
            Välj vilken del som ska bytas ut (2h service). En enhet dras från lagret.
          </div>

          {/* Available parts */}
          {available.length === 0 ? (
            <div className="rounded-xl p-4 text-center" style={{ background: "#2a1a1a", border: "1px solid #D9192E44" }}>
              <div className="text-sm font-mono font-bold" style={{ color: "#D9192E" }}>Inga reservdelar tillgängliga</div>
              <div className="text-xs font-mono mt-1" style={{ color: "#886655" }}>Alla lager är tomma — LRU-byte ej möjligt</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {available.map((part) => (
                <button
                  key={part.id}
                  onClick={() => onSelect(part.id, part.name)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-mono text-sm transition-all hover:brightness-125 active:scale-95"
                  style={{ background: "#1a2a4a", border: "1px solid #3a5a8a", color: "white" }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold" style={{ color: "#D7DEE1" }}>{part.name}</span>
                    <span className="text-xs" style={{ color: "#6688aa" }}>{part.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "#0a1a3a", color: "#8899bb" }}>
                      {part.resupplyDays}d ledtid
                    </span>
                    <span
                      className="text-sm font-bold px-3 py-1 rounded-lg"
                      style={{
                        background: part.quantity <= 1 ? "#5a2a1a" : "#1a3a2a",
                        color: part.quantity <= 1 ? "#ff9966" : "#66cc88",
                        border: `1px solid ${part.quantity <= 1 ? "#aa4422" : "#2a6a44"}`,
                      }}
                    >
                      {part.quantity}/{part.maxQuantity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#1a3a6a", color: "#D7AB3A", border: "1px solid #3a6aaa" }}>
                      Välj
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Depleted parts (shown greyed out) */}
          {depleted.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-mono" style={{ color: "#554444" }}>Slut på lager:</div>
              {depleted.map((part) => (
                <div
                  key={part.id}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-xl font-mono text-xs opacity-40"
                  style={{ background: "#0a1020", border: "1px solid #2a2a3a", color: "#556677" }}
                >
                  <span>{part.name}</span>
                  <span style={{ color: "#D9192E" }}>0/{part.maxQuantity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
            style={{ background: "#1a1a2a", border: "1px solid #3a3a5a", color: "#8899cc" }}
          >
            Avbryt
          </button>
        </div>
      </motion.div>
    </div>
  );
}
