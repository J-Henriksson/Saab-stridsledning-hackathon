import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Fuel, Package, Shield, Truck, Users, X, Zap,
} from "lucide-react";
import type { OrderEscort, TransferResource } from "./LogisticsOrderModal";
import type { BaseType } from "@/types/game";

const NAVY = "#0C234C";
const RED = "#D9192E";
const GOLD = "#D7AB3A";
const GREEN = "#22A05A";
const ORANGE = "#D97706";
const BLUE = "#3B82F6";
const PURPLE = "#7C3AED";
const SLATE = "hsl(218 15% 50%)";
const BORDER = "hsl(215 14% 86%)";

export type TransferStatus = "preparing" | "in_transit" | "arriving" | "delivered" | "cancelled";

export interface PendingTransfer {
  id: string;
  donor: BaseType;
  acceptor: BaseType;
  resource: TransferResource;
  escort: OrderEscort;
  etaMinutes: number;
  /** 0..1, advanced by setInterval. */
  progress: number;
  status: TransferStatus;
  dispatchedAtMs: number;
}

const statusMeta: Record<TransferStatus, { label: string; color: string }> = {
  preparing: { label: "FÖRBEREDER", color: SLATE },
  in_transit: { label: "I TRANSIT", color: BLUE },
  arriving: { label: "INGÅR FRAMME", color: GOLD },
  delivered: { label: "LEVERERAT", color: GREEN },
  cancelled: { label: "AVBRUTEN", color: SLATE },
};

function resourceLabel(r: TransferResource): { text: string; color: string; icon: React.ElementType } {
  switch (r.kind) {
    case "fuel": return { text: `${r.liters.toLocaleString("sv-SE")} L bränsle`, color: ORANGE, icon: Fuel };
    case "ammo": return { text: `${r.rounds}× ${r.ammoType}`, color: BLUE, icon: Zap };
    case "parts": return { text: `${r.quantity}× ${r.partName}`, color: PURPLE, icon: Package };
    case "personnel": return { text: `${r.count}× ${r.role}`, color: GREEN, icon: Users };
  }
}

function etaCountdownText(t: PendingTransfer): string {
  if (t.status === "delivered") return "Levererat";
  if (t.status === "cancelled") return "Avbruten";
  const elapsedMs = Date.now() - t.dispatchedAtMs;
  const etaMs = t.etaMinutes * 60 * 1000;
  const remainingMs = Math.max(0, etaMs * (1 - t.progress));
  const remainingMin = Math.ceil(remainingMs / 60000);
  if (remainingMin >= 60) {
    const h = Math.floor(remainingMin / 60);
    const m = remainingMin % 60;
    return m === 0 ? `~${h} h kvar` : `~${h} h ${m} min kvar`;
  }
  return remainingMin <= 1 ? "<1 min kvar" : `~${remainingMin} min kvar`;
}

export function ActiveOrdersCard({ orders, onCancel }: {
  orders: PendingTransfer[];
  onCancel: (id: string) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-white" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px hsl(220 63% 18% / 0.06)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "hsl(215 14% 90%)", background: `linear-gradient(90deg, ${GOLD}0e, transparent)` }}>
        <div className="flex items-center gap-2">
          <Truck size={13} color={GOLD} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: NAVY }}>
            Aktiva logistikorder · {orders.length}
          </span>
        </div>
        {orders.length > 0 && (
          <span className="text-[8px] font-mono" style={{ color: SLATE }}>
            Spårning i realtid
          </span>
        )}
      </div>

      <div className="p-4 space-y-2">
        {orders.length === 0 ? (
          <div className="text-[10px] font-mono italic px-1 py-2" style={{ color: SLATE }}>
            Inga aktiva order. Skicka resurser via knapparna ovan.
          </div>
        ) : (
          <AnimatePresence>
            {orders.map((o) => {
              const meta = statusMeta[o.status];
              const res = resourceLabel(o.resource);
              const Icon = res.icon;
              const isDone = o.status === "delivered" || o.status === "cancelled";

              return (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: o.status === "delivered" ? `${GREEN}08` : "white",
                    border: `1px solid ${o.status === "delivered" ? `${GREEN}40` : BORDER}`,
                  }}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "hsl(216 18% 96%)" }}>
                        <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{o.donor}</span>
                        <ArrowRight size={9} color={GOLD} />
                        <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{o.acceptor}</span>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                        style={{ background: `${res.color}10`, border: `1px solid ${res.color}33` }}>
                        <Icon size={10} color={res.color} />
                        <span className="text-[9px] font-mono font-bold" style={{ color: res.color }}>{res.text}</span>
                      </div>
                      <span className="ml-auto text-[8px] font-mono font-black px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}55` }}>
                        {o.status === "delivered" && <CheckCircle2 size={9} />}
                        {meta.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "hsl(216 18% 92%)" }}>
                      <motion.div
                        animate={{ width: `${Math.round(o.progress * 100)}%` }}
                        transition={{ duration: 0.3, ease: "linear" }}
                        style={{
                          height: "100%",
                          background: o.status === "cancelled"
                            ? SLATE
                            : o.status === "delivered"
                              ? GREEN
                              : meta.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {o.escort.bowsers > 0 && (
                          <EscortBadge color={ORANGE} icon={Fuel} count={o.escort.bowsers} label="Tankbil" />
                        )}
                        {o.escort.trucks > 0 && (
                          <EscortBadge color={BLUE} icon={Truck} count={o.escort.trucks} label="Lastbil" />
                        )}
                        {o.escort.armored > 0 && (
                          <EscortBadge color={PURPLE} icon={Shield} count={o.escort.armored} label="Pansrad" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono" style={{ color: SLATE }}>
                          {etaCountdownText(o)}
                        </span>
                        {!isDone && (
                          <button
                            onClick={() => onCancel(o.id)}
                            className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition-all hover:brightness-95"
                            style={{ background: "white", color: RED, border: `1px solid ${RED}55` }}
                          >
                            <X size={9} />
                            Avbryt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EscortBadge({ color, icon: Icon, count, label }: { color: string; icon: React.ElementType; count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}10`, color, border: `1px solid ${color}40` }}>
      <Icon size={8} />
      {count}× {label}
    </span>
  );
}
