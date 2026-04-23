import React from "react";

export function StatBox({
  icon,
  label,
  value,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: "green" | "blue" | "yellow" | "purple";
}) {
  const colorMap = {
    green: "text-status-green border-status-green/20 bg-status-green/5",
    blue: "text-status-blue border-status-blue/20 bg-status-blue/5",
    yellow: "text-status-yellow border-status-yellow/20 bg-status-yellow/5",
    purple: "text-purple-400 border-purple-400/20 bg-purple-400/5",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[9px] font-mono">{label}</span></div>
      <div className="text-lg font-bold font-mono leading-none">
        {value}<span className="text-[10px] font-normal opacity-60">/{total}</span>
      </div>
    </div>
  );
}

export function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/40">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono ${highlight ? "text-status-red font-bold" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
