// « Il y a un an » : un voyage commencé à la même période (± 3 jours) une année précédente.
const KEY = 'carnet:souvenir-vu'
const DAY = 864e5

export function findAnniversary(trips, today = new Date()) {
  const year = today.getFullYear()
  let best = null
  for (const t of trips) {
    if (!t.startDate) continue
    const start = new Date(`${t.startDate}T00:00:00`)
    const years = year - start.getFullYear()
    if (years < 1) continue
    // Même jour cette année (et l'année d'à côté pour les voyages autour du Nouvel An)
    const diff = Math.min(
      ...[-1, 0, 1].map((k) => Math.abs(new Date(year + k, start.getMonth(), start.getDate()) - today) / DAY),
    )
    if (diff <= 3 && (!best || years < best.years)) best = { trip: t, years }
  }
  return best
}

const todayKey = () => new Date().toDateString()

export function anniversarySeen() {
  try {
    return localStorage.getItem(KEY) === todayKey()
  } catch {
    return false
  }
}

export function markAnniversarySeen() {
  try {
    localStorage.setItem(KEY, todayKey())
  } catch {
    // sans stockage : la carte reviendra à la prochaine ouverture
  }
}
