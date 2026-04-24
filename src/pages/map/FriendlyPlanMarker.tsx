import { Marker } from "react-map-gl/maplibre";
import type { FriendlyMarker, FriendlyEntity } from "@/types/game";

const BLUE = "#60a5fa";
const BLUE_SOFT = "#3b82f6";

export function FriendlyMarkerPin({ marker }: { marker: FriendlyMarker }) {
  return (
    <Marker longitude={marker.coords.lng} latitude={marker.coords.lat} anchor="center">
      <div title={marker.name} className="cursor-default">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <polygon
            points="14,2 24,8 24,20 14,26 4,20 4,8"
            fill={BLUE}
            fillOpacity={0.2}
            stroke={BLUE}
            strokeWidth={1.5}
          />
          <line x1="14" y1="7" x2="14" y2="21" stroke={BLUE} strokeWidth={1.5} />
          <line x1="7" y1="14" x2="21" y2="14" stroke={BLUE} strokeWidth={1.5} />
        </svg>
      </div>
    </Marker>
  );
}

export function FriendlyEntityPin({ entity }: { entity: FriendlyEntity }) {
  return (
    <Marker longitude={entity.coords.lng} latitude={entity.coords.lat} anchor="center">
      <div title={entity.name} className="cursor-default">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <polygon
            points="10,1 19,10 10,19 1,10"
            fill={BLUE_SOFT}
            fillOpacity={0.2}
            stroke={BLUE_SOFT}
            strokeWidth={1.5}
          />
          <circle cx="10" cy="10" r="2.5" fill={BLUE_SOFT} />
        </svg>
      </div>
    </Marker>
  );
}
