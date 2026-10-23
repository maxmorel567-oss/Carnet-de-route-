import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Plaque from './Plaque.jsx'
import PhotoGrid from './PhotoGrid.jsx'
import { TagEditor } from './Tags.jsx'
import Stops from './Stops.jsx'
import Journal from './Journal.jsx'

const SAVE_DELAY = 500
const FIELDS = ['title', 'startDate', 'endDate', 'notes', 'tags', 'entries', 'rating', 'favorite']
const pick = (trip) => Object.fromEntries(FIELDS.map((f) => [f, trip[f]]))

/**
 * Fiche d'un voyage : panneau à droite sur ordinateur, tiroir en bas sur téléphone.
 * Tous les champs sont modifiables directement et enregistrés automatiquement.
 * Monté avec key={trip.id} : le brouillon repart de zéro à chaque voyage.
 */
export default function TripPanel({ trip, number, photos, knownTags, onUpdate, onStopsChange, onAddStop, onSlideshow, onSouvenir, onDelete, onClose, onAddPhotos, onOpenPhoto }) {
  // Brouillon des seuls champs modifiés ici ; onUpdate(champs) les fusionne dans le voyage.
  const [draft, setDraft] = useState(() => pick(trip))
  const [busy, setBusy] = useState(false)
  const pending = useRef(null)
  const dirty = useRef(false)
  const fileInput = useRef(null)
  const cover = photos.find((p) => p.id === trip.coverId) ?? photos[0]

  // Enregistrement différé après la frappe, et forcé à la fermeture.
  useEffect(() => {
    if (!dirty.current) return
    pending.current = draft
    const timer = setTimeout(() => {
      onUpdate(draft)
      pending.current = null
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => pending.current && onUpdate(pending.current), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Modification directe d'un champ (étiquettes, journal, note, favori)
  const setField = (field) => (value) => {
    dirty.current = true
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const set = (field) => (e) => {
    const value = e.target.value
    dirty.current = true
    setDraft((d) => {
      const next = { ...d, [field]: value }
      // Une fin avant le début n'a pas de sens : on l'aligne.
      if (next.endDate && next.startDate && next.endDate < next.startDate) next.endDate = next.startDate
      return next
    })
  }

  const handleFiles = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    await onAddPhotos(files)
    setBusy(false)
  }

  const confirmDelete = () => {
    if (!confirm(`Supprimer « ${draft.title} » et ses ${photos.length} photo(s) ? C'est définitif.`)) return
    pending.current = null // sinon l'enregistrement à la fermeture recréerait le voyage
    dirty.current = false
    onDelete()
  }

  return (
    <aside
      className="tiroir fixed inset-x-0 bottom-0 z-[1000] flex max-h-[78dvh] flex-col rounded-t-[12px] border-t border-trait bg-surface shadow-2xl
                 md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-[420px] md:rounded-[12px] md:border"
      aria-label={`Voyage ${draft.title}`}
    >
      {/* Poignée (téléphone) + fermeture */}
      <div className="relative flex h-12 shrink-0 items-center justify-center">
        <span className="h-1 w-10 rounded-full bg-trait md:hidden" />
        <button
          onClick={onClose}
          className="absolute top-1 right-3 rounded-[8px] p-2 text-encre-douce hover:bg-bois"
          aria-label="Fermer"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="overflow-y-auto px-6 pb-8 [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
        {cover && (
          <button onClick={() => onOpenPhoto(cover.id)} className="mb-4 block w-full overflow-hidden rounded-[8px]" aria-label="Voir la photo de couverture">
            <img src={cover.url} alt="" className="glisse h-40 w-full object-cover md:h-48" />
          </button>
        )}
        <Plaque number={number} startDate={draft.startDate} endDate={draft.endDate} photoCount={photos.length} />

        <div className="mt-6 flex items-start gap-2">
          <input
            value={draft.title}
            onChange={set('title')}
            placeholder="Titre du voyage"
            aria-label="Titre du voyage"
            className="min-w-0 flex-1 bg-transparent font-mono text-2xl leading-[30px] font-bold text-encre outline-none placeholder:text-encre-muette"
          />
          <button
            onClick={() => setField('favorite')(!draft.favorite)}
            aria-pressed={Boolean(draft.favorite)}
            aria-label="Coup de cœur"
            className={`rounded-[8px] p-1 ${draft.favorite ? 'text-rouge' : 'text-encre-muette hover:text-encre'}`}
          >
            <Icon name="heart" size={26} filled={draft.favorite} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-encre-douce">
          <Icon name="pin" size={16} className="shrink-0 text-bleu" />
          {trip.place.name}
        </p>
        <div className="mt-3 flex items-center gap-0.5" role="radiogroup" aria-label="Note du voyage">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={draft.rating === n}
              aria-label={`${n} sur 5`}
              onClick={() => setField('rating')(draft.rating === n ? 0 : n)}
              className={`p-0.5 ${n <= (draft.rating ?? 0) ? 'text-bleu' : 'text-trait hover:text-encre-muette'}`}
            >
              <Icon name="star" size={22} filled={n <= (draft.rating ?? 0)} />
            </button>
          ))}
          <button onClick={() => onSouvenir(draft)} className="puce ml-auto text-bleu">
            <Icon name="image" size={14} /> Image souvenir
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="etiquette text-encre-muette">Début</span>
            <input type="date" value={draft.startDate} onChange={set('startDate')} className="champ mt-1" />
          </label>
          <label className="block">
            <span className="etiquette text-encre-muette">Fin</span>
            <input type="date" value={draft.endDate} min={draft.startDate} onChange={set('endDate')} className="champ mt-1" />
          </label>
        </div>

        <Stops trip={trip} onChange={onStopsChange} onAdd={onAddStop} />

        <div className="mt-6">
          <span className="etiquette text-encre-muette">Étiquettes</span>
          <TagEditor tags={draft.tags ?? []} known={knownTags} onChange={setField('tags')} />
        </div>

        <Journal trip={draft} entries={draft.entries ?? []} onChange={setField('entries')} />

        <label className="mt-6 block">
          <span className="etiquette text-encre-muette">Notes</span>
          <textarea
            value={draft.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Infos pratiques, adresses, à retenir…"
            className="champ mt-1 resize-y"
          />
        </label>

        <div className="mt-6 flex items-center justify-between">
          <span className="etiquette text-encre-muette">Photos</span>
          {photos.length > 1 && (
            <button onClick={onSlideshow} className="ml-auto mr-2 flex items-center gap-1 rounded-[8px] px-3 py-2 text-sm text-bleu hover:bg-bois">
              <Icon name="play" size={16} />
              Diaporama
            </button>
          )}
          <button
            onClick={() => fileInput.current.click()}
            disabled={busy}
            className="flex items-center gap-1 rounded-[8px] bg-bleu px-4 py-2 text-sm font-medium text-sur-bleu hover:bg-bleu-fort disabled:opacity-60"
          >
            <Icon name="plus" size={16} />
            {busy ? 'Traitement…' : 'Ajouter'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
        </div>
        <PhotoGrid photos={photos} coverId={cover?.id} onOpen={onOpenPhoto} />

        <button
          onClick={confirmDelete}
          className="mt-8 flex items-center gap-1 text-sm text-encre-muette hover:text-encre"
        >
          <Icon name="trash" size={16} />
          Supprimer ce voyage
        </button>
      </div>
    </aside>
  )
}
