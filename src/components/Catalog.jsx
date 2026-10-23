import { useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { formatDates, padNumber } from '../lib/format.js'
import { formatLastBackup } from '../lib/backup.js'
import { Chip } from './Tags.jsx'
import Stats from './Stats.jsx'
import { getTheme, setTheme } from '../lib/theme.js'
import { DURATIONS, PRIORITIES } from './IdeaPanel.jsx'

const PRIORITY_ORDER = Object.fromEntries(PRIORITIES.map(([id], i) => [id, i]))
const LABEL = Object.fromEntries([...PRIORITIES, ...DURATIONS])
const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Menu latéral : catalogue textuel des voyages + sauvegarde.
const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' })

const SYNC_STATUS = { sync: 'Synchronisation…', ok: 'Synchronisé', error: 'Synchro en erreur, nouvel essai au prochain changement', off: '' }

export default function Catalog({ trips, wishes = [], photos, numbers, tags, visited = [], activeTag, onTag, needsBackup, sync, onSelect, onClose, onExport, onImport }) {
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('liste') // 'liste' | 'frise' | 'souhaits' | 'stats'
  const [favOnly, setFavOnly] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
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
      .filter((t) => !favOnly || t.favorite)
      .filter((t) => !q || `${t.title} ${t.place.name} ${t.notes} ${(t.tags ?? []).join(' ')} ${(t.stops ?? []).map((s) => s.name).join(' ')} ${(t.entries ?? []).map((e) => e.text).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
  }, [trips, filter, activeTag, favOnly])

  // Frise : voyages regroupés par année (les plus récents d'abord)
  const years = useMemo(() => {
    const groups = new Map()
    list.forEach((t) => {
      const year = t.startDate ? t.startDate.slice(0, 4) : 'Sans date'
      groups.set(year, [...(groups.get(year) ?? []), t])
    })
    return [...groups]
  }, [list])

  const renderTrip = (t) => (
    <button onClick={() => onSelect(t)} className="flex w-full gap-3 rounded-[8px] px-3 py-3 text-left hover:bg-bois">
      {covers[t.id] ? (
        <img src={covers[t.id].thumbUrl} alt="" className="h-12 w-12 shrink-0 rounded-[8px] object-cover" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-photo-vide text-encre-muette">
          <Icon name="pin" size={18} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate font-medium">{t.title || 'Sans titre'}</span>
          {t.favorite && <Icon name="heart" size={14} filled className="shrink-0 text-rouge" />}
        </span>
        {sync?.user && t.owner && t.owner !== sync.user.uid && (
          <span className="etiquette block text-bleu">Partagé par {t.ownerEmail}</span>
        )}
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
  )

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
          <div className="mt-3 grid grid-cols-4 rounded-[8px] border border-trait bg-surface p-0.5" role="tablist" aria-label="Affichage">
            {[
              ['liste', 'Liste'],
              ['frise', 'Frise'],
              ['souhaits', 'Idées'],
              ['stats', 'Stats'],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`etiquette rounded-[6px] py-1.5 text-[11px] tracking-[0.04em] ${view === id ? 'bg-bleu text-sur-bleu' : 'text-encre-douce'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {(view === 'liste' || view === 'frise') && (tags.length > 0 || trips.some((t) => t.favorite)) && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer par étiquette">
              <Chip label="Tous" active={!activeTag && !favOnly} onClick={() => (onTag(null), setFavOnly(false))} />
              {trips.some((t) => t.favorite) && <Chip label="Coups de cœur" active={favOnly} onClick={() => setFavOnly((f) => !f)} />}
              {tags.map((t) => (
                <Chip key={t} label={t} active={t === activeTag} onClick={() => onTag(t === activeTag ? null : t)} />
              ))}
            </div>
          )}
        </header>

        <ul className="flex-1 overflow-y-auto px-3 py-3">
          {view === 'stats' && (
            <li>
              <Stats trips={trips} photos={photos.filter((p) => trips.some((t) => t.id === p.tripId))} visited={visited} />
            </li>
          )}
          {(view === 'liste' || view === 'frise') && list.length === 0 && (
            <li className="px-3 py-4 text-sm text-encre-douce">
              {trips.length ? 'Aucun voyage ne correspond.' : 'Aucun voyage pour le moment.'}
            </li>
          )}
          {view === 'souhaits' &&
            (wishes.length ? (
              [...wishes]
                .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
                .map((w) => {
                  const done = (w.todo ?? []).filter((x) => x.done).length
                  const details = [
                    w.duration && LABEL[w.duration],
                    w.months?.length && w.months.map((m) => MONTH_SHORT[m - 1]).join(', '),
                    w.budget != null && `${w.budget}\u00a0€`,
                    w.todo?.length && `${done}/${w.todo.length} à voir`,
                  ].filter(Boolean)
                  return (
                    <li key={w.id}>
                      <button onClick={() => onSelect(w)} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-3 text-left hover:bg-bois">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-bleu text-sur-bleu">
                          <Icon name="flag" size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{w.title}</span>
                            {w.priority && <span className="etiquette shrink-0 text-bleu">{LABEL[w.priority]}</span>}
                          </span>
                          <span className="block truncate text-sm text-encre-douce">{details.join(' · ') || w.place.name}</span>
                        </span>
                      </button>
                    </li>
                  )
                })
            ) : (
              <li className="px-3 py-4 text-sm text-encre-douce">Aucune idée pour le moment. Ajoute-en avec + puis « Idée de voyage ».</li>
            ))}
          {view === 'liste' && list.map((t) => <li key={t.id}>{renderTrip(t)}</li>)}
          {view === 'frise' &&
            years.map(([year, items]) => (
                <li key={year} className="mb-2">
                  <h2 className="flex items-baseline gap-2 px-3 pt-2 pb-1">
                    <span className="font-mono text-xl font-bold">{year}</span>
                    <span className="etiquette text-encre-muette">
                      {items.length}&nbsp;voyage{items.length > 1 ? 's' : ''}
                    </span>
                  </h2>
                  <ol className="frise ml-6 border-l-2 border-trait">
                    {items.map((t) => (
                      <li key={t.id} className="relative pl-2">
                        {renderTrip(t)}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
        </ul>

        <footer className="grid grid-cols-2 gap-2 border-t border-trait p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          {sync?.available && (
            <div className="col-span-2 mb-2 border-b border-trait pb-3">
              {sync.user ? (
                <div className="flex items-center gap-3">
                  {sync.user.photo ? (
                    <img src={sync.user.photo} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bleu font-mono text-sm text-sur-bleu">
                      {sync.user.email[0].toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{sync.user.email}</p>
                    <p className={sync.status === 'error' ? 'text-rouge' : 'text-encre-douce'} role="status">
                      {SYNC_STATUS[sync.status]}
                    </p>
                  </div>
                  <button onClick={sync.signOut} className="etiquette shrink-0 text-encre-muette">
                    Déconnexion
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={sync.signIn} className="option-flottante w-full justify-center shadow-none">
                    <Icon name="upload" size={18} />
                    Se connecter avec Google
                  </button>
                  <p className="mt-1 text-xs text-encre-douce">Synchronise ton téléphone et ton PC, et partage tes voyages.</p>
                </>
              )}
            </div>
          )}
          <div className="col-span-2 mb-1 flex items-center gap-3">
            <span className="etiquette text-encre-muette">Thème</span>
            <div className="grid flex-1 grid-cols-3 rounded-[8px] border border-trait bg-surface p-0.5" role="radiogroup" aria-label="Thème">
              {[
                ['auto', 'Auto'],
                ['light', 'Clair'],
                ['dark', 'Sombre'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={theme === id}
                  onClick={() => {
                    setTheme(id)
                    setThemeState(id)
                  }}
                  className={`etiquette rounded-[6px] py-1 text-[11px] ${theme === id ? 'bg-bleu text-sur-bleu' : 'text-encre-douce'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
