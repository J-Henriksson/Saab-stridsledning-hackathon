export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sin2 = Math.sin(dLat/2)**2 + Math.cos(a.lat * Math.PI/180) *
               Math.cos(b.lat * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

/**
 * Creates a GeoJSON circle (polygon) around a point.
 */
export function createCircleGeoJSON(
  center: { lat: number; lng: number },
  radiusMeters: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const km = radiusMeters / 1000;
  const reticle = 6371; // Earth radius in km

  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;
  const dRad = km / reticle;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const pLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(dRad) +
        Math.cos(latRad) * Math.sin(dRad) * Math.cos(angle)
    );
    const pLngRad =
      lngRad +
      Math.atan2(
        Math.sin(angle) * Math.sin(dRad) * Math.cos(latRad),
        Math.cos(dRad) - Math.sin(latRad) * Math.sin(pLatRad)
      );

    coords.push([(pLngRad * 180) / Math.PI, (pLatRad * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}
