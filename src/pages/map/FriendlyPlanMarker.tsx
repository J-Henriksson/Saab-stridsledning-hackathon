import { Marker } from "react-map-gl/maplibre";
import type { FriendlyMarker, FriendlyEntity } from "@/types/game";
import { UnitSymbol } from "@/components/map/UnitSymbol";
// Hand-picked friend NATO symbols that render clearly on the planning map.
const FRIEND_GROUND_SIDC = "10031000001211000000";    // armored / ground unit
const FRIEND_NAVAL_SIDC = "10033000001202000000";     // surface combatant

const FRIENDLY_MARKER_SIDC: Record<FriendlyMarker["category"], string> = {
  airbase: FRIEND_GROUND_SIDC,
  logistics: FRIEND_GROUND_SIDC,
  command: FRIEND_GROUND_SIDC,
  army: FRIEND_GROUND_SIDC,
  navy: FRIEND_NAVAL_SIDC,
};

const FRIENDLY_ENTITY_SIDC: Record<FriendlyEntity["category"], string> = {
  aircraft: FRIEND_GROUND_SIDC,
  air_defense: FRIEND_GROUND_SIDC,
  radar: FRIEND_GROUND_SIDC,
  drone: FRIEND_GROUND_SIDC,
};

export function FriendlyMarkerPin({ marker, isPlaceholder }: { marker: FriendlyMarker; isPlaceholder?: boolean }) {
  return (
    <Marker longitude={marker.coords.lng} latitude={marker.coords.lat} anchor="center">
      <div
        title={`${marker.name}${isPlaceholder ? " [PLAN]" : ""}`}
        className="cursor-default"
        style={{ opacity: isPlaceholder ? 0.65 : 1 }}
      >
        <div
          style={{
            transform: isPlaceholder ? "scale(0.92)" : undefined,
            filter: isPlaceholder ? "drop-shadow(0 0 4px rgba(59,130,246,0.25))" : undefined,
          }}
        >
          <UnitSymbol
            sidc={FRIENDLY_MARKER_SIDC[marker.category]}
            size={30}
            title={marker.name}
          />
        </div>
      </div>
    </Marker>
  );
}

export function FriendlyEntityPin({ entity, isPlaceholder }: { entity: FriendlyEntity; isPlaceholder?: boolean }) {
  return (
    <Marker longitude={entity.coords.lng} latitude={entity.coords.lat} anchor="center">
      <div
        title={`${entity.name}${isPlaceholder ? " [PLAN]" : ""}`}
        className="cursor-default"
        style={{ opacity: isPlaceholder ? 0.65 : 1 }}
      >
        <div
          style={{
            transform: isPlaceholder ? "scale(0.92)" : undefined,
            filter: isPlaceholder ? "drop-shadow(0 0 4px rgba(59,130,246,0.25))" : undefined,
          }}
        >
          <UnitSymbol
            sidc={FRIENDLY_ENTITY_SIDC[entity.category]}
            size={28}
            title={entity.name}
          />
        </div>
      </div>
    </Marker>
  );
}
