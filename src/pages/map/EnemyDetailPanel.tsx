import { Crosshair, Swords, MapPin, AlertTriangle, FileText, Target } from "lucide-react";
import type { EnemyBase, EnemyEntity, ThreatLevel, OperationalStatus, EnemyBaseCategory, EnemyEntityCategory } from "@/types/game";

const THREAT_STYLE: Record<ThreatLevel, { label: string; cls: string }> = {
  high:    { label: "HÖG",    cls: "text-red-400 bg-red-400/10 border-red-400/40" },
  medium:  { label: "MEDEL",  cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/40" },
  low:     { label: "LÅG",    cls: "text-green-400 bg-green-400/10 border-green-400/40" },
  unknown: { label: "OKÄND",  cls: "text-muted-foreground bg-muted/20 border-border" },
};

const STATUS_STYLE: Record<OperationalStatus, { label: string; cls: string }> = {
  active:    { label: "AKTIV",    cls: "text-red-400" },
  suspected: { label: "MISSTÄNKT", cls: "text-yellow-400" },
  destroyed: { label: "NEUTRALISERAD", cls: "text-green-400" },
  unknown:   { label: "OKÄND",    cls: "text-muted-foreground" },
};

const BASE_CATEGORY_LABEL: Record<EnemyBaseCategory, string> = {
  airfield:  "Flygbas",
  sam_site:  "Luftvärnsposition",
  command:   "Ledningscentral",
  logistics: "Logistikpunkt",
  radar:     "Radarstation",
};

const ENTITY_CATEGORY_LABEL: Record<EnemyEntityCategory, string> = {
  fighter:      "Jaktflyg",
  transport:    "Transportflyg",
  helicopter:   "Helikopter",
  apc:          "Bepansrat fordon",
  artillery:    "Artilleri",
  sam_launcher: "Luftvärnsrobot",
  ship:         "Fartyg",
};

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

export function EnemyBaseDetailPanel({ base }: { base: EnemyBase }) {
  const threat = THREAT_STYLE[base.threatLevel];
  const status = STATUS_STYLE[base.operationalStatus];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${threat.cls}`}>
        <Crosshair className="h-4 w-4" />
        HOT: {threat.label}
      </div>

      <div className="space-y-0">
        <InfoRow icon={Target} label="Typ" value={BASE_CATEGORY_LABEL[base.category]} />
        <InfoRow
          icon={AlertTriangle}
          label="Operativ status"
          value={<span className={status.cls}>{status.label}</span>}
        />
        <InfoRow
          icon={MapPin}
          label="Position"
          value={`${base.coords.lat.toFixed(4)}°N, ${base.coords.lng.toFixed(4)}°E`}
        />
        {base.estimates && (
          <InfoRow icon={Swords} label="Uppskattad styrka" value={base.estimates} />
        )}
        {base.notes && (
          <InfoRow icon={FileText} label="Anteckningar" value={base.notes} />
        )}
      </div>
    </div>
  );
}

export function EnemyEntityDetailPanel({ entity }: { entity: EnemyEntity }) {
  const threat = THREAT_STYLE[entity.threatLevel];
  const status = STATUS_STYLE[entity.operationalStatus];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold font-mono ${threat.cls}`}>
        <Swords className="h-4 w-4" />
        HOT: {threat.label}
      </div>

      <div className="space-y-0">
        <InfoRow icon={Target} label="Typ" value={ENTITY_CATEGORY_LABEL[entity.category]} />
        <InfoRow
          icon={AlertTriangle}
          label="Operativ status"
          value={<span className={status.cls}>{status.label}</span>}
        />
        <InfoRow
          icon={MapPin}
          label="Position"
          value={`${entity.coords.lat.toFixed(4)}°N, ${entity.coords.lng.toFixed(4)}°E`}
        />
        {entity.estimates && (
          <InfoRow icon={Swords} label="Uppskattad styrka" value={entity.estimates} />
        )}
        {entity.notes && (
          <InfoRow icon={FileText} label="Anteckningar" value={entity.notes} />
        )}
      </div>
    </div>
  );
}
