import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Plaque from './Plaque.jsx'
import PhotoGrid from './PhotoGrid.jsx'

const SAVE_DELAY = 500

/**
 * Fiche d'un voyage : panneau à droite sur ordinateur, tiroir en bas sur téléphone.
 * Tous les champs sont modifiables directement et enregistrés automatiquement.
 * Monté avec key={trip.id} : le brouillon repart de zéro à chaque voyage.
 */
export default function TripPanel({ trip, number, photos, onUpdate, onDelete, onClose, onAddPhotos, onOpenPhoto }) {
  const [draft, setDraft] = useState(trip)
  const [busy, setBusy] = useState(false)
  const pending = useRef(null)
  const fileInput = useRef(null)

  // Enregistrement différé après la frappe, et forcé à la fermeture.
  useEffect(() => {
    if (draft === trip) return
    pending.current = draft
    const timer = setTimeout(() => {
      onUpdate(draft)
      pending.current = null
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => pending.current && onUpdate(pending.current), []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => {
    const value = e.target.value
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
        <Plaque number={number} startDate={draft.startDate} endDate={draft.endDate} photoCount={photos.length} />

        <input
          value={draft.title}
          onChange={set('title')}
          placeholder="Titre du voyage"
          className="mt-6 w-full bg-transparent font-mono text-2xl leading-[30px] font-bold text-encre outline-none placeholder:text-encre-muette"
        />
        <p className="mt-2 flex items-center gap-1 text-sm text-encre-douce">
          <Icon name="pin" size={16} className="shrink-0 text-bleu" />
          {draft.place.name}
        </p>

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

        <label className="mt-6 block">
          <span className="etiquette text-encre-muette">Journal de bord</span>
          <textarea
            value={draft.notes}
            onChange={set('notes')}
            rows={6}
            placeholder="Ce qui s'est passé, ce qu'il faut retenir…"
            className="champ mt-1 min-h-[140px] resize-y"
          />
        </label>

        <div className="mt-6 flex items-center justify-between">
          <span className="etiquette text-encre-muette">Photos</span>
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
        <PhotoGrid photos={photos} onOpen={onOpenPhoto} />

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
