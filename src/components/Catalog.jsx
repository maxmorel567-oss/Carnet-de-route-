import { useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { formatDates, padNumber } from '../lib/format.js'
import { formatLastBackup } from '../lib/backup.js'
import { Chip } from './Tags.jsx'

// Menu latéral : catalogue textuel des voyages + sauvegarde.
const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' })

export default function Catalog({ trips, photos, numbers, tags, visited = [], activeTag, onTag, needsBackup, onSelect, onClose, onExport, onImport }) {
  const [filter, setFilter] = useState('')
  const fileInput = useRef(null)

  // Nombre de photos et vignette de couverture par voyage
  const { photoCount, covers } = useMemo(() => {
    const counts = {}
    const firsts = {}
    photos.forEach((p) => {
      counts[p.tripId] = (counts[p.tripId] ?? 0) + 1
      firsts[p.tripId] ??= p
    })
    const byId = Object.fromEntries(photos.map((p) => [p.id, p]))
    const coverOf = Object.fromEntries(trips.map((t) => [t.id, byId[t.coverId] ?? firsts[t.id]]))
    return { photoCount: counts, covers: coverOf }
  }, [photos, trips])

  // Lieux distincts : départs + étapes
  const places = useMemo(() => new Set(trips.flatMap((t) => [t.place, ...(t.stops ?? [])].map((s) => s.name))).size, [trips])

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return trips
      .filter((t) => !activeTag || t.tags?.includes(activeTag))
      .filter((t) => !q || `${t.title} ${t.place.name} ${t.notes} ${(t.tags ?? []).join(' ')} ${(t.stops ?? []).map((s) => s.name).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  }, [trips, filter, activeTag])

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
              {visited.length > 0 && (
                <p className="mt-1 text-sm text-encre-douce">
                  <span className="font-mono font-bold text-encre">
                    {visited.length}&nbsp;pays · {places}&nbsp;lieu{places > 1 ? 'x' : ''}
                  </span>
                  <span className="block">
                    {visited
                      .map((c) => countryNames.of(c))
                      .sort((a, b) => a.localeCompare(b, 'fr'))
                      .join(', ')}
                  </span>
                </p>
              )}
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
          {tags.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer par étiquette">
              <Chip label="Tous" active={!activeTag} onClick={() => onTag(null)} />
              {tags.map((t) => (
                <Chip key={t} label={t} active={t === activeTag} onClick={() => onTag(t === activeTag ? null : t)} />
              ))}
            </div>
          )}
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
                {covers[t.id] ? (
                  <img src={covers[t.id].thumbUrl} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-photo-vide text-encre-muette">
                    <Icon name="pin" size={18} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title || 'Sans titre'}</span>
                  <span className="block truncate text-sm text-encre-douce">
                    {t.place.name} · {formatDates(t.startDate, t.endDate)}
                  </span>
                </span>
                <span className="mt-1 shrink-0 text-right font-mono text-xs leading-5 text-encre-muette">
                  N°&nbsp;{padNumber(numbers[t.id])}
                  <br />
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
