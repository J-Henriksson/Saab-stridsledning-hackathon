import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatusKortProps {
  titel: string;
  varde: number | string;
  subtitel?: string;
  ikon: React.ReactNode;
  farg: "green" | "blue" | "yellow" | "purple" | "red";
}

const fargMap = {
  green: "border-status-green/30 bg-status-green/5",
  blue: "border-status-blue/30 bg-status-blue/5",
  yellow: "border-status-amber/30 bg-status-amber/5",
  purple: "border-primary/30 bg-primary/5",
  red: "border-status-red/30 bg-status-red/5",
};

const textMap = {
  green: "text-status-green",
  blue: "text-status-blue",
  yellow: "text-status-amber",
  purple: "text-primary",
  red: "text-status-red",
};

export function StatusKort({ titel, varde, subtitel, ikon, farg }: StatusKortProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${fargMap[farg]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`${textMap[farg]}`}>{ikon}</span>
        <span className="text-[9px] font-mono text-muted-foreground uppercase">{titel}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${textMap[farg]}`}>{varde}</div>
      {subtitel && <div className="text-[10px] text-muted-foreground mt-1">{subtitel}</div>}
    </motion.div>
  );
}
