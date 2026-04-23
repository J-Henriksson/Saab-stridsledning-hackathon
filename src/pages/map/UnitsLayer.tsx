import { Marker } from "react-map-gl/maplibre";
import type { Unit } from "@/types/units";
import { isAircraft } from "@/types/units";
import { UnitSymbol } from "@/components/map/UnitSymbol";

interface UnitsLayerProps {
  units: Unit[];
  onSelectUnit?: (unitId: string) => void;
  selectedUnitId?: string | null;
}

export function UnitsLayer({ units, onSelectUnit, selectedUnitId }: UnitsLayerProps) {
  // Skip aircraft — they're rendered by AircraftLayer with flight animations
  const renderable = units.filter((u) => !isAircraft(u));

  return (
    <>
      {renderable.map((unit) => (
        <Marker
          key={unit.id}
          longitude={unit.position.lng}
          latitude={unit.position.lat}
          anchor="center"
          onClick={(e) => {
            // Prevent the map's onClick from deselecting
            e.originalEvent.stopPropagation();
            onSelectUnit?.(unit.id);
          }}
        >
          <div
            style={{
              cursor: "pointer",
              filter: selectedUnitId === unit.id ? "drop-shadow(0 0 4px #D7AB3A)" : undefined,
              transform: selectedUnitId === unit.id ? "scale(1.15)" : undefined,
              transition: "transform 120ms ease",
            }}
            title={`${unit.name} — ${unit.category} (${unit.affiliation})`}
          >
            <UnitSymbol sidc={unit.sidc} size={28} title={unit.name} />
          </div>
        </Marker>
      ))}
    </>
  );
}
