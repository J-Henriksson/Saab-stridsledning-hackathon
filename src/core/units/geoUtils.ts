import * as turf from "@turf/turf";
import { SWEDEN_LAND_RINGS } from "@/data/geoBoundaries";
import { GeoPosition } from "@/types/units";

/**
 * Returns true if the given position is on land (specifically Swedish land defined in our geoBoundaries).
 */
export function isPositionOnLand(pos: GeoPosition): boolean {
  const point = turf.point([pos.lng, pos.lat]);
  const polygons = SWEDEN_LAND_RINGS.map(ring => turf.polygon([ring]));
  
  for (const poly of polygons) {
    if (turf.booleanPointInPolygon(point, poly)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Returns true if the given position is in the sea.
 */
export function isPositionInSea(pos: GeoPosition): boolean {
  return !isPositionOnLand(pos);
}
