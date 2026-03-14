import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aircraft } from "@/types/game";
import { UTFALL_TABLE_A, WEAPON_LOSS_BY_ROLL, EXTRA_MAINTENANCE_TIME_BY_ROLL } from "@/data/config/probabilities";
import { Dice6, CheckCircle, AlertTriangle, X, Plane } from "lucide-react";

type Phase = "roll1" | "missionTime" | "faultSearch" | "faultFound";

interface Props {
  aircraft: Aircraft;
  onMission: (durationHours: number) => void;
  onMaintenance: (repairTime: number, typeKey: string, weaponLoss: number, label: string) => void;
  onClose: () => void;
}

function animatedRoll(
  setDisplay: (n: number) => void,
  onDone: (result: number) => void,
  fixedResult?: number
) {
  let count = 0;
  const result = fixedResult ?? (Math.floor(Math.random() * 6) + 1);
  const interval = setInterval(() => {
    setDisplay(Math.floor(Math.random() * 6) + 1);
    count++;
    if (count >= 12) {
      clearInterval(interval);
      setDisplay(result);
      onDone(result);
    }
  }, 70);
}

export function RunwayCheckModal({ aircraft, onMission, onMaintenance, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("roll1");
  const [rolling, setRolling] = useState(false);

  // Auto-roll on mount
  useEffect(() => {
    handleRoll1();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dice display values
  const [roll1Display, setRoll1Display] = useState<number | null>(null);
  const [roll1Result, setRoll1Result] = useState<number | null>(null);
  const [missionDuration, setMissionDuration] = useState<number | null>(null);

  const [faultRollDisplay, setFaultRollDisplay] = useState<number | null>(null);
  const [faultRollResult, setFaultRollResult] = useState<number | null>(null);
  const [faultSearchHistory, setFaultSearchHistory] = useState<number[]>([]); // 5s and 6s before finding fault

  // Computed fault outcome (only when faultRollResult is 1–4)
  const faultOutcome = faultRollResult !== null && faultRollResult <= 4
    ? UTFALL_TABLE_A[faultRollResult - 1]
    : null;
  const faultWeaponLoss = faultRollResult !== null && faultRollResult <= 4
    ? WEAPON_LOSS_BY_ROLL[faultRollResult - 1]
    : 0;
  const faultExtraPct = faultRollResult !== null && faultRollResult <= 4
    ? EXTRA_MAINTENANCE_TIME_BY_ROLL[faultRollResult - 1]
    : 0;
  const faultEffectiveTime = faultOutcome
    ? faultOutcome.repairTime + Math.ceil(faultOutcome.repairTime * (faultExtraPct / 100))
    : 0;

  // ── Phase 1: Klargöringsroll ──────────────────────────────────
  const handleRoll1 = () => {
    if (rolling) return;
    setRolling(true);
    setRoll1Display(null);
    animatedRoll(setRoll1Display, (result) => {
      setRoll1Result(result);
      setRolling(false);
      if (result <= 4) {
        // OK — auto-roll d3 for mission duration
        const d3 = Math.floor(Math.random() * 3) + 1;
        setMissionDuration(d3);
        setPhase("missionTime");
      } else {
        setPhase("faultSearch");
      }
    });
  };

  // ── Phase 3: Felidentifiering (loop until 1–4) ────────────────
  const handleFaultRoll = () => {
    if (rolling) return;
    setRolling(true);
    setFaultRollDisplay(null);
    animatedRoll(setFaultRollDisplay, (result) => {
      setFaultRollResult(result);
      setRolling(false);
      if (result <= 4) {
        setPhase("faultFound");
      } else {
        // 5 or 6 — add to history, stay in faultSearch
        setFaultSearchHistory((prev) => [...prev, result]);
        // stay in faultSearch phase
      }
    });
  };

  const handleSendToService = () => {
    if (!faultOutcome) return;
    onMaintenance(faultEffectiveTime, faultOutcome.faultType, faultWeaponLoss, faultOutcome.description);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="w-[520px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0C234C", border: "2px solid #D7AB3A" }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: "#081830", borderBottom: "1px solid #D7AB3A55" }}>
          <div className="flex items-center gap-3">
            <Dice6 className="h-5 w-5" style={{ color: "#D7AB3A" }} />
            <div>
              <div className="text-[10px] font-mono font-bold tracking-widest" style={{ color: "#D7AB3A" }}>
                KLARGÖRING — UPPSTARTS-BIT
              </div>
              <div className="text-base font-mono font-black text-white">
                {aircraft.tailNumber} · {aircraft.type}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Phase: roll1 — First dice roll ── */}
          {(phase === "roll1" || phase === "missionTime" || phase === "faultSearch") && (
            <div className="flex items-center gap-5">
              {/* Dice */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl font-black border-4 shadow-inner transition-colors ${
                  roll1Display === null
                    ? "border-gray-600 bg-gray-800 text-gray-600"
                    : roll1Result! <= 4
                    ? "border-green-500 bg-green-950 text-green-400"
                    : "border-red-500 bg-red-950 text-red-400"
                }`}>
                  {rolling && phase === "roll1" ? "⟳" : (roll1Display ?? "?")}
                </div>
                <span className="text-[9px] font-mono" style={{ color: "#8899bb" }}>Klargöringsroll</span>
              </div>

              {/* Instruction / result */}
              <div className="flex-1">
                {phase === "roll1" && roll1Display === null && (
                  <div>
                    <div className="text-sm font-mono font-bold text-white mb-1">Slå för klargöring</div>
                    <div className="text-[10px] font-mono" style={{ color: "#8899bb" }}>
                      1–4 = OK att flyga · 5–6 = Fel uppstår
                    </div>
                  </div>
                )}
                {phase === "missionTime" && (
                  <div className="rounded-xl p-3" style={{ background: "#0a2a1a", border: "1px solid #2a6a4a" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-mono font-black text-green-400">KLARGÖRING OK — {roll1Result}</span>
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: "#88cc99" }}>
                      Uppdraget beräknas ta <span className="font-bold text-white">{missionDuration} timme{missionDuration !== 1 ? "r" : ""}</span>
                    </div>
                  </div>
                )}
                {phase === "faultSearch" && roll1Result !== null && (
                  <div className="rounded-xl p-3" style={{ background: "#2a0a0a", border: "1px solid #6a2a2a" }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-mono font-black text-red-400">FEL VID UPPSTART — {roll1Result}</span>
                    </div>
                    <div className="text-[10px] font-mono mt-1" style={{ color: "#cc8888" }}>
                      Felidentifiering krävs. Slå tärning nedan.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Phase: faultSearch — Fault identification rolls ── */}
          {(phase === "faultSearch" || phase === "faultFound") && (
            <div>
              <div className="text-[9px] font-mono mb-2 font-bold tracking-wider" style={{ color: "#D7AB3A" }}>
                FELIDENTIFIERING
              </div>

              {/* History of 5/6 rolls (Felsökning liten) */}
              {faultSearchHistory.length > 0 && (
                <div className="mb-3 space-y-1">
                  {faultSearchHistory.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono"
                      style={{ background: "#2a1a3a", border: "1px solid #4a2a6a", color: "#aa88cc" }}>
                      <span className="font-black text-purple-400">⟳ Roll {i + 1}: {r}</span>
                      <span>— Felsökning liten (4h) — fel ej identifierat, slå igen</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-5">
                {/* Fault dice */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl font-black border-3 shadow-inner transition-colors ${
                    faultRollDisplay === null
                      ? "border-gray-600 bg-gray-800 text-gray-600"
                      : faultRollResult! <= 4
                      ? "border-amber-500 bg-amber-950 text-amber-400"
                      : "border-purple-500 bg-purple-950 text-purple-400"
                  }`} style={{ borderWidth: 3 }}>
                    {rolling && (phase === "faultSearch") ? "⟳" : (faultRollDisplay ?? "?")}
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: "#8899bb" }}>Feltypsroll</span>
                </div>

                {/* Result or instruction */}
                <div className="flex-1">
                  {phase === "faultSearch" && faultRollDisplay === null && faultSearchHistory.length === 0 && (
                    <div className="text-[10px] font-mono" style={{ color: "#8899bb" }}>
                      1–4 = Fel identifierat · 5–6 = Felsökning liten (4h), slå igen
                    </div>
                  )}
                  {phase === "faultSearch" && faultSearchHistory.length > 0 && faultRollDisplay !== null && !rolling && (
                    <div className="text-[10px] font-mono" style={{ color: "#aa88cc" }}>
                      Felet ej hittat. Fortsätt felsökning.
                    </div>
                  )}
                  {phase === "faultFound" && faultOutcome && (
                    <div className="rounded-xl p-3" style={{ background: "#2a1a0a", border: "1px solid #6a4a1a" }}>
                      <div className="text-[10px] font-mono font-black text-amber-400 mb-1">
                        ⚠ FEL IDENTIFIERAT — Roll {faultRollResult}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-white">{faultOutcome.description}</div>
                      <div className="mt-1.5 space-y-0.5 text-[9px] font-mono" style={{ color: "#bbaa88" }}>
                        <div>⏱ Tid: <span className="text-white font-bold">{faultEffectiveTime}h</span>
                          {faultExtraPct > 0 && <span className="text-amber-400"> (+{faultExtraPct}%)</span>}
                        </div>
                        <div>💣 Vapensystemsförlust: <span className="text-white font-bold">{faultWeaponLoss}%</span></div>
                        <div>🔧 {faultOutcome.faultType.replace(/_/g, " ")} · {faultOutcome.facility.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <AnimatePresence mode="wait">

            {/* Phase roll1: show rolling indicator while auto-rolling */}
            {phase === "roll1" && rolling && (
              <motion.div key="btn-roll1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="w-full py-3 rounded-xl font-mono font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "#1a2a3a", border: "1px solid #3a4a5a", color: "#D7AB3A" }}>
                  <Dice6 className="h-4 w-4 animate-spin" />
                  KLARGÖRING PÅGÅR…
                </div>
              </motion.div>
            )}

            {/* Phase missionTime: Kör or Avbryt */}
            {phase === "missionTime" && (
              <motion.div key="btn-mission" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#1a2a3a", border: "1px solid #3a4a5a", color: "#8899bb" }}
                >
                  ✕ Avbryt
                </button>
                <button
                  onClick={() => onMission(missionDuration!)}
                  className="flex-1 py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "#1a5a2a", border: "1px solid #4aD7AA", color: "#4aD7AA" }}
                >
                  <Plane className="h-4 w-4" />
                  KÖR! — Uppdrag {missionDuration}h
                </button>
              </motion.div>
            )}

            {/* Phase faultSearch: roll fault dice */}
            {phase === "faultSearch" && (
              <motion.div key="btn-fault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={handleFaultRoll}
                  disabled={rolling}
                  className="w-full py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#5a1a1a", border: "1px solid #aa3333", color: "#ff9988" }}
                >
                  <Dice6 className="h-4 w-4" />
                  {rolling ? "RULLAR…" : faultSearchHistory.length > 0 ? "SLÅ IGEN — FORTSÄTT FELSÖKNING" : "SLÅ TÄRNING FÖR FELTYP"}
                </button>
              </motion.div>
            )}

            {/* Phase faultFound: service or ignore */}
            {phase === "faultFound" && faultOutcome && (
              <motion.div key="btn-fault-found" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl font-mono font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                  style={{ background: "#1a2a3a", border: "1px solid #3a4a5a", color: "#8899bb" }}
                >
                  Ignorera
                </button>
                <button
                  onClick={handleSendToService}
                  className="flex-1 py-3 rounded-xl font-mono font-black text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: "#5a2a1a", border: "1px solid #D9192E", color: "#ff6655" }}
                >
                  🔧 Skicka till service ({faultEffectiveTime}h)
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
