import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// Fiche d'un lieu de la liste de souhaits : idées, puis « J'y suis » pour en faire un voyage.
export default function WishPanel({ wish, onUpdate, onBecomeTrip, onDelete, onClose }) {
  const [draft, setDraft] = useState({ title: wish.title, notes: wish.notes })
  const pending = useRef(null)

  useEffect(() => {
    if (draft.title === wish.title && draft.notes === wish.notes) return
    pending.current = draft
    const timer = setTimeout(() => {
      onUpdate(draft)
      pending.current = null
    }, 500)
    return () => clearTimeout(timer)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pending.current && onUpdate(pending.current), []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = () => {
    if (!confirm(`Retirer « ${draft.title} » de ta liste de souhaits ?`)) return
    pending.current = null
    onDelete()
  }

  return (
    <aside
      className="tiroir fixed inset-x-0 bottom-0 z-[1000] flex max-h-[70dvh] flex-col rounded-t-[12px] border-t border-trait bg-surface shadow-2xl
                 md:top-3 md:right-3 md:bottom-auto md:left-auto md:w-[420px] md:rounded-[12px] md:border"
      aria-label={`Souhait ${draft.title}`}
    >
      <div className="relative flex h-12 shrink-0 items-center justify-center">
        <span className="h-1 w-10 rounded-full bg-trait md:hidden" />
        <button onClick={onClose} className="absolute top-1 right-3 rounded-[8px] p-2 text-encre-douce hover:bg-bois" aria-label="Fermer">
          <Icon name="close" />
        </button>
      </div>
      <div className="overflow-y-auto px-6 pb-8 [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
        <p className="etiquette text-bleu">À visiter un jour</p>
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          aria-label="Nom du lieu"
          className="mt-1 w-full bg-transparent font-mono text-2xl leading-[30px] font-bold outline-none"
        />
        <p className="mt-2 flex items-center gap-1 text-sm text-encre-douce">
          <Icon name="pin" size={16} className="shrink-0 text-bleu" />
          {wish.place.name}
        </p>
        <label className="mt-6 block">
          <span className="etiquette text-encre-muette">Idées</span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={4}
            placeholder="Pourquoi y aller, quoi voir, quand partir…"
            className="champ mt-1 resize-y"
          />
        </label>
        <button
          onClick={() => {
            if (pending.current) onUpdate(pending.current)
            pending.current = null
            onBecomeTrip()
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] bg-bleu px-4 py-3 font-medium text-sur-bleu hover:bg-bleu-fort"
        >
          <Icon name="pin" size={18} />
          J'y suis : en faire un voyage
        </button>
        <button onClick={remove} className="mt-6 flex items-center gap-1 text-sm text-encre-muette hover:text-encre">
          <Icon name="trash" size={16} />
          Retirer de la liste
        </button>
      </div>
    </aside>
  )
}
