import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/context/GameContext";
import { isDrone } from "@/types/units";
import { TopBar } from "@/components/game/TopBar";
import {
  ArrowLeft, Radio, RotateCcw, MapPin, Shield, Activity,
  Navigation, Cpu, Wifi, Zap, Eye, Crosshair, Wrench,
} from "lucide-react";
import droneSilhouette from "@/assets/drone.png";

const STATUS_MAP: Record<string, { label: string; cls: string; color: string }> = {
  ready:             { label: "Klar",         cls: "text-green-400 bg-green-400/10 border-green-400/40",     color: "hsl(152 60% 38%)" },
  allocated:         { label: "Tilldelad",    cls: "text-blue-400 bg-blue-400/10 border-blue-400/40",       color: "#3b82f6" },
  on_mission:        { label: "På uppdrag",   cls: "text-blue-400 bg-blue-400/10 border-blue-400/40",       color: "#3b82f6" },
  returning:         { label: "Återvänder",   cls: "text-purple-400 bg-purple-400/10 border-purple-400/40", color: "#a855f7" },
  under_maintenance: { label: "Underhåll",    cls: "text-amber-400 bg-amber-400/10 border-amber-400/40",    color: "#d97706" },
  unavailable:       { label: "Ej operativ",  cls: "text-red-400 bg-red-400/10 border-red-400/40",          color: "#ef4444" },
};

function healthColor(v: number) {
  return v >= 70 ? "hsl(152 60% 38%)" : v >= 40 ? "#d97706" : "#D9192E";
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[9px] font-mono uppercase tracking-widest mb-4"
      style={{ color: "rgba(215,222,225,0.35)" }}>{label}</div>
  );
}

type Tab = "oversikt" | "uppdrag" | "system";

export default function DronePage() {
  const { droneId } = useParams<{ droneId: string }>();
  const { state, togglePause, setGameSpeed, resetGame, recallDrone } = useGame();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("oversikt");

  const allDrones = [
    ...state.bases.flatMap((b) => b.units.filter(isDrone)),
    ...state.deployedUnits.filter(isDrone),
  ];
  const drone = allDrones.find((d) => d.id === droneId);
  const dashboardHref = `/dashboard/${drone?.currentBase ?? drone?.lastBase ?? "MOB"}`;

  if (!drone) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono" style={{ background: "#0C234C" }}>
        <div className="text-center space-y-3">
          <div className="text-2xl font-black text-[#D7DEE1]">Drönare ej hittad</div>
          <div className="text-[11px] text-[#D7DEE1]/50">ID "{droneId}" existerar inte.</div>
          <Link to="/dashboard/MOB" className="inline-flex items-center gap-1.5 text-[10px] text-[#D7DEE1]/50 hover:text-[#D7DEE1] mt-4">
            <ArrowLeft className="h-3 w-3" /> Tillbaka till huvudbas
          </Link>
        </div>
      </div>
    );
  }

  const sm = STATUS_MAP[drone.status] ?? STATUS_MAP.unavailable;
  const fuelColor = healthColor(drone.fuel);
  const canRecall = drone.affiliation !== "hostile" && (drone.status === "on_mission" || drone.status === "returning");
  const homeBase = drone.currentBase ?? drone.lastBase ?? "–";
  const activeWaypoint = drone.waypoints?.[drone.currentWaypointIdx];
  const enduranceRemaining = +(drone.enduranceHours * (drone.fuel / 100)).toFixed(1);

  // Derive pseudo sub-system health from drone.health (stable, deterministic)
  const h = drone.health ?? 100;
  const seed = drone.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const vary = (base: number, offset: number) => Math.max(0, Math.min(100, Math.round(base + ((seed * offset) % 7) - 3)));
  const systems = [
    { id: "propulsion", label: "Framdrivning",  icon: Zap,        health: vary(h, 1) },
    { id: "sensor",     label: "Sensor",         icon: Eye,        health: vary(h, 2) },
    { id: "comms",      label: "Kommunikation",  icon: Wifi,       health: vary(h, 3) },
    { id: "nav",        label: "Navigation",     icon: Navigation, health: vary(h, 4) },
    { id: "cpu",        label: "Styrsystem",     icon: Cpu,        health: vary(h, 5) },
    { id: "power",      label: "Kraft / EPS",    icon: Activity,   health: vary(h, 6) },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "oversikt", label: "Översikt",  icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "uppdrag",  label: "Uppdrag",   icon: <Crosshair className="h-3.5 w-3.5" /> },
    { id: "system",   label: "System",    icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen font-mono flex flex-col" style={{ background: "#0C234C" }}>
      <TopBar state={state} onTogglePause={togglePause} onSetSpeed={setGameSpeed} onReset={resetGame} />

      {/* ── HEADER ── */}
      <header className="relative overflow-hidden border-b"
        style={{ borderColor: "rgba(215,222,225,0.12)", background: "linear-gradient(180deg, rgba(10,28,62,1) 0%, rgba(8,20,48,1) 100%)" }}>
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(215,222,225,1) 1px, transparent 1px), linear-gradient(90deg, rgba(215,222,225,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-6">
            {/* Identity */}
            <div className="flex-1 space-y-2 min-w-0">
              <Link to={dashboardHref} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#D7DEE1]/40 hover:text-[#D7DEE1] transition-colors">
                <ArrowLeft className="h-3 w-3" /> TILLBAKA TILL HUVUDBAS
              </Link>
              <div className="flex items-end gap-4 flex-wrap">
                <h1 className="text-5xl font-black tracking-tight text-white leading-none">{drone.name}</h1>
                <span className="text-[10px] font-mono text-[#D7DEE1]/35 uppercase tracking-widest pb-1">
                  {drone.type.replace(/_/g, "/")} · {homeBase}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${sm.cls}`}>
                  <Radio className="h-3 w-3" />{sm.label}
                </span>
                {drone.currentMission && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/40">
                    UPPDRAG: {drone.currentMission}
                  </span>
                )}
                {drone.affiliation === "hostile" && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border text-red-400 bg-red-400/10 border-red-400/40">
                    FIENTLIG
                  </span>
                )}
              </div>
            </div>

            {/* Silhouette */}
            <div className="flex-shrink-0 hidden sm:block">
              <img src={droneSilhouette} alt="Drone"
                className="h-28 w-auto object-contain"
                style={{ filter: "invert(1) brightness(0.9)", opacity: 0.85, transform: "scaleX(-1)" }} />
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t" style={{ borderColor: "rgba(215,222,225,0.08)" }}>
            {[
              { label: "Bränslenivå",       value: `${Math.round(drone.fuel)}%`,        color: fuelColor },
              { label: "Uthållighet kvar",  value: `${enduranceRemaining} h`,           color: enduranceRemaining < 3 ? "#D9192E" : "hsl(152 60% 38%)" },
              { label: "Sensor räckvidd",   value: `${drone.sensorRangeKm} km`,         color: "#D7DEE1" },
              { label: "Waypoints",         value: String(drone.waypoints?.length ?? 0), color: "#D7DEE1" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest mt-0.5" style={{ color: "rgba(215,222,225,0.35)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── TAB BAR ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(7,18,44,0.95)", backdropFilter: "blur(20px)", borderColor: "rgba(215,222,225,0.1)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-stretch">
            {tabs.map(({ id, label, icon }) => {
              const isActive = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className="relative flex items-center gap-2 px-5 py-4 text-[11px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap border-b-2"
                  style={{
                    color: isActive ? "#D7DEE1" : "rgba(215,222,225,0.35)",
                    borderColor: isActive ? "#D9192E" : "transparent",
                    background: isActive ? "rgba(217,25,46,0.07)" : "transparent",
                  }}
                >
                  {icon}{label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>

            {/* ── ÖVERSIKT ── */}
            {activeTab === "oversikt" && (
              <div className="space-y-8">
                {/* System health mini-cards */}
                <section>
                  <SectionLabel label="Systemhälsa — Snabböversikt" />
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {systems.map((c) => {
                      const col = healthColor(c.health);
                      const Icon = c.icon;
                      return (
                        <motion.button key={c.id}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          onClick={() => setActiveTab("system")}
                          className="rounded-xl p-3 text-center space-y-2"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${c.health < 30 ? "rgba(217,25,46,0.55)" : c.health < 70 ? "rgba(215,173,58,0.3)" : "rgba(215,222,225,0.1)"}`,
                          }}
                        >
                          <div className="flex justify-center">
                            <Icon className="h-4 w-4" style={{ color: col }} />
                          </div>
                          <div className="text-base font-black font-mono leading-none" style={{ color: col }}>{Math.round(c.health ?? 100)}%</div>
                          <div className="text-[8px] font-mono uppercase tracking-wide leading-tight" style={{ color: "rgba(215,222,225,0.4)" }}>{c.label}</div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.health}%`, background: col }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                {/* Operativ status */}
                <section>
                  <SectionLabel label="Operativ Status" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl p-5 space-y-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" style={{ color: sm.color }} />
                        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(215,222,225,0.4)" }}>Nuvarande Status</span>
                      </div>
                      <div className={`text-sm font-black font-mono ${sm.cls.split(" ")[0]}`}>{sm.label.toUpperCase()}</div>
                      <div className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.5)" }}>
                        {drone.currentMission ? `Aktivt uppdrag: ${drone.currentMission}`
                          : drone.status === "ready" ? "Tillgänglig för uppdrag"
                          : drone.status === "under_maintenance" ? "Underhåll pågår"
                          : drone.status === "returning" ? "Återvänder till bas"
                          : "–"}
                      </div>
                      {drone.position && (
                        <div className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.35)" }}>
                          Pos: {drone.position.lat.toFixed(3)}°N {drone.position.lng.toFixed(3)}°E
                        </div>
                      )}
                      <button onClick={() => navigate("/map")}
                        className="text-[9px] font-mono transition-colors" style={{ color: "rgba(215,222,225,0.35)" }}>
                        Visa på karta →
                      </button>
                    </div>

                    <div className="rounded-xl p-5 space-y-3"
                      style={{
                        background: drone.fuel < 25 ? "rgba(217,25,46,0.06)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${drone.fuel < 25 ? "rgba(217,25,46,0.4)" : "rgba(215,222,225,0.1)"}`,
                      }}>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" style={{ color: fuelColor }} />
                        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(215,222,225,0.4)" }}>Bränsle & Uthållighet</span>
                      </div>
                      <div className="text-2xl font-black font-mono" style={{ color: fuelColor }}>
                        {enduranceRemaining} h kvar
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.5)" }}>
                        {drone.fuel < 25 ? "⚠ LÅGT BRÄNSLE — Återkall omgående" : `${Math.round(drone.fuel)}% bränsle · max ${drone.enduranceHours}h`}
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${drone.fuel}%`, background: fuelColor }} />
                      </div>
                      {canRecall && (
                        <button
                          onClick={() => { recallDrone(drone.id); navigate(dashboardHref); }}
                          className="flex items-center gap-1.5 text-[9px] font-mono font-bold transition-colors"
                          style={{ color: "#fbbf24" }}
                        >
                          <RotateCcw className="h-3 w-3" /> RTB — Återkalla till bas →
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ── UPPDRAG ── */}
            {activeTab === "uppdrag" && (
              <div className="space-y-6">
                <section>
                  <SectionLabel label="Uppdragsstatus" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl p-5 space-y-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "rgba(215,222,225,0.35)" }}>Enhetsinformation</div>
                      {[
                        { label: "Callsign",      value: drone.name },
                        { label: "Typ",           value: drone.type.replace(/_/g, "/") },
                        { label: "Hemabas",       value: homeBase },
                        { label: "Last",          value: drone.payload?.trim() || "Ej angiven" },
                        { label: "Sensor ⌀",      value: `${drone.sensorRangeKm} km` },
                        { label: "Max räckvidd",  value: `${drone.rangeKm} km` },
                        { label: "Hastighet",     value: `${drone.movement?.speed ?? 0} kts` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                          <span className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.4)" }}>{label}</span>
                          <span className="text-[10px] font-mono font-bold" style={{ color: "#D7DEE1" }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl p-5 space-y-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(215,222,225,0.1)" }}>
                      <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "rgba(215,222,225,0.35)" }}>Waypoints</div>
                      {drone.waypoints?.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                            <span style={{ color: "rgba(215,222,225,0.4)" }}>Aktiv</span>
                            <span className="font-bold" style={{ color: "#D7DEE1" }}>
                              {Math.min(drone.currentWaypointIdx + 1, drone.waypoints.length)} / {drone.waypoints.length}
                            </span>
                          </div>
                          <div className="space-y-1 max-h-56 overflow-y-auto">
                            {drone.waypoints.map((wp, i) => {
                              const isActive = i === drone.currentWaypointIdx;
                              return (
                                <div key={wp.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-[9px] font-mono"
                                  style={{
                                    background: isActive ? "rgba(59,130,246,0.1)" : "rgba(215,222,225,0.03)",
                                    border: `1px solid ${isActive ? "rgba(59,130,246,0.3)" : "rgba(215,222,225,0.07)"}`,
                                    color: isActive ? "#3b82f6" : "rgba(215,222,225,0.45)",
                                  }}>
                                  <Crosshair className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="w-4">{i + 1}.</span>
                                  <span>{wp.lat.toFixed(3)}°N {wp.lng.toFixed(3)}°E</span>
                                  {wp.loiterMinutes && <span className="ml-auto">loiter {wp.loiterMinutes}min</span>}
                                  {isActive && <span className="ml-auto text-[8px]">◀ AKTIV</span>}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.3)" }}>
                          Inga waypoints tilldelade
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <section>
                  <SectionLabel label="Åtgärder" />
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => { recallDrone(drone.id); navigate(dashboardHref); }}
                      disabled={!canRecall}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl border text-[11px] font-mono font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={canRecall ? {
                        borderColor: "rgba(251,191,36,0.5)", color: "#fbbf24", background: "rgba(251,191,36,0.08)",
                      } : { borderColor: "rgba(215,222,225,0.1)", color: "rgba(215,222,225,0.3)", background: "transparent" }}
                    >
                      <RotateCcw className="h-4 w-4" /> RTB — Återkalla till bas
                    </button>
                    <button onClick={() => navigate("/map")}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl border text-[11px] font-mono font-bold transition-all hover:brightness-110"
                      style={{ borderColor: "rgba(215,222,225,0.15)", color: "rgba(215,222,225,0.6)", background: "rgba(215,222,225,0.04)" }}
                    >
                      <MapPin className="h-4 w-4" /> Visa på karta
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ── SYSTEM ── */}
            {activeTab === "system" && (
              <div className="space-y-6">
                <section>
                  <SectionLabel label="Subsystem Hälsa — Detaljvy" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systems.map((c) => {
                      const col = healthColor(c.health);
                      const Icon = c.icon;
                      return (
                        <div key={c.id} className="rounded-xl p-5 space-y-3"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: `1px solid ${c.health < 30 ? "rgba(217,25,46,0.55)" : c.health < 70 ? "rgba(215,173,58,0.3)" : "rgba(215,222,225,0.1)"}`,
                          }}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: col }} />
                            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(215,222,225,0.4)" }}>{c.label}</span>
                          </div>
                          <div className="text-3xl font-black font-mono" style={{ color: col }}>{Math.round(c.health ?? 100)}%</div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.health}%`, background: col }} />
                          </div>
                          <div className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.35)" }}>
                            {c.health >= 70 ? "Nominellt" : c.health >= 40 ? "Degraderad kapacitet" : "KRITISKT — Åtgärd krävs"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
