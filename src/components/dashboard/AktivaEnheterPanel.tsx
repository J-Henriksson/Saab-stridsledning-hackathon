import { useMemo } from "react";
import { Plane, Shield, Ship, PlaneTakeoff, Home, Wrench } from "lucide-react";
import type { GameState } from "@/types/game";
import { unitDomain, unitStatusBucket, type UnitDomain, type UnitStatusBucket } from "@/core/units/domain";

interface AktivaEnheterPanelProps {
  state: GameState;
}

type Counts = Record<UnitDomain, Record<UnitStatusBucket, number>>;

const EMPTY_COUNTS = (): Counts => ({
  air:  { inflight: 0, onbase: 0, maintenance: 0 },
  land: { inflight: 0, onbase: 0, maintenance: 0 },
  sea:  { inflight: 0, onbase: 0, maintenance: 0 },
});

const DOMAIN_LABEL: Record<UnitDomain, string> = {
  air: "Luft",
  land: "Mark",
  sea: "Sjö",
};

const DOMAIN_ICON: Record<UnitDomain, React.ComponentType<{ className?: string; size?: number }>> = {
  air: Plane,
  land: Shield,
  sea: Ship,
};

const BUCKET_LABEL: Record<UnitStatusBucket, string> = {
  inflight: "I luften / Deployerade",
  onbase: "Vid bas",
  maintenance: "Underhåll / NMC",
};

const BUCKET_ICON: Record<UnitStatusBucket, React.ComponentType<{ className?: string; size?: number }>> = {
  inflight: PlaneTakeoff,
  onbase: Home,
  maintenance: Wrench,
};

const BUCKET_COLOR: Record<UnitStatusBucket, string> = {
  inflight: "#3b82f6",
  onbase: "#22a05a",
  maintenance: "#d97706",
};

/**
 * Real-time, theater-wide unit roster: Air / Land / Sea domains × In-flight /
 * On-base / Maintenance buckets. Friendlies only — hostile fleets are tracked
 * via the map's intel panels.
 */
export function AktivaEnheterPanel({ state }: AktivaEnheterPanelProps) {
  const counts = useMemo<Counts>(() => {
    const c = EMPTY_COUNTS();

    // Base-held units (friendlies only — all seeded units are friend).
    for (const base of state.bases) {
      for (const u of base.units) {
        if (u.affiliation !== "friend") continue;
        const d = unitDomain(u);
        const b = unitStatusBucket(u, true);
        c[d][b] += 1;
      }
    }
    // Deployed units.
    for (const u of state.deployedUnits) {
      if (u.affiliation !== "friend") continue;
      const d = unitDomain(u);
      const b = unitStatusBucket(u, false);
      c[d][b] += 1;
    }
    // Naval — only friendly pickets count for the roster.
    for (const n of state.navalUnits ?? []) {
      if (n.affiliation !== "friend") continue;
      // Ships are always deployed / in-flight by definition for this dashboard.
      c.sea.inflight += 1;
    }

    return c;
  }, [state.bases, state.deployedUnits, state.navalUnits]);

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "#0C234C", border: "1px solid rgba(215,222,225,0.08)", boxShadow: "0 4px 24px rgba(12,35,76,0.18)" }}>
      <div className="flex items-center justify-between px-5 py-2.5 border-b"
        style={{ borderColor: "rgba(215,222,225,0.08)", background: "rgba(59,130,246,0.04)" }}>
        <div className="flex items-center gap-2">
          <PlaneTakeoff className="h-3.5 w-3.5" style={{ color: "#3b82f6" }} />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: "#D7DEE1" }}>
            AKTIVA ENHETER — HELA TEATERN
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: "rgba(215,222,225,0.4)" }}>
          Realtid · Vän
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(215,222,225,0.07)" }}>
        {(Object.keys(DOMAIN_LABEL) as UnitDomain[]).map((domain) => {
          const DIcon = DOMAIN_ICON[domain];
          const rows = counts[domain];
          const total = rows.inflight + rows.onbase + rows.maintenance;
          return (
            <div key={domain} className="px-5 py-5" style={{ borderColor: "rgba(215,222,225,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <DIcon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase" style={{ color: "#D7DEE1" }}>
                  {DOMAIN_LABEL[domain]}
                </span>
                <span className="ml-auto text-[10px] font-mono" style={{ color: "rgba(215,222,225,0.45)" }}>
                  totalt {total}
                </span>
              </div>
              <div className="space-y-2">
                {(Object.keys(BUCKET_LABEL) as UnitStatusBucket[]).map((bucket) => {
                  const BIcon = BUCKET_ICON[bucket];
                  const count = rows[bucket];
                  const color = BUCKET_COLOR[bucket];
                  return (
                    <div key={bucket} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <BIcon className="h-3 w-3" style={{ color: "rgba(215,222,225,0.55)" }} />
                      <span className="text-[9px] font-mono flex-1" style={{ color: "rgba(215,222,225,0.55)" }}>
                        {BUCKET_LABEL[bucket]}
                      </span>
                      <span className="text-[11px] font-mono font-bold" style={{ color }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
