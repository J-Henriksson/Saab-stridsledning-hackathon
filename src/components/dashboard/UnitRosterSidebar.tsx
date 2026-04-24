import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, Send, Shield, Truck, Radar as RadarIcon, Ship,
  ChevronRight, ChevronDown, Radio,
} from "lucide-react";
import type { Base, NavalUnit } from "@/types/game";
import type {
  Unit, AircraftUnit, DroneUnit, AirDefenseUnit, GroundVehicleUnit, RadarUnit,
} from "@/types/units";
import {
  isAircraft, isDrone, isAirDefense, isGroundVehicle, isRadar,
} from "@/types/units";

interface UnitRosterSidebarProps {
  base: Base;
  navalUnits: NavalUnit[];
  deployedUnits: Unit[];
}

type SectionKey = "aircraft" | "drone" | "air_defense" | "ground_vehicle" | "radar" | "naval" | "deployed";

const acStatusMeta = (status: string): { color: string; label: string } => {
  switch (status) {
    case "ready":             return { color: "#22a05a", label: "MC" };
    case "on_mission":        return { color: "#3b82f6", label: "UP" };
    case "under_maintenance": return { color: "#d97706", label: "UH" };
    case "unavailable":       return { color: "#D9192E", label: "NMC" };
    case "returning":         return { color: "#a855f7", label: "RET" };
    case "allocated":         return { color: "#D7AB3A", label: "ALLOC" };
    default:                  return { color: "#64748b", label: "—" };
  }
};

const adStatusMeta = (s: AirDefenseUnit["operationalStatus"]): { color: string; label: string } => {
  switch (s) {
    case "ready":      return { color: "#22a05a", label: "READY" };
    case "standby":    return { color: "#3b82f6", label: "STBY" };
    case "firing":     return { color: "#D9192E", label: "FIRE" };
    case "relocating": return { color: "#d97706", label: "MOV" };
  }
};

const movementMeta = (state: Unit["movement"]["state"]): { color: string; label: string } => {
  switch (state) {
    case "stationary": return { color: "#64748b", label: "STAT" };
    case "moving":     return { color: "#d97706", label: "MOV" };
    case "airborne":   return { color: "#3b82f6", label: "AIR" };
  }
};

const threatMeta = (t: NavalUnit["threatLevel"]): { color: string; label: string } => {
  switch (t) {
    case "high":    return { color: "#D9192E", label: "HIGH" };
    case "medium":  return { color: "#d97706", label: "MED" };
    case "low":     return { color: "#22a05a", label: "LOW" };
    case "unknown": return { color: "#64748b", label: "UNK" };
  }
};

interface SectionMeta {
  key: SectionKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const SECTIONS: SectionMeta[] = [
  { key: "aircraft",       label: "Flygplan",      Icon: Plane,     accent: "#3b82f6" },
  { key: "drone",          label: "Drönare",       Icon: Send,      accent: "#06b6d4" },
  { key: "air_defense",    label: "Luftvärn",      Icon: Shield,    accent: "#a855f7" },
  { key: "ground_vehicle", label: "Markfordon",    Icon: Truck,     accent: "#d97706" },
  { key: "radar",          label: "Radar",         Icon: RadarIcon, accent: "#22a05a" },
  { key: "naval",          label: "Fartyg (Sjö)",  Icon: Ship,      accent: "#0ea5e9" },
  { key: "deployed",       label: "Deployerade",   Icon: Send,      accent: "#D7AB3A" },
];

function UnitRow({
  primary, secondary, statusColor, statusLabel, healthLow, onClick,
}: {
  primary: string;
  secondary?: string;
  statusColor: string;
  statusLabel: string;
  healthLow?: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ x: 2, transition: { duration: 0.1 } }}
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-black/5"
      style={{ border: `1px solid ${statusColor}28` }}
    >
      <span className="text-[10px] font-mono font-black truncate" style={{ color: "hsl(220 63% 18%)" }}>
        {primary}
      </span>
      <span
        className="text-[8px] font-mono font-bold px-1 py-0.5 rounded shrink-0"
        style={{ background: `${statusColor}1A`, color: statusColor }}
      >
        {statusLabel}
      </span>
      {secondary && (
        <span className="text-[8px] font-mono truncate" style={{ color: "hsl(218 15% 50%)" }}>
          {secondary}
        </span>
      )}
      {healthLow != null && (
        <span className="text-[8px] font-mono font-bold ml-auto shrink-0" style={{ color: "#D9192E" }}>
          {healthLow}%
        </span>
      )}
      <ChevronRight className="h-2.5 w-2.5 ml-auto shrink-0 opacity-20" />
    </motion.button>
  );
}

export function UnitRosterSidebar({ base, navalUnits, deployedUnits }: UnitRosterSidebarProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    aircraft: true,
    drone: true,
    air_defense: false,
    ground_vehicle: false,
    radar: false,
    naval: false,
    deployed: false,
  });

  const grouped = useMemo(() => {
    const aircraft       = base.units.filter(isAircraft);
    const drones         = base.units.filter(isDrone);
    const airDefense     = base.units.filter(isAirDefense);
    const groundVehicles = base.units.filter(isGroundVehicle);
    const radars         = base.units.filter(isRadar);
    const naval          = navalUnits.filter((n) => n.affiliation === "friend");
    const deployed       = deployedUnits.filter((u) => u.affiliation === "friend");
    return { aircraft, drones, airDefense, groundVehicles, radars, naval, deployed };
  }, [base.units, navalUnits, deployedUnits]);

  const counts: Record<SectionKey, number> = {
    aircraft:       grouped.aircraft.length,
    drone:          grouped.drones.length,
    air_defense:    grouped.airDefense.length,
    ground_vehicle: grouped.groundVehicles.length,
    radar:          grouped.radars.length,
    naval:          grouped.naval.length,
    deployed:       grouped.deployed.length,
  };

  const renderSection = (meta: SectionMeta) => {
    const count = counts[meta.key];
    if (count === 0) return null;
    const isOpen = open[meta.key];
    const { Icon } = meta;

    return (
      <div key={meta.key} className="px-3 pt-2 pb-1">
        <button
          onClick={() => setOpen((o) => ({ ...o, [meta.key]: !o[meta.key] }))}
          className="w-full flex items-center gap-1.5 mb-1.5 hover:opacity-80 transition-opacity"
        >
          {isOpen ? (
            <ChevronDown className="h-2.5 w-2.5" style={{ color: "hsl(218 15% 55%)" }} />
          ) : (
            <ChevronRight className="h-2.5 w-2.5" style={{ color: "hsl(218 15% 55%)" }} />
          )}
          <Icon className="h-3 w-3" style={{ color: meta.accent }} />
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest"
            style={{ color: "hsl(218 15% 45%)" }}>
            {meta.label}
          </span>
          <span className="ml-auto text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${meta.accent}1A`, color: meta.accent }}>
            {count}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5">
                {meta.key === "aircraft" && grouped.aircraft.map((ac: AircraftUnit) => {
                  const m = acStatusMeta(ac.status);
                  return (
                    <UnitRow key={ac.id}
                      primary={ac.tailNumber}
                      secondary={ac.type}
                      statusColor={m.color}
                      statusLabel={m.label}
                      healthLow={(ac.health ?? 100) < 50 ? ac.health : undefined}
                      onClick={() => navigate(`/aircraft/${ac.tailNumber}`)}
                    />
                  );
                })}

                {meta.key === "drone" && grouped.drones.map((d: DroneUnit) => {
                  const m = acStatusMeta(d.status);
                  return (
                    <UnitRow key={d.id}
                      primary={d.name}
                      secondary={d.type === "ISR_DRONE" ? "ISR" : "STRIKE"}
                      statusColor={m.color}
                      statusLabel={m.label}
                      healthLow={(d.health ?? 100) < 50 ? d.health : undefined}
                      onClick={() => navigate(`/units/${d.id}`)}
                    />
                  );
                })}

                {meta.key === "air_defense" && grouped.airDefense.map((u: AirDefenseUnit) => {
                  const m = adStatusMeta(u.operationalStatus);
                  return (
                    <UnitRow key={u.id}
                      primary={u.name}
                      secondary={u.type.replace("SAM_", "")}
                      statusColor={m.color}
                      statusLabel={m.label}
                      healthLow={(u.health ?? 100) < 50 ? u.health : undefined}
                      onClick={() => navigate(`/units/${u.id}`)}
                    />
                  );
                })}

                {meta.key === "ground_vehicle" && grouped.groundVehicles.map((u: GroundVehicleUnit) => {
                  const m = movementMeta(u.movement.state);
                  return (
                    <UnitRow key={u.id}
                      primary={u.name}
                      secondary={u.type.replace(/_/g, " ").toLowerCase()}
                      statusColor={m.color}
                      statusLabel={m.label}
                      healthLow={(u.health ?? 100) < 50 ? u.health : undefined}
                      onClick={() => navigate(`/units/${u.id}`)}
                    />
                  );
                })}

                {meta.key === "radar" && grouped.radars.map((u: RadarUnit) => {
                  const color = u.emitting ? "#22a05a" : "#64748b";
                  const label = u.emitting ? "EMIT" : "OFF";
                  return (
                    <UnitRow key={u.id}
                      primary={u.name}
                      secondary={u.type === "SEARCH_RADAR" ? "Search" : "Track"}
                      statusColor={color}
                      statusLabel={label}
                      healthLow={(u.health ?? 100) < 50 ? u.health : undefined}
                      onClick={() => navigate(`/units/${u.id}`)}
                    />
                  );
                })}

                {meta.key === "naval" && grouped.naval.map((n) => {
                  const m = threatMeta(n.threatLevel);
                  return (
                    <UnitRow key={n.id}
                      primary={n.name}
                      secondary={n.kind}
                      statusColor={m.color}
                      statusLabel={m.label}
                      onClick={() => navigate(`/map`)}
                    />
                  );
                })}

                {meta.key === "deployed" && grouped.deployed.map((u) => {
                  const primary = isAircraft(u) ? u.tailNumber : u.name;
                  let secondary = u.category.replace(/_/g, " ");
                  let color = "#3b82f6";
                  let label = "FIELD";
                  if (isAircraft(u) || isDrone(u)) {
                    const m = acStatusMeta(u.status);
                    color = m.color; label = m.label;
                  } else if (isAirDefense(u)) {
                    const m = adStatusMeta(u.operationalStatus);
                    color = m.color; label = m.label;
                  } else {
                    const m = movementMeta(u.movement.state);
                    color = m.color; label = m.label;
                  }
                  return (
                    <UnitRow key={u.id}
                      primary={primary}
                      secondary={secondary}
                      statusColor={color}
                      statusLabel={label}
                      healthLow={(u.health ?? 100) < 50 ? u.health : undefined}
                      onClick={() =>
                        isAircraft(u)
                          ? navigate(`/aircraft/${u.tailNumber}`)
                          : navigate(`/units/${u.id}`)
                      }
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const totalUnits =
    counts.aircraft + counts.drone + counts.air_defense +
    counts.ground_vehicle + counts.radar + counts.naval + counts.deployed;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b"
        style={{ borderColor: "hsl(215 14% 88%)" }}>
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3" style={{ color: "hsl(218 15% 45%)" }} />
          <span className="text-[8px] font-mono font-bold uppercase tracking-widest"
            style={{ color: "hsl(218 15% 45%)" }}>
            Enheter — {base.id}
          </span>
        </div>
        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: "hsl(220 63% 18% / 0.08)", color: "hsl(220 63% 18%)" }}>
          {totalUnits}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        {SECTIONS.map(renderSection)}
        {totalUnits === 0 && (
          <div className="px-4 py-6 text-center text-[9px] font-mono"
            style={{ color: "hsl(218 15% 55%)" }}>
            Inga enheter
          </div>
        )}
      </div>
    </div>
  );
}
