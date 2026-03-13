import { motion } from "framer-motion";

interface StatusKortProps {
  titel: string;
  varde: number | string;
  subtitel?: string;
  ikon: React.ReactNode;
  farg: "green" | "blue" | "yellow" | "purple" | "red";
}

const accentMap = {
  green:  { hex: "#005AA0", bg: "from-blue-50 to-blue-50/60",        border: "border-blue-300/60",   text: "text-blue-700",   iconBg: "bg-blue-100"      },
  blue:   { hex: "#0284c7", bg: "from-sky-50 to-sky-50/60",          border: "border-sky-300/60",    text: "text-sky-700",    iconBg: "bg-sky-100"       },
  yellow: { hex: "#FFB81C", bg: "from-amber-50 to-amber-50/60",      border: "border-amber-300/60",  text: "text-amber-700",  iconBg: "bg-amber-100"     },
  purple: { hex: "#7c3aed", bg: "from-violet-50 to-violet-50/60",    border: "border-violet-300/60", text: "text-violet-700", iconBg: "bg-violet-100"    },
  red:    { hex: "#dc2626", bg: "from-red-50 to-red-50/60",          border: "border-red-300/60",    text: "text-red-700",    iconBg: "bg-red-100"       },
};

export function StatusKort({ titel, varde, subtitel, ikon, farg }: StatusKortProps) {
  const c = accentMap[farg];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-lg border bg-gradient-to-b ${c.bg} ${c.border} p-4 overflow-hidden`}
    >
      {/* top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg" style={{ backgroundColor: c.hex, opacity: 0.7 }} />

      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-md ${c.iconBg} ${c.text}`}>{ikon}</div>
        <span className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-widest text-right leading-tight max-w-[80px]">{titel}</span>
      </div>

      <div className={`text-3xl font-black font-mono ${c.text} leading-none`}>{varde}</div>
      {subtitel && <div className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono">{subtitel}</div>}
    </motion.div>
  );
}
