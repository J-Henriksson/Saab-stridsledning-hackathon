import { useParams, Link } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import { UnitSymbol } from "@/components/map/UnitSymbol";
import gripenSilhouette from "@/assets/gripen-silhouette.png";
import { isAircraft, isDrone, isAirDefense, isGroundVehicle, isRadar } from "@/types/units";

export default function UnitDashboard() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useGame();

  const unit = [...state.bases.flatMap((b) => b.units), ...state.deployedUnits].find((u) => u.id === id);

  if (!unit) {
    return (
      <div className="p-6 font-mono text-sm">
        <div>Enhet {id} hittades inte.</div>
        <Link to="/map" className="text-primary hover:underline">← Tillbaka till karta</Link>
      </div>
    );
  }

  const events = state.events.filter((e) => e.unitId === unit.id || e.aircraftId === unit.id);

  return (
    <div className="p-6 space-y-6 font-mono text-sm max-w-4xl mx-auto">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        {isAircraft(unit) ? (
          <img
            src={gripenSilhouette}
            alt={unit.name}
            width={72}
            style={{
              filter: unit.affiliation === "hostile"
                ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(320deg)"
                : unit.affiliation === "neutral"
                ? "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(200deg)"
                : unit.affiliation === "friend"
                ? "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(90deg)"
                : "brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(50deg)",
            }}
          />
        ) : (
          <UnitSymbol sidc={unit.sidc} size={72} />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{unit.name}</h1>
          <div className="text-xs text-muted-foreground uppercase tracking-widest">
            {unit.category} · {unit.affiliation} · hälsa {unit.health}%
          </div>
        </div>
        <Link to="/map" className="text-xs text-primary hover:underline">← Karta</Link>
      </div>

      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plats</div>
          <div>Aktuell bas: <span className="text-foreground">{unit.currentBase ?? "—"}</span></div>
          <div>Senaste bas: <span className="text-foreground">{unit.lastBase ?? "—"}</span></div>
          <div>Position: <span className="text-foreground">{unit.position.lat.toFixed(3)}, {unit.position.lng.toFixed(3)}</span></div>
          <div>Rörelse: <span className="text-foreground">{unit.movement.state} @ {Math.round(unit.movement.speed)} kt</span></div>
        </div>

        {(isAircraft(unit) || isDrone(unit)) && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Flygverksamhet</div>
            <div>Status: <span className="text-foreground">{unit.status}</span></div>
            <div>Bränsle: <span className="text-foreground">{Math.round(unit.fuel)}%</span></div>
            {isAircraft(unit) && (
              <>
                <div>Flygtimmar: <span className="text-foreground">{unit.flightHours} h</span></div>
                <div>Service om: <span className="text-foreground">{unit.hoursToService} h</span></div>
              </>
            )}
            {isDrone(unit) && (
              <div>Uthållighet: <span className="text-foreground">{unit.enduranceHours} h</span></div>
            )}
          </div>
        )}

        {isAirDefense(unit) && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Luftvärn</div>
            <div>Läge: <span className="text-foreground">{unit.deployedState}</span></div>
            <div>Robotar: <span className="text-foreground">{unit.missileStock.loaded}/{unit.missileStock.max}</span></div>
            <div>Bränsle: <span className="text-foreground">{Math.round(unit.fuel)}%</span></div>
          </div>
        )}

        {isGroundVehicle(unit) && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Markfordon</div>
            <div>Typ: <span className="text-foreground">{unit.type}</span></div>
            <div>Bränsle: <span className="text-foreground">{Math.round(unit.fuel)}%</span></div>
            <div>Vägfart: <span className="text-foreground">{unit.roadSpeed} kt</span></div>
          </div>
        )}

        {isRadar(unit) && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Radar</div>
            <div>Typ: <span className="text-foreground">{unit.type}</span></div>
            <div>Läge: <span className="text-foreground">{unit.deployedState}</span></div>
            <div>Sänder: <span className="text-foreground">{unit.emitting ? "ja" : "nej"}</span></div>
            <button
              className="mt-2 px-3 py-1 border border-border rounded hover:bg-muted/30"
              onClick={() => dispatch({ type: "SET_RADAR_EMITTING", unitId: unit.id, emitting: !unit.emitting })}
            >
              {unit.emitting ? "Stoppa sändning" : "Starta sändning"}
            </button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Händelsehistorik</div>
        {events.length === 0 ? (
          <div className="text-muted-foreground text-xs">Inga loggade händelser.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 border-l-2 border-border pl-3 py-1">
                <span className="text-muted-foreground w-32 shrink-0">{e.timestamp}</span>
                <span className="text-foreground flex-1">{e.message}</span>
                {e.actionType && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted/30 text-muted-foreground">
                    {e.actionType}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
