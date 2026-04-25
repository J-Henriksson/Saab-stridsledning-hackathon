import { useNavigate } from "react-router-dom";
import {
  Crown,
  Building2,
  Radio,
  Shield,
  Crosshair,
  Eye,
} from "lucide-react";

export type PlayerRole =
  | "wing_commander"
  | "base_commander"
  | "fob_manager"
  | "ad_controller"
  | "fighter_controller"
  | "intel_officer";

const ROLES: {
  id: PlayerRole;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  border: string;
  bg: string;
}[] = [
  {
    id: "wing_commander",
    title: "Vingchef",
    subtitle: "Wing Commander",
    description: "Övergripande taktiskt och operativt ansvar för flygets insatser. Beslutar om uppdrag, resurser och prioriteringar.",
    icon: Crown,
    color: "#f59e0b",
    border: "border-amber-500/40 hover:border-amber-400",
    bg: "hover:bg-amber-500/5",
  },
  {
    id: "base_commander",
    title: "Flygbaskommendant",
    subtitle: "Air Base Commander",
    description: "Ansvarar för driften av huvudbasen (MOB). Hanterar underhåll, logistik, personal och basens försvarsförmåga.",
    icon: Building2,
    color: "#3b82f6",
    border: "border-blue-500/40 hover:border-blue-400",
    bg: "hover:bg-blue-500/5",
  },
  {
    id: "fob_manager",
    title: "FOB-Chef",
    subtitle: "Forward Operating Base Manager",
    description: "Leder verksamheten vid framskjuten bas (FOB). Koordinerar basering, tankning och snabba ombasering under stridstryck.",
    icon: Radio,
    color: "#22c55e",
    border: "border-green-500/40 hover:border-green-400",
    bg: "hover:bg-green-500/5",
  },
  {
    id: "ad_controller",
    title: "Luftvärnscontroller",
    subtitle: "Air Defence Controller",
    description: "Styr och koordinerar luftvärnsenheter för skydd av baser och kritisk infrastruktur mot lufthotet.",
    icon: Shield,
    color: "#ef4444",
    border: "border-red-500/40 hover:border-red-400",
    bg: "hover:bg-red-500/5",
  },
  {
    id: "fighter_controller",
    title: "Stridsledare",
    subtitle: "Fighter Controller",
    description: "Leder jaktflyg och CAP-uppdrag i realtid. Ansvarar för taktisk positionering och eldledning mot luftmål.",
    icon: Crosshair,
    color: "#a78bfa",
    border: "border-violet-500/40 hover:border-violet-400",
    bg: "hover:bg-violet-500/5",
  },
  {
    id: "intel_officer",
    title: "Underrättelseofficer",
    subtitle: "Intelligence & Recon Officer",
    description: "Samlar och analyserar underrättelser från UAV och spaningsplan. Värderar hotbild och presenterar lägesbild.",
    icon: Eye,
    color: "#06b6d4",
    border: "border-cyan-500/40 hover:border-cyan-400",
    bg: "hover:bg-cyan-500/5",
  },
];

export function RoleSelect() {
  const navigate = useNavigate();

  function select(role: PlayerRole) {
    localStorage.setItem("playerRole", role);
    navigate("/map");
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white font-mono flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5 flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase">SAAB · Stridsledningssystem</span>
          <span className="text-lg font-bold tracking-wider text-white">TAKTISK OPERATIONSCENTRAL</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 tracking-widest">SYSTEM AKTIVT</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          {/* Title block */}
          <div className="text-center mb-10">
            <p className="text-[11px] text-slate-500 tracking-[0.3em] uppercase mb-2">Välj din roll för att fortsätta</p>
            <h1 className="text-3xl font-bold tracking-wide text-white">Rollval</h1>
            <div className="mt-3 mx-auto w-16 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
          </div>

          {/* Role grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => select(r.id)}
                  className={`
                    group relative text-left rounded-lg border bg-white/[0.02] p-5
                    transition-all duration-200 cursor-pointer
                    ${r.border} ${r.bg}
                    focus:outline-none focus:ring-2 focus:ring-white/20
                  `}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="mt-0.5 flex-shrink-0 rounded-md p-2"
                      style={{ background: `${r.color}18`, border: `1px solid ${r.color}44` }}
                    >
                      <Icon size={18} style={{ color: r.color }} />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold leading-tight tracking-wide text-white">
                        {r.title}
                      </div>
                      <div className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: r.color }}>
                        {r.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {r.description}
                  </p>

                  {/* Arrow indicator */}
                  <div
                    className="absolute bottom-4 right-4 text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: r.color }}
                  >
                    VÄLJ →
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-600 mt-8 tracking-wide">
            Din roll påverkar standardvy och prioriterade kontroller · Kan ändras under sessionen
          </p>
        </div>
      </div>
    </div>
  );
}
