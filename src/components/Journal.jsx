import Icon from './Icon.jsx'
import { newId } from '../lib/id.js'
import { todayIso } from '../lib/format.js'

const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
const DAY = 864e5
const parse = (iso) => new Date(`${iso}T00:00:00`)
const addDays = (iso, n) => {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

// Date proposée pour une nouvelle journée : aujourd'hui pendant le voyage, sinon le jour après la dernière entrée.
function nextDate(trip, entries) {
  const today = todayIso()
  const during = trip.startDate && today >= trip.startDate && (!trip.endDate || today <= trip.endDate)
  if (during && !entries.some((e) => e.date === today)) return today
  const last = entries.at(-1)?.date
  return last ? addDays(last, 1) : trip.startDate || today
}

// Journal de bord : une entrée par jour, « Jour N » compté depuis le début du voyage.
export default function Journal({ trip, entries = [], onChange }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const update = (id, patch) => onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (entry) => {
    if (!entry.text.trim() || confirm('Supprimer cette journée du journal ?')) onChange(entries.filter((e) => e.id !== entry.id))
  }

  return (
    <div className="mt-6">
      <span className="etiquette text-encre-muette">Journal de bord</span>
      <ol className="mt-2 flex flex-col gap-3">
        {sorted.map((entry) => {
          const n = trip.startDate ? Math.round((parse(entry.date) - parse(trip.startDate)) / DAY) + 1 : null
          return (
            <li key={entry.id} className="rounded-[8px] border border-trait bg-fond p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold">{n >= 1 ? `Jour ${n}` : 'Avant le départ'}</span>
                <span className="text-sm text-encre-douce">· {fmtDay.format(parse(entry.date))}</span>
                <label className="ml-auto text-encre-muette" title="Changer la date">
                  <span className="sr-only">Date de la journée</span>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => e.target.value && update(entry.id, { date: e.target.value })}
                    className="w-[2.2rem] cursor-pointer bg-transparent text-transparent [color-scheme:inherit]"
                  />
                </label>
                <button onClick={() => remove(entry)} className="p-1 text-encre-muette hover:text-encre" aria-label="Supprimer la journée">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <textarea
                value={entry.text}
                onChange={(e) => update(entry.id, { text: e.target.value })}
                rows={3}
                placeholder="Ce qui s'est passé aujourd'hui…"
                aria-label={`Journal du ${fmtDay.format(parse(entry.date))}`}
                className="mt-2 w-full resize-y bg-transparent text-base outline-none placeholder:text-encre-muette"
              />
            </li>
          )
        })}
      </ol>
      <button
        onClick={() => onChange([...entries, { id: newId(), date: nextDate(trip, sorted), text: '' }])}
        className="puce mt-3 text-bleu"
      >
        <Icon name="plus" size={14} /> Ajouter une journée
      </button>
    </div>
  )
}
