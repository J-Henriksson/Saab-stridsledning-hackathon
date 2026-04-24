import type { GeoPosition } from "@/types/units";

const DEFAULT_MAX_POINTS = 240; // ~4 game-hours of history at 1× (every minute)
const MIN_STEP_DEG = 0.003; // ~330 m — fine enough for FlightRadar-style trails

/**
 * Append `position` to `history` iff it moved at least `MIN_STEP_DEG` since the
 * last breadcrumb. Cap the resulting array at `maxPoints`.
 */
export function appendToPathHistory(
  history: GeoPosition[] | undefined,
  position: GeoPosition,
  maxPoints: number = DEFAULT_MAX_POINTS,
): GeoPosition[] {
  const last = history?.[history.length - 1];
  if (last) {
    const dLat = position.lat - last.lat;
    const dLng = position.lng - last.lng;
    if (dLat * dLat + dLng * dLng < MIN_STEP_DEG * MIN_STEP_DEG) {
      return history;
    }
  }
  const next = history ? [...history, { lat: position.lat, lng: position.lng }] : [{ lat: position.lat, lng: position.lng }];
  return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
}
