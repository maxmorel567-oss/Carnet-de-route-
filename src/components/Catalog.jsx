import { useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { formatDates, padNumber } from '../lib/format.js'
import { formatLastBackup } from '../lib/backup.js'

// Menu latéral : catalogue textuel des voyages + sauvegarde.
export default function Catalog({ trips, photos, numbers, needsBackup, onSelect, onClose, onExport, onImport }) {
  const [filter, setFilter] = useState('')
  const fileInput = useRef(null)

  const photoCount = useMemo(() => {
    const counts = {}
    photos.forEach((p) => (counts[p.tripId] = (counts[p.tripId] ?? 0) + 1))
    return counts
  }, [photos])

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return trips
      .filter((t) => !q || `${t.title} ${t.place.name} ${t.notes}`.toLowerCase().includes(q))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  }, [trips, filter])

  const handleImport = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) onImport(file)
  }

  return (
    <div className="fixed inset-0 z-[1200] bg-black/30" onClick={onClose}>
      <nav
        className="glisse flex h-full w-[360px] max-w-[88vw] flex-col border-r border-trait bg-fond"
        onClick={(e) => e.stopPropagation()}
        aria-label="Mes voyages"
      >
        <header className="grille-plan border-b border-trait px-6 pt-6 pb-4 [padding-top:max(1.5rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between">
            <div>
              <p className="etiquette text-bleu">Carnet de route</p>
              <h1 className="mt-1 font-mono text-2xl leading-[30px] font-bold">
                {trips.length}&nbsp;voyage{trips.length > 1 ? 's' : ''}
              </h1>
            </div>
            <button onClick={onClose} className="rounded-[8px] p-2 text-encre-douce hover:bg-bois" aria-label="Fermer">
              <Icon name="close" />
            </button>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer…"
            className="champ mt-4 bg-surface"
          />
        </header>

        <ul className="flex-1 overflow-y-auto px-3 py-3">
          {list.length === 0 && (
            <li className="px-3 py-4 text-sm text-encre-douce">
              {trips.length ? 'Aucun voyage ne correspond.' : 'Aucun voyage pour le moment.'}
            </li>
          )}
          {list.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onSelect(t)}
                className="flex w-full gap-3 rounded-[8px] px-3 py-3 text-left hover:bg-bois"
              >
                <span className="etiquette mt-1 shrink-0 text-encre-muette">{padNumber(numbers[t.id])}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title || 'Sans titre'}</span>
                  <span className="block truncate text-sm text-encre-douce">
                    {t.place.name} · {formatDates(t.startDate, t.endDate)}
                  </span>
                </span>
                <span className="mt-1 shrink-0 font-mono text-xs text-encre-muette">
                  {photoCount[t.id] ?? 0}&nbsp;ph.
                </span>
              </button>
            </li>
          ))}
        </ul>

        <footer className="grid grid-cols-2 gap-2 border-t border-trait p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <p className={`col-span-2 text-sm ${needsBackup ? 'font-medium text-bleu' : 'text-encre-douce'}`}>
            {formatLastBackup()}
            {needsBackup && ' : pense à exporter.'}
          </p>
          <button onClick={onExport} className="option-flottante justify-center shadow-none">
            <Icon name="download" size={18} />
            Exporter
          </button>
          <button onClick={() => fileInput.current.click()} className="option-flottante justify-center shadow-none">
            <Icon name="upload" size={18} />
            Importer
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </footer>
      </nav>
    </div>
  )
}
