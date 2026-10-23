// Distance à vol d'oiseau (formule de haversine), en km.
const R = 6371
const rad = (d) => (d * Math.PI) / 180

export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const routeKm = (points) => points.slice(1).reduce((sum, p, i) => sum + distanceKm(points[i], p), 0)

// Toutes les étapes d'un voyage, départ compris.
export const tripStops = (trip) => [trip.place, ...(trip.stops ?? [])]
