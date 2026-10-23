// Recherche d'adresse via Nominatim (OpenStreetMap) : gratuit, sans clé.
// Règle d'usage : 1 requête/seconde max, pas d'autocomplétion -> recherche à la validation.
const BASE = 'https://nominatim.openstreetmap.org'

export async function searchPlaces(query) {
  const url = `${BASE}/search?format=jsonv2&limit=6&addressdetails=1&accept-language=fr&q=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Recherche indisponible, réessaie dans un instant.')
  const results = await res.json()
  return results.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    detail: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    country: r.address?.country_code ?? null,
  }))
}

// Nom (ville, sinon région, sinon pays) et code pays d'un point de la carte.
// country : code ISO ('fr'), null si aucun pays (en mer), undefined si la recherche a échoué.
export async function placeInfo(lat, lng) {
  try {
    const res = await fetch(`${BASE}/reverse?format=jsonv2&zoom=10&accept-language=fr&lat=${lat}&lon=${lng}`)
    const r = await res.json()
    const a = r.address || {}
    return {
      name: a.city || a.town || a.village || a.municipality || a.county || a.state || a.country || 'Nouveau lieu',
      country: a.country_code ?? null,
    }
  } catch {
    return { name: 'Nouveau lieu', country: undefined }
  }
}
