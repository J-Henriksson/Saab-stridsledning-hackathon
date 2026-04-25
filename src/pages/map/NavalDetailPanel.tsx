import { Ship, AlertTriangle, MapPin, Clock, Target, Crosshair, Anchor, Waves } from "lucide-react";
import type { NavalUnit, ThreatLevel } from "@/types/game";
import { analyzeNavalUnit } from "@/lib/enemyAnalysis";
import { ContextualRecommendation } from "@/components/game/ContextualRecommendation";
import { WarningList, BorderAlertPanel } from "@/components/game/EnemyAnalysisPanels";

const THREAT_STYLE: Record<ThreatLevel, { label: string; cls: string }> = {
  high:    { label: "HÖG",   cls: "text-red-400 bg-red-400/10 border-red-400/40" },
  medium:  { label: "MEDEL", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/40" },
  low:     { label: "LÅG",   cls: "text-green-400 bg-green-400/10 border-green-400/40" },
  unknown: { label: "OKÄND", cls: "text-muted-foreground bg-muted/20 border-border" },
};

const KIND_LABEL: Record<NavalUnit["kind"], string> = {
  corvette:       "Korvett",
  frigate:        "Fregatt",
  submarine:      "U-båt",
  amphib:         "Amfibiefartyg",
  logistics_ship: "Logistikfartyg",
  patrol_boat:    "Patrullbåt",
};

const KIND_ICON: Record<NavalUnit["kind"], React.ComponentType<{ className?: string; size?: number }>> = {
  corvette:       Ship,
  frigate:        Ship,
  submarine:      Anchor,
  amphib:         Waves,
  logistics_ship: Waves,
  patrol_boat:    Ship,
};

// One-line strategic intent, generated from kind + affiliation.
function inferIntent(n: NavalUnit): string {
  if (n.affiliation === "friend") {
    return `Patrullerar svenskt maritimt territorium — avvisar/övervakar inträngande fartyg`;
  }
  switch (n.kind) {
    case "corvette":       return "Ytstridsfartyg — sannolik övervakning av sjöfart och avskräckning";
    case "frigate":        return "Tyngre ytstridsfartyg — eskort- eller ytslagskapacitet";
    case "submarine":      return "U-båtsverksamhet — troligen ISR och rekognosering av sjövägar";
    case "amphib":         return "Amfibieplattform — kapacitet för landstigning vid behov";
    case "logistics_ship": return "Logistiskt stöd — understöd till framskjuten marinstyrka";
    case "patrol_boat":    return "Patrullverksamhet nära egen kust";
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-xs font-mono text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function NavalDetailPanel({ unit }: { unit: NavalUnit }) {
  const threat = THREAT_STYLE[unit.threatLevel];
  const Icon = KIND_ICON[unit.kind];
  const detected = unit.lastDetectedAt;
  const intent = inferIntent(unit);
  const analysis = unit.affiliation === "hostile" ? analyzeNavalUnit(unit) : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${threat.cls}`}>
        <Crosshair className="h-4 w-4" />
        HOT: {threat.label}
        <span className="ml-auto flex items-center gap-1 text-[10px] opacity-80">
          <Icon className="h-3.5 w-3.5" /> {KIND_LABEL[unit.kind]}
        </span>
      </div>

      <div className="space-y-0">
        <InfoRow icon={Target} label="Namn" value={unit.name} />
        <InfoRow icon={AlertTriangle} label="Sida" value={unit.affiliation === "hostile" ? "FIENDE" : "VÄNLIG"} />
        <InfoRow
          icon={MapPin}
          label="Nuvarande position"
          value={`${unit.position.lat.toFixed(3)}°N, ${unit.position.lng.toFixed(3)}°E`}
        />
        {unit.affiliation === "hostile" && (
          <>
            <InfoRow
              icon={Clock}
              label="Senast detekterad"
              value={
                detected
                  ? `Dag ${detected.day} ${String(detected.hour).padStart(2, "0")}:${String(detected.minute).padStart(2, "0")}`
                  : "Aldrig — spåras ej för närvarande"
              }
            />
            {unit.lastKnownPosition && (
              <InfoRow
                icon={MapPin}
                label="Senast kända position"
                value={`${unit.lastKnownPosition.lat.toFixed(3)}°N, ${unit.lastKnownPosition.lng.toFixed(3)}°E`}
              />
            )}
          </>
        )}
      </div>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <div className="text-[9px] font-mono text-amber-400/80 uppercase tracking-widest mb-1">Bedömd avsikt</div>
        <div className="text-xs font-mono text-foreground">{intent}</div>
      </div>

      <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <div className="text-[9px] font-mono text-sky-400/80 uppercase tracking-widest mb-2">Patrullzon</div>
        <div className="text-xs font-mono space-y-1">
          <div>Centrum: {unit.patrol.center.lat.toFixed(3)}°N, {unit.patrol.center.lng.toFixed(3)}°E</div>
          <div>Radie: {unit.patrol.radiusKm} km</div>
          <div>Fart: {unit.patrol.speedKts} knop</div>
        </div>
      </div>

      {analysis && (
        <div className="space-y-2">
          <ContextualRecommendation text={analysis.recommendation} type={analysis.type} />
          {analysis.warnings.length > 0 && <WarningList warnings={analysis.warnings} />}
          {analysis.borderAlert && <BorderAlertPanel alert={analysis.borderAlert} />}
        </div>
      )}
    </div>
  );
}
