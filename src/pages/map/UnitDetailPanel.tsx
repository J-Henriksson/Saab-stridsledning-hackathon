import type { Unit, Affiliation } from "@/types/units";
import { isAircraft, isDrone, isAirDefense, isGroundVehicle, isRadar } from "@/types/units";
import type { BaseType } from "@/types/game";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import { useGame } from "@/context/GameContext";
import { Link } from "react-router-dom";

const AFFILIATIONS: Affiliation[] = ["friend", "hostile", "neutral", "unknown", "pending"];

export function UnitDetailPanel({
  unit,
  isAtBase,
  allBases,
}: {
  unit: Unit;
  isAtBase: boolean;
  allBases: { id: BaseType; name: string }[];
}) {
  const { dispatch } = useGame();

  const health = unit.health ?? 100;
  const healthColor = health < 30 ? "#ef4444" : health < 60 ? "#eab308" : "#22c55e";
  const fuel = "fuel" in unit ? unit.fuel : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <UnitSymbol sidc={unit.sidc} size={48} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{unit.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {unit.category} · {unit.affiliation}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Hälsa</span>
          <span className="font-bold" style={{ color: healthColor }}>{health}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${health}%`, background: healthColor }} />
        </div>
      </div>

      {fuel != null && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Bränsle</span>
          <span className="font-bold text-foreground">{Math.round(fuel)}%</span>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Aktuell bas</span>
          <span className="text-foreground">{unit.currentBase ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Senaste bas</span>
          <span className="text-foreground">{unit.lastBase ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Position</span>
          <span className="text-foreground">{unit.position.lat.toFixed(3)}, {unit.position.lng.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rörelse</span>
          <span className="text-foreground">{unit.movement.state} @ {Math.round(unit.movement.speed)} kt</span>
        </div>
      </div>

      {isDrone(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Drönare</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Status</span><span>{unit.status}</span></div>
          <div className="flex justify-between"><span>Uthållighet</span><span>{unit.enduranceHours} h</span></div>
        </section>
      )}

      {isAirDefense(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Luftvärn</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Läge</span><span>{unit.deployedState}</span></div>
          <div className="flex justify-between"><span>Robotar</span><span>{unit.missileStock.loaded}/{unit.missileStock.max}</span></div>
          <button
            className="mt-2 w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            onClick={() => dispatch({
              type: "SET_AD_STATE",
              unitId: unit.id,
              deployedState: unit.deployedState === "emplaced" ? "stowed" : "emplaced",
            })}
          >
            Växla till {unit.deployedState === "emplaced" ? "stowed" : "emplaced"}
          </button>
        </section>
      )}

      {isGroundVehicle(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Markfordon</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Vägfart</span><span>{unit.roadSpeed} kt</span></div>
        </section>
      )}

      {isRadar(unit) && (
        <section className="space-y-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Radar</div>
          <div className="flex justify-between"><span>Typ</span><span>{unit.type}</span></div>
          <div className="flex justify-between"><span>Läge</span><span>{unit.deployedState}</span></div>
          <div className="flex justify-between"><span>Sänder</span><span>{unit.emitting ? "ja" : "nej"}</span></div>
          <button
            className="mt-2 w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            onClick={() => dispatch({ type: "SET_RADAR_EMITTING", unitId: unit.id, emitting: !unit.emitting })}
          >
            {unit.emitting ? "Stäng av sändning" : "Börja sända"}
          </button>
        </section>
      )}

      <section className="space-y-2 pt-2 border-t border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Klassificering</div>
        <div className="flex flex-wrap gap-1">
          {AFFILIATIONS.map((aff) => (
            <button
              key={aff}
              onClick={() => dispatch({ type: "CLASSIFY_CONTACT", unitId: unit.id, affiliation: aff })}
              className="px-2 py-1 border border-border rounded hover:bg-muted/30 text-[10px]"
              style={{
                background: unit.affiliation === aff ? "rgba(215,171,58,0.25)" : undefined,
                borderColor: unit.affiliation === aff ? "#D7AB3A" : undefined,
              }}
            >
              {aff}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 pt-2 border-t border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Åtgärder</div>
        {isAtBase ? (
          <>
            <button
              onClick={() => {
                const lat = parseFloat(prompt("Destinations-lat?", unit.position.lat.toFixed(3)) ?? "");
                const lng = parseFloat(prompt("Destinations-lng?", unit.position.lng.toFixed(3)) ?? "");
                if (!isFinite(lat) || !isFinite(lng)) return;
                dispatch({ type: "DEPLOY_UNIT", unitId: unit.id, destination: { lat, lng } });
              }}
              className="w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            >
              Deploy till fält
            </button>
            <div className="flex gap-1 flex-wrap">
              {allBases.filter((b) => b.id !== unit.currentBase).map((b) => (
                <button
                  key={b.id}
                  onClick={() => dispatch({ type: "TRANSFER_UNIT", unitId: unit.id, toBaseId: b.id })}
                  className="px-2 py-1 border border-border rounded hover:bg-muted/30 text-[10px]"
                >
                  → {b.id}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => dispatch({ type: "RECALL_UNIT", unitId: unit.id })}
              className="w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            >
              Återkalla till bas
            </button>
            <button
              onClick={() => {
                const lat = parseFloat(prompt("Ny lat?", unit.position.lat.toFixed(3)) ?? "");
                const lng = parseFloat(prompt("Ny lng?", unit.position.lng.toFixed(3)) ?? "");
                if (!isFinite(lat) || !isFinite(lng)) return;
                dispatch({ type: "RELOCATE_UNIT", unitId: unit.id, destination: { lat, lng } });
              }}
              className="w-full px-2 py-1 border border-border rounded hover:bg-muted/30"
            >
              Omplacera i fält
            </button>
          </>
        )}
      </section>

      <Link to={`/units/${unit.id}`} className="block text-center text-primary text-[11px] hover:underline pt-2 border-t border-border">
        Fullständig översikt →
      </Link>
    </div>
  );
}

// Re-export type guards helper for the parent
export { isAircraft };
