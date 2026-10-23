import { useState } from 'react'
import Icon from './Icon.jsx'
import { routeKm, tripStops } from '../lib/geo.js'

const fmtKm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

// Étapes d'un voyage : départ + étapes ordonnées, avec distance totale.
export default function Stops({ trip, onChange, onAdd }) {
  const [menu, setMenu] = useState(false)
  const stops = trip.stops ?? []
  const all = tripStops(trip)

  const move = (index, step) => {
    const next = [...stops]
    ;[next[index], next[index + step]] = [next[index + step], next[index]]
    onChange(next)
  }
  const choose = (how) => () => {
    setMenu(false)
    onAdd(how)
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <span className="etiquette text-encre-muette">Étapes</span>
        {all.length > 1 && (
          <span className="etiquette text-encre-muette">
            {all.length}&nbsp;étapes · {fmtKm.format(routeKm(all))}&nbsp;km
          </span>
        )}
      </div>
      <ol className="mt-2 flex flex-col gap-1" aria-label="Étapes">
        {all.map((s, i) => (
          <li key={s.id ?? 'depart'} className="flex items-center gap-3 rounded-[8px] py-1">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bleu font-mono text-xs font-bold text-sur-bleu">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {s.name}
              {i === 0 && <span className="text-sm text-encre-muette"> · départ</span>}
            </span>
            {i > 0 && (
              <span className="flex shrink-0 text-encre-muette">
                <button onClick={() => move(i - 1, -1)} disabled={i === 1} className="p-1 disabled:opacity-30" aria-label={`Monter ${s.name}`}>
                  <Icon name="up" size={16} />
                </button>
                <button onClick={() => move(i - 1, 1)} disabled={i === all.length - 1} className="p-1 disabled:opacity-30" aria-label={`Descendre ${s.name}`}>
                  <Icon name="down" size={16} />
                </button>
                <button onClick={() => onChange(stops.filter((x) => x.id !== s.id))} className="p-1" aria-label={`Retirer ${s.name}`}>
                  <Icon name="close" size={16} />
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {menu ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={choose('recherche')} className="puce">
            <Icon name="search" size={14} /> Rechercher
          </button>
          <button onClick={choose('carte')} className="puce">
            <Icon name="crosshair" size={14} /> Sur la carte
          </button>
          <button onClick={choose('position')} className="puce">
            <Icon name="locate" size={14} /> Ma position
          </button>
          <button onClick={() => setMenu(false)} className="etiquette px-1 text-encre-muette">
            Annuler
          </button>
        </div>
      ) : (
        <button onClick={() => setMenu(true)} className="puce mt-2 text-bleu">
          <Icon name="plus" size={14} /> Ajouter une étape
        </button>
      )}
    </div>
  )
}
