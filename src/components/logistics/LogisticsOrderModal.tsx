import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Box, Boxes, Crosshair, Fuel, Package, Shield,
  Truck, Users, X, Zap,
} from "lucide-react";
import type { Base, BaseType, GameState } from "@/types/game";
import {
  fleetAllocationPerBase, snapshotBase,
  FUEL_BURN_PCT_PER_HOUR, AMMO_BURN_PCT_PER_DAY,
} from "@/core/logistics";
import { BASE_COORDS } from "@/pages/map/constants";

// ── Palette (mirrored from LogisticsAnalysis.tsx) ────────────────────────────
const NAVY = "#0C234C";
const RED = "#D9192E";
const GOLD = "#D7AB3A";
const GREEN = "#22A05A";
const ORANGE = "#D97706";
const BLUE = "#3B82F6";
const PURPLE = "#7C3AED";
const SLATE = "hsl(218 15% 50%)";
const BORDER = "hsl(215 14% 86%)";

const BOWSER_LITERS_PER_RUN = 6000;
const CONVOY_KMH = 80;
/** Detour factor — straight-line × this ≈ road distance. */
const ROUTE_DETOUR = 1.3;

// ── Resource model ───────────────────────────────────────────────────────────
export type ResourceKind = "fuel" | "ammo" | "parts" | "personnel";

export type TransferResource =
  | { kind: "fuel"; liters: number }
  | { kind: "ammo"; ammoType: string; rounds: number }
  | { kind: "parts"; partId: string; partName: string; quantity: number }
  | { kind: "personnel"; role: string; count: number };

export interface OrderEscort {
  bowsers: number;
  trucks: number;
  armored: number;
}

export interface DraftOrder {
  donor: BaseType | null;
  acceptor: BaseType | null;
  resource: TransferResource;
  escort: OrderEscort;
}

export interface ConfirmedOrder {
  donor: BaseType;
  acceptor: BaseType;
  resource: TransferResource;
  escort: OrderEscort;
  etaMinutes: number;
}

export interface ModalPrefill {
  donor?: BaseType;
  acceptor?: BaseType;
  kind?: ResourceKind;
  fuelLiters?: number;
  ammoType?: string;
  ammoRounds?: number;
  partId?: string;
  partQuantity?: number;
  personnelRole?: string;
  personnelCount?: number;
  /** When provided, modal title becomes this string. */
  title?: string;
  /** When set, the calling rec id is dismissed only on confirm. */
  recId?: string;
}

interface Props {
  open: boolean;
  state: GameState;
  prefill?: ModalPrefill | null;
  onClose: () => void;
  onConfirm: (order: ConfirmedOrder, recId: string | null) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function transitMinutes(donor: BaseType, acceptor: BaseType): number {
  const a = BASE_COORDS[donor];
  const b = BASE_COORDS[acceptor];
  if (!a || !b) return 0;
  const km = haversineKm(a, b) * ROUTE_DETOUR;
  return Math.round((km / CONVOY_KMH) * 60);
}

function formatMinutes(min: number): string {
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `~${h} h` : `~${h} h ${m} min`;
}

function threatLevel(phase: GameState["phase"]): { label: string; color: string } {
  switch (phase) {
    case "FRED": return { label: "LÅG", color: GREEN };
    case "KRIS": return { label: "MEDEL", color: GOLD };
    case "KRIG": return { label: "HÖG", color: RED };
  }
}

// ── Mini bar (preview deltas) ────────────────────────────────────────────────
function DeltaBar({ label, before, after, color }: { label: string; before: number; after: number; color: string }) {
  const delta = after - before;
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: SLATE }}>{label}</span>
        <span className="text-[9px] font-mono font-black" style={{ color: NAVY }}>
          {before}% → <span style={{ color }}>{after}%</span>
          <span className="ml-1.5 text-[8px]" style={{ color: delta < 0 ? RED : delta > 0 ? GREEN : SLATE }}>
            ({delta > 0 ? "+" : ""}{delta} pp)
          </span>
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "hsl(216 18% 92%)" }}>
        <div style={{ width: `${before}%`, height: "100%", background: `${color}55`, position: "absolute", inset: 0 }} />
        <motion.div
          animate={{ width: `${after}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ height: "100%", background: color, position: "absolute", inset: 0 }}
        />
      </div>
    </div>
  );
}

// ── Tab pill ─────────────────────────────────────────────────────────────────
function TabPill({ active, onClick, icon: Icon, label, accent }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; accent: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono font-bold transition-all uppercase tracking-wide"
      style={{
        background: active ? accent : "transparent",
        color: active ? "white" : SLATE,
        border: `1px solid ${active ? accent : BORDER}`,
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function LogisticsOrderModal({ open, state, prefill, onClose, onConfirm }: Props) {
  const fleet = useMemo(() => fleetAllocationPerBase(state), [state]);
  const phase = state.phase;
  const threat = threatLevel(phase);

  // ── form state ───
  const [donor, setDonor] = useState<BaseType | null>(null);
  const [acceptor, setAcceptor] = useState<BaseType | null>(null);
  const [kind, setKind] = useState<ResourceKind>("fuel");
  const [fuelLiters, setFuelLiters] = useState(0);
  const [ammoType, setAmmoType] = useState<string>("");
  const [ammoRounds, setAmmoRounds] = useState(0);
  const [partId, setPartId] = useState<string>("");
  const [partQuantity, setPartQuantity] = useState(0);
  const [personnelRole, setPersonnelRole] = useState<string>("");
  const [personnelCount, setPersonnelCount] = useState(0);
  const [escort, setEscort] = useState<OrderEscort>({ bowsers: 0, trucks: 0, armored: 0 });

  // Reset on open / apply prefill
  useEffect(() => {
    if (!open) return;
    setDonor(prefill?.donor ?? null);
    setAcceptor(prefill?.acceptor ?? null);
    setKind(prefill?.kind ?? "fuel");
    setFuelLiters(prefill?.fuelLiters ?? 0);
    setAmmoType(prefill?.ammoType ?? "");
    setAmmoRounds(prefill?.ammoRounds ?? 0);
    setPartId(prefill?.partId ?? "");
    setPartQuantity(prefill?.partQuantity ?? 0);
    setPersonnelRole(prefill?.personnelRole ?? "");
    setPersonnelCount(prefill?.personnelCount ?? 0);
    setEscort({ bowsers: 0, trucks: 0, armored: 0 });
  }, [open, prefill]);

  const donorBase = donor ? state.bases.find((b) => b.id === donor) : null;
  const acceptorBase = acceptor ? state.bases.find((b) => b.id === acceptor) : null;
  const donorFleet = donor ? fleet.find((f) => f.baseId === donor) : null;

  // Auto pre-fill ammo / part / role first option when relevant
  useEffect(() => {
    if (!donorBase) return;
    if (kind === "ammo" && !ammoType && donorBase.ammunition.length > 0) {
      setAmmoType(donorBase.ammunition[0].type);
    }
    if (kind === "parts" && !partId) {
      const usable = donorBase.spareParts.find((p) => p.quantity > 0);
      if (usable) setPartId(usable.id);
    }
    if (kind === "personnel" && !personnelRole && donorBase.personnel.length > 0) {
      setPersonnelRole(donorBase.personnel[0].role);
    }
  }, [donorBase, kind, ammoType, partId, personnelRole]);

  // Auto pre-fill an escort when fuel chosen and bowsers available
  useEffect(() => {
    if (!donorFleet) return;
    if (kind === "fuel" && escort.bowsers === 0 && donorFleet.bowsers > 0) {
      setEscort((e) => ({ ...e, bowsers: Math.min(donorFleet.bowsers, 2) }));
    }
  }, [donorFleet, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── derived preview values ───
  const fuelBurn = FUEL_BURN_PCT_PER_HOUR[phase];
  const ammoBurn = AMMO_BURN_PCT_PER_DAY[phase];
  const donorSnap = donorBase ? snapshotBase(donorBase, phase) : null;
  const acceptorSnap = acceptorBase ? snapshotBase(acceptorBase, phase) : null;

  let donorBefore = 0, donorAfter = 0, acceptorBefore = 0, acceptorAfter = 0;
  let dosGain = 0;
  let resourceLabel = "";
  let resourceColor = ORANGE;

  if (kind === "fuel" && donorBase && donorSnap && acceptorSnap) {
    donorBefore = donorSnap.fuelPct;
    acceptorBefore = acceptorSnap.fuelPct;
    const ppTransfer = fuelLiters / 800; // inverse of L = pct * 800
    donorAfter = Math.max(0, Math.round(donorBefore - ppTransfer));
    acceptorAfter = Math.min(100, Math.round(acceptorBefore + ppTransfer));
    dosGain = fuelBurn > 0 ? ppTransfer / (fuelBurn * 24) : 0;
    resourceLabel = "Bränsle";
    resourceColor = ORANGE;
  } else if (kind === "ammo" && donorBase && donorSnap && acceptorSnap) {
    donorBefore = donorSnap.ammoPct;
    acceptorBefore = acceptorSnap.ammoPct;
    const ammoMax = donorBase.ammunition.find((a) => a.type === ammoType)?.max ?? 0;
    const accMax = acceptorBase?.ammunition.find((a) => a.type === ammoType)?.max ?? 0;
    const dpct = ammoMax > 0 ? (ammoRounds / ammoMax) * 100 : 0;
    const apct = accMax > 0 ? (ammoRounds / accMax) * 100 : 0;
    donorAfter = Math.max(0, Math.round(donorBefore - dpct / donorBase.ammunition.length));
    acceptorAfter = Math.min(100, Math.round(acceptorBefore + apct / (acceptorBase?.ammunition.length || 1)));
    dosGain = ammoBurn > 0 ? apct / ammoBurn : 0;
    resourceLabel = "Ammunition";
    resourceColor = BLUE;
  } else if (kind === "parts" && donorSnap && acceptorSnap) {
    donorBefore = donorSnap.partsPct;
    acceptorBefore = acceptorSnap.partsPct;
    donorAfter = Math.max(0, Math.round(donorBefore - partQuantity * 5));
    acceptorAfter = Math.min(100, Math.round(acceptorBefore + partQuantity * 5));
    resourceLabel = "Reservdelar";
    resourceColor = PURPLE;
  } else if (kind === "personnel" && donorSnap && acceptorSnap) {
    donorBefore = donorSnap.personnelPct;
    acceptorBefore = acceptorSnap.personnelPct;
    donorAfter = Math.max(0, Math.round(donorBefore - personnelCount));
    acceptorAfter = Math.min(100, Math.round(acceptorBefore + personnelCount));
    resourceLabel = "Personal";
    resourceColor = GREEN;
  }

  const eta = donor && acceptor ? transitMinutes(donor, acceptor) : 0;
  const escortTotal = escort.bowsers + escort.trucks + escort.armored;
  const bowserCapacity = escort.bowsers * BOWSER_LITERS_PER_RUN;

  // ── validation ───
  const validResource =
    (kind === "fuel" && fuelLiters > 0) ||
    (kind === "ammo" && ammoType && ammoRounds > 0) ||
    (kind === "parts" && partId && partQuantity > 0) ||
    (kind === "personnel" && personnelRole && personnelCount > 0);

  const overstock =
    (kind === "fuel" && donorBase && fuelLiters > donorBase.fuel * 800) ||
    (kind === "ammo" && donorBase && ammoRounds > (donorBase.ammunition.find((a) => a.type === ammoType)?.quantity ?? 0)) ||
    (kind === "parts" && donorBase && partQuantity > (donorBase.spareParts.find((p) => p.id === partId)?.quantity ?? 0)) ||
    (kind === "personnel" && donorBase && personnelCount > (donorBase.personnel.find((p) => p.role === personnelRole)?.available ?? 0));

  const valid =
    !!donor && !!acceptor && donor !== acceptor &&
    !!validResource && !overstock &&
    escortTotal > 0 &&
    !(kind === "fuel" && escort.bowsers === 0);

  // ── confirm ───
  const handleConfirm = () => {
    if (!valid || !donor || !acceptor) return;
    let resource: TransferResource;
    if (kind === "fuel") resource = { kind: "fuel", liters: fuelLiters };
    else if (kind === "ammo") resource = { kind: "ammo", ammoType, rounds: ammoRounds };
    else if (kind === "parts") {
      const p = donorBase?.spareParts.find((x) => x.id === partId);
      resource = { kind: "parts", partId, partName: p?.name ?? partId, quantity: partQuantity };
    }
    else resource = { kind: "personnel", role: personnelRole, count: personnelCount };

    onConfirm({ donor, acceptor, resource, escort, etaMinutes: eta }, prefill?.recId ?? null);
  };

  // ── render ───
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ background: "rgba(12, 35, 76, 0.55)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="rounded-2xl bg-white overflow-hidden flex flex-col"
            style={{
              width: "min(960px, 96vw)",
              maxHeight: "90vh",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 30px 80px rgba(12,35,76,0.35)",
              fontFamily: "monospace",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER, background: `linear-gradient(90deg, ${GOLD}10, transparent)` }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: `${GOLD}1a`, border: `1px solid ${GOLD}55` }}>
                  <Boxes size={13} color={GOLD} />
                </div>
                <div>
                  <div className="text-[8px] font-mono font-bold uppercase tracking-widest" style={{ color: SLATE }}>Ny logistikorder</div>
                  <div className="text-[13px] font-mono font-black" style={{ color: NAVY }}>
                    {prefill?.title ?? "Skicka resurser mellan baser"}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-gray-100" aria-label="Stäng">
                <X size={14} color={SLATE} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2">
              {/* ── LEFT: form ── */}
              <div className="p-5 space-y-4 border-r" style={{ borderColor: BORDER }}>
                <FormSection label="Från bas (donor)">
                  <div className="flex flex-wrap gap-1.5">
                    {state.bases.map((b) => (
                      <BasePill key={b.id} base={b} active={donor === b.id} onClick={() => setDonor(b.id)} />
                    ))}
                  </div>
                </FormSection>

                <FormSection label="Till bas (acceptor)">
                  <div className="flex flex-wrap gap-1.5">
                    {state.bases.map((b) => (
                      <BasePill
                        key={b.id} base={b}
                        active={acceptor === b.id}
                        disabled={donor === b.id}
                        onClick={() => setAcceptor(b.id)}
                      />
                    ))}
                  </div>
                </FormSection>

                <FormSection label="Resurstyp">
                  <div className="flex flex-wrap gap-1.5">
                    <TabPill active={kind === "fuel"} onClick={() => setKind("fuel")} icon={Fuel} label="Bränsle" accent={ORANGE} />
                    <TabPill active={kind === "ammo"} onClick={() => setKind("ammo")} icon={Zap} label="Ammunition" accent={BLUE} />
                    <TabPill active={kind === "parts"} onClick={() => setKind("parts")} icon={Package} label="Reservdel" accent={PURPLE} />
                    <TabPill active={kind === "personnel"} onClick={() => setKind("personnel")} icon={Users} label="Personal" accent={GREEN} />
                  </div>
                </FormSection>

                {kind === "fuel" && donorBase && (
                  <FormSection label={`Mängd bränsle · max ${(donorBase.fuel * 800).toLocaleString("sv-SE")} L`}>
                    <input
                      type="range"
                      min={0}
                      max={Math.round(donorBase.fuel * 800)}
                      step={500}
                      value={fuelLiters}
                      onChange={(e) => setFuelLiters(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: ORANGE }}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[14px] font-mono font-black" style={{ color: NAVY }}>
                        {fuelLiters.toLocaleString("sv-SE")} L
                      </span>
                      <div className="flex items-center gap-1">
                        {[
                          { label: "25%", v: Math.round(donorBase.fuel * 800 * 0.25) },
                          { label: "50%", v: Math.round(donorBase.fuel * 800 * 0.5) },
                          { label: "Maxa konvoj", v: Math.min(Math.round(donorBase.fuel * 800), (donorFleet?.bowserCapacityLiters ?? 0)) },
                        ].map((q) => (
                          <button key={q.label}
                            onClick={() => setFuelLiters(q.v)}
                            className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded transition-all hover:brightness-90"
                            style={{ background: `${ORANGE}18`, color: ORANGE, border: `1px solid ${ORANGE}33` }}>
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormSection>
                )}

                {kind === "ammo" && donorBase && (
                  <FormSection label="Ammunitionstyp & antal">
                    <div className="flex items-center gap-2">
                      <select value={ammoType} onChange={(e) => setAmmoType(e.target.value)}
                        className="text-[10px] font-mono px-2 py-1.5 rounded bg-white"
                        style={{ border: `1px solid ${BORDER}`, color: NAVY }}>
                        {donorBase.ammunition.map((a) => (
                          <option key={a.type} value={a.type}>{a.type} ({a.quantity}/{a.max})</option>
                        ))}
                      </select>
                      <NumberInput
                        value={ammoRounds}
                        max={donorBase.ammunition.find((a) => a.type === ammoType)?.quantity ?? 0}
                        onChange={setAmmoRounds}
                      />
                      <span className="text-[9px] font-mono" style={{ color: SLATE }}>st</span>
                    </div>
                  </FormSection>
                )}

                {kind === "parts" && donorBase && (
                  <FormSection label="Reservdel & antal">
                    <div className="flex items-center gap-2">
                      <select value={partId} onChange={(e) => setPartId(e.target.value)}
                        className="text-[10px] font-mono px-2 py-1.5 rounded bg-white"
                        style={{ border: `1px solid ${BORDER}`, color: NAVY }}>
                        {donorBase.spareParts.filter((p) => p.quantity > 0).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.quantity}/{p.maxQuantity})</option>
                        ))}
                      </select>
                      <NumberInput
                        value={partQuantity}
                        max={donorBase.spareParts.find((p) => p.id === partId)?.quantity ?? 0}
                        onChange={setPartQuantity}
                      />
                      <span className="text-[9px] font-mono" style={{ color: SLATE }}>st</span>
                    </div>
                  </FormSection>
                )}

                {kind === "personnel" && donorBase && (
                  <FormSection label="Personal & antal">
                    <div className="flex items-center gap-2">
                      <select value={personnelRole} onChange={(e) => setPersonnelRole(e.target.value)}
                        className="text-[10px] font-mono px-2 py-1.5 rounded bg-white"
                        style={{ border: `1px solid ${BORDER}`, color: NAVY }}>
                        {donorBase.personnel.map((p) => (
                          <option key={p.id} value={p.role}>{p.role} ({p.available}/{p.total})</option>
                        ))}
                      </select>
                      <NumberInput
                        value={personnelCount}
                        max={donorBase.personnel.find((p) => p.role === personnelRole)?.available ?? 0}
                        onChange={setPersonnelCount}
                      />
                      <span className="text-[9px] font-mono" style={{ color: SLATE }}>st</span>
                    </div>
                  </FormSection>
                )}

                <FormSection label="Eskort">
                  <div className="grid grid-cols-3 gap-2">
                    {kind === "fuel" && (
                      <EscortPicker
                        icon={Fuel} color={ORANGE} label="Tankbil"
                        value={escort.bowsers} max={donorFleet?.bowsers ?? 0}
                        onChange={(v) => setEscort({ ...escort, bowsers: v })}
                      />
                    )}
                    <EscortPicker
                      icon={Truck} color={BLUE} label="Lastbil"
                      value={escort.trucks} max={donorFleet?.trucks ?? 0}
                      onChange={(v) => setEscort({ ...escort, trucks: v })}
                    />
                    <EscortPicker
                      icon={Shield} color={PURPLE} label="Pansrad"
                      value={escort.armored} max={donorFleet?.armored ?? 0}
                      onChange={(v) => setEscort({ ...escort, armored: v })}
                    />
                  </div>
                </FormSection>
              </div>

              {/* ── RIGHT: konsekvens preview ── */}
              <div className="p-5 space-y-4" style={{ background: "hsl(216 18% 98%)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: SLATE }}>Konsekvens</span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{ background: `${threat.color}18`, color: threat.color, border: `1px solid ${threat.color}55` }}>
                    Hotnivå · {threat.label}
                  </span>
                </div>

                {donor && acceptor ? (
                  <>
                    <div className="rounded-lg p-3" style={{ background: "white", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Box size={11} color={NAVY} />
                        <span className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: NAVY }}>{donor} (donor)</span>
                      </div>
                      <DeltaBar label={resourceLabel} before={donorBefore} after={donorAfter} color={resourceColor} />
                    </div>

                    <div className="rounded-lg p-3" style={{ background: "white", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Box size={11} color={NAVY} />
                          <span className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: NAVY }}>{acceptor} (acceptor)</span>
                        </div>
                        {kind === "fuel" && dosGain > 0 && (
                          <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded"
                            style={{ background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}55` }}>
                            +{dosGain.toFixed(1)}d DOS
                          </span>
                        )}
                      </div>
                      <DeltaBar label={resourceLabel} before={acceptorBefore} after={acceptorAfter} color={resourceColor} />
                    </div>

                    <div className="rounded-lg p-3" style={{ background: "white", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Crosshair size={11} color={NAVY} />
                          <span className="text-[9px] font-mono font-black uppercase tracking-wider" style={{ color: NAVY }}>Konvoj</span>
                        </div>
                        <span className="text-[12px] font-mono font-black" style={{ color: NAVY }}>{formatMinutes(eta)}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded" style={{ background: "hsl(216 18% 96%)" }}>
                        <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{donor}</span>
                        <ArrowRight size={11} color={GOLD} />
                        <span className="text-[10px] font-mono font-black" style={{ color: NAVY }}>{acceptor}</span>
                        <span className="text-[8px] font-mono ml-auto" style={{ color: SLATE }}>
                          {haversineKm(BASE_COORDS[donor], BASE_COORDS[acceptor]).toFixed(0)} km · ×{ROUTE_DETOUR.toFixed(2)} rutt
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {escort.bowsers > 0 && <EscortBadge color={ORANGE} icon={Fuel} count={escort.bowsers} label={`Tankbil · ${bowserCapacity.toLocaleString("sv-SE")} L`} />}
                        {escort.trucks > 0 && <EscortBadge color={BLUE} icon={Truck} count={escort.trucks} label="Lastbil" />}
                        {escort.armored > 0 && <EscortBadge color={PURPLE} icon={Shield} count={escort.armored} label="Pansrad" />}
                        {escortTotal === 0 && <span className="text-[9px] font-mono italic" style={{ color: RED }}>Ingen eskort vald</span>}
                      </div>
                    </div>

                    {overstock && (
                      <div className="rounded p-2 text-[9px] font-mono leading-snug"
                        style={{ background: `${RED}10`, color: RED, border: `1px solid ${RED}40` }}>
                        Mängden överstiger donor-lager — justera nedåt.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg p-4 text-center" style={{ background: "white", border: `1px dashed ${BORDER}` }}>
                    <span className="text-[10px] font-mono" style={{ color: SLATE }}>
                      Välj donor och acceptor för att se konsekvens.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: BORDER, background: "hsl(216 18% 98%)" }}>
              <button onClick={onClose}
                className="px-4 py-2 rounded text-[10px] font-mono font-bold transition-all hover:bg-gray-100"
                style={{ color: SLATE, border: `1px solid ${BORDER}`, background: "white" }}>
                Avbryt
              </button>
              <button
                onClick={handleConfirm}
                disabled={!valid}
                className="px-4 py-2 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-2"
                style={{
                  background: valid ? GOLD : "hsl(216 18% 92%)",
                  color: valid ? NAVY : SLATE,
                  border: `1px solid ${valid ? GOLD : BORDER}`,
                  cursor: valid ? "pointer" : "not-allowed",
                  opacity: valid ? 1 : 0.7,
                }}>
                Bekräfta & dispatcha
                <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: SLATE }}>{label}</div>
      {children}
    </div>
  );
}

function BasePill({ base, active, disabled, onClick }: {
  base: Base; active: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded text-left transition-all"
      style={{
        background: active ? NAVY : "white",
        color: active ? "white" : disabled ? SLATE : NAVY,
        border: `1px solid ${active ? NAVY : BORDER}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div className="text-[11px] font-mono font-black leading-none">{base.id}</div>
      <div className="text-[8px] font-mono mt-0.5" style={{ color: active ? "rgba(255,255,255,0.7)" : SLATE }}>{base.name}</div>
    </button>
  );
}

function NumberInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={(e) => {
        const v = Math.max(0, Math.min(max, Number(e.target.value) || 0));
        onChange(v);
      }}
      className="text-[10px] font-mono px-2 py-1.5 rounded bg-white w-20"
      style={{ border: `1px solid ${BORDER}`, color: NAVY }}
    />
  );
}

function EscortPicker({ icon: Icon, color, label, value, max, onChange }: {
  icon: React.ElementType; color: string; label: string;
  value: number; max: number; onChange: (v: number) => void;
}) {
  const disabled = max === 0;
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: `${color}0d`, border: `1px solid ${color}33`, opacity: disabled ? 0.4 : 1 }}>
      <Icon size={12} color={color} className="mx-auto mb-1" />
      <div className="text-[8px] font-mono uppercase tracking-wider mb-1" style={{ color: SLATE }}>{label}</div>
      <div className="flex items-center justify-center gap-1">
        <button
          disabled={disabled || value === 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-5 h-5 rounded text-[10px] font-mono font-bold transition-all"
          style={{ background: "white", color: NAVY, border: `1px solid ${BORDER}`, opacity: disabled || value === 0 ? 0.4 : 1 }}
        >−</button>
        <span className="text-[12px] font-mono font-black w-6 text-center" style={{ color: NAVY }}>{value}</span>
        <button
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-5 h-5 rounded text-[10px] font-mono font-bold transition-all"
          style={{ background: "white", color: NAVY, border: `1px solid ${BORDER}`, opacity: disabled || value >= max ? 0.4 : 1 }}
        >+</button>
      </div>
      <div className="text-[8px] font-mono mt-1" style={{ color: SLATE }}>av {max}</div>
    </div>
  );
}

function EscortBadge({ color, icon: Icon, count, label }: { color: string; icon: React.ElementType; count: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}10`, color, border: `1px solid ${color}40` }}>
      <Icon size={9} />
      {count}× {label}
    </span>
  );
}
