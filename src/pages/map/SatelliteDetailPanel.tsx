import { Activity, Eye, Orbit, Radar, ShieldAlert } from "lucide-react";
import { Row } from "./StatBox";
import { SatelliteLiveState } from "./SatelliteLayer";

export function SatelliteDetailPanel({
  satellite,
}: {
  satellite: SatelliteLiveState;
}) {
  const signalColor = satellite.signalStrength >= 84 ? "#22c55e" : "#f59e0b";
  const readinessClass =
    satellite.readiness === "Hög"
      ? "text-status-green bg-status-green/10 border-status-green/40"
      : "text-status-yellow bg-status-yellow/10 border-status-yellow/40";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${readinessClass}`}>
        <Orbit className="h-4 w-4" />
        {satellite.readiness} beredskap
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-cyan-400" />
          <div>
            <div className="text-xs font-bold text-foreground">{satellite.role}</div>
            <div className="text-[10px] text-muted-foreground">
              {satellite.orbitClass} · {satellite.status}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Signalstyrka</span>
          <span className="font-bold" style={{ color: signalColor }}>
            {satellite.signalStrength}%
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${satellite.signalStrength}%`,
              backgroundColor: signalColor,
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Row label="Observationszon" value={satellite.observationFocus} />
        <Row label="Region" value={satellite.region} />
        <Row label="Täckning Sverige" value={satellite.swedishInterestCoverage} highlight={satellite.swedishInterestCoverage !== "Täcker"} />
        <Row label="Siktkvalitet" value={satellite.visibilityQuality} highlight={satellite.visibilityQuality !== "God"} />
        <Row label="Hastighet" value={`${satellite.speedKmh} km/h`} />
        <Row label="Höjd" value={`${satellite.altitudeKm} km`} />
        <Row label="Kurs" value={`${Math.round(satellite.heading)}°`} />
        <Row label="Fotavtryck" value={`${satellite.footprintWidthKm} x ${satellite.footprintLengthKm} km`} />
        <Row label="Nästa passage" value={`${satellite.nextPassMinutes} min`} />
      </div>

      <section className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-center gap-2 text-cyan-300">
          <Eye className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wider">AKTUELL TÄCKNING</span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-200">
          Satelliten täcker just nu <span className="font-bold text-cyan-300">{satellite.observationFocus}</span> med
          fokus på <span className="font-bold text-cyan-300">{satellite.region}</span>.
        </p>
      </section>

      <section className="rounded-lg border border-status-green/20 bg-status-green/5 p-3">
        <div className="flex items-center gap-2 text-status-green">
          <Activity className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wider">REKOMMENDERAD ÅTGÄRD</span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-200">{satellite.recommendedAction}</p>
      </section>

      <section className="rounded-lg border border-status-yellow/20 bg-status-yellow/5 p-3">
        <div className="flex items-center gap-2 text-status-yellow">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-[10px] font-bold tracking-wider">BEGRÄNSNING</span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-200">{satellite.limitation}</p>
      </section>
    </div>
  );
}
