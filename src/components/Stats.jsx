import { routeKm, tripStops } from '../lib/geo.js'

const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const DAY = 864e5
const parse = (iso) => new Date(`${iso}T00:00:00`)

// Durée en jours (début et fin inclus ; un seul jour sans date de fin)
export const tripDays = (t) => (t.startDate ? Math.max(1, Math.round((parse(t.endDate || t.startDate) - parse(t.startDate)) / DAY) + 1) : 0)

// Statistiques de tous les voyages (hors liste de souhaits)
export default function Stats({ trips, photos, visited }) {
  const km = trips.map((t) => ({ t, km: routeKm(tripStops(t)) }))
  const totals = [
    ['Voyages', trips.length],
    ['Pays', visited.length],
    ['Jours de voyage', trips.reduce((s, t) => s + tripDays(t), 0)],
    ['Km de trajets', Math.round(km.reduce((s, x) => s + x.km, 0))],
    ['Photos', photos.length],
    ['Coups de cœur', trips.filter((t) => t.favorite).length],
  ]

  const perYear = [...trips.reduce((m, t) => {
    const y = t.startDate?.slice(0, 4)
    if (y) m.set(y, (m.get(y) ?? 0) + 1)
    return m
  }, new Map())].sort((a, b) => b[0].localeCompare(a[0]))
  const max = Math.max(1, ...perYear.map(([, n]) => n))

  const longest = [...trips].sort((a, b) => tripDays(b) - tripDays(a))[0]
  const farthest = [...km].sort((a, b) => b.km - a.km)[0]

  if (!trips.length) return <p className="px-3 py-4 text-sm text-encre-douce">Les statistiques apparaîtront avec ton premier voyage.</p>

  return (
    <div className="px-3 py-2">
      <dl className="grid grid-cols-2 gap-2">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-trait bg-surface px-3 py-2">
            <dt className="etiquette text-encre-muette">{label}</dt>
            <dd className="font-mono text-2xl font-bold tabular-nums">{fmt.format(value)}</dd>
          </div>
        ))}
      </dl>

      <h2 className="etiquette mt-6 text-encre-muette">Voyages par année</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {perYear.map(([year, n]) => (
          <li key={year} className="flex items-center gap-3 text-sm">
            <span className="w-10 shrink-0 font-mono tabular-nums">{year}</span>
            <span className="h-3 rounded-[2px] bg-bleu" style={{ width: `${(n / max) * 70}%` }} />
            <span className="font-mono tabular-nums text-encre-douce">{n}</span>
          </li>
        ))}
      </ul>

      <h2 className="etiquette mt-6 text-encre-muette">Records</h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        <li>
          Plus long voyage : <span className="font-medium">{longest.title}</span>{' '}
          <span className="font-mono">({tripDays(longest)}&nbsp;j)</span>
        </li>
        {farthest.km > 0 && (
          <li>
            Plus long trajet : <span className="font-medium">{farthest.t.title}</span>{' '}
            <span className="font-mono">({fmt.format(farthest.km)}&nbsp;km)</span>
          </li>
        )}
      </ul>
    </div>
  )
}
