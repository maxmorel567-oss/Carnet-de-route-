import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Segmented from './Segmented.jsx'
import { newId } from '../lib/id.js'

export const PRIORITIES = [
  ['cette-annee', 'Cette année'],
  ['bientot', 'Bientôt'],
  ['un-jour', 'Un jour'],
]
export const DURATIONS = [
  ['week-end', 'Week-end'],
  ['1-semaine', '1 semaine'],
  ['2-semaines', '2 semaines'],
  ['plus', 'Plus long'],
]
const COMPANY = [
  ['seul', 'Seul'],
  ['couple', 'En couple'],
  ['amis', 'Entre amis'],
  ['famille', 'En famille'],
]
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const FIELDS = ['title', 'notes', 'priority', 'duration', 'company', 'months', 'budget', 'todo', 'links']
const pick = (idea) => Object.fromEntries(FIELDS.map((f) => [f, idea[f]]))

const hostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Fiche d'une idée de voyage : on prépare (à voir, période, budget…) avant d'y aller.
 * « J'y suis » la transforme en voyage. Monté avec key={idea.id}.
 */
export default function IdeaPanel({ idea, photos, onUpdate, onAddPhotos, onOpenPhoto, onBecomeTrip, onDelete, onClose }) {
  const [draft, setDraft] = useState(() => pick(idea))
  const [todoText, setTodoText] = useState('')
  const [linkText, setLinkText] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(null)
  const dirty = useRef(false)
  const fileInput = useRef(null)

  useEffect(() => {
    if (!dirty.current) return
    pending.current = draft
    const timer = setTimeout(() => {
      onUpdate(draft)
      pending.current = null
    }, 500)
    return () => clearTimeout(timer)
  }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pending.current && onUpdate(pending.current), []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (value) => {
    dirty.current = true
    setDraft((d) => ({ ...d, [field]: value }))
  }
  const todo = draft.todo ?? []
  const links = draft.links ?? []
  const months = draft.months ?? []

  const addTodo = (e) => {
    e.preventDefault()
    if (!todoText.trim()) return
    set('todo')([...todo, { id: newId(), text: todoText.trim(), done: false }])
    setTodoText('')
  }
  const addLink = (e) => {
    e.preventDefault()
    const raw = linkText.trim()
    if (!raw) return
    set('links')([...links, { id: newId(), url: /^https?:\/\//i.test(raw) ? raw : `https://${raw}` }])
    setLinkText('')
  }
  const handleFiles = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    await onAddPhotos(files)
    setBusy(false)
  }
  const remove = () => {
    if (!confirm(`Supprimer l'idée « ${draft.title} » ?`)) return
    pending.current = null
    dirty.current = false
    onDelete()
  }

  return (
    <aside
      className="tiroir fixed inset-x-0 bottom-0 z-[1000] flex max-h-[78dvh] flex-col rounded-t-[12px] border-t border-trait bg-surface shadow-2xl
                 md:inset-y-3 md:right-3 md:left-auto md:max-h-none md:w-[420px] md:rounded-[12px] md:border"
      aria-label={`Idée ${draft.title}`}
    >
      <div className="relative flex h-12 shrink-0 items-center justify-center">
        <span className="h-1 w-10 rounded-full bg-trait md:hidden" />
        <button onClick={onClose} className="absolute top-1 right-3 rounded-[8px] p-2 text-encre-douce hover:bg-bois" aria-label="Fermer">
          <Icon name="close" />
        </button>
      </div>

      <div className="overflow-y-auto px-6 pb-8 [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
        <p className="etiquette flex items-center gap-1 text-bleu">
          <Icon name="flag" size={14} /> Idée de voyage
        </p>
        <input
          value={draft.title}
          onChange={(e) => set('title')(e.target.value)}
          aria-label="Nom de l'idée"
          className="mt-1 w-full bg-transparent font-mono text-2xl leading-[30px] font-bold outline-none"
        />
        <p className="mt-2 flex items-center gap-1 text-sm text-encre-douce">
          <Icon name="pin" size={16} className="shrink-0 text-bleu" />
          {idea.place.name}
        </p>

        <div className="mt-6">
          <span className="etiquette text-encre-muette">Priorité</span>
          <Segmented label="Priorité" options={PRIORITIES} value={draft.priority} onChange={set('priority')} />
        </div>

        <div className="mt-5">
          <span className="etiquette text-encre-muette">Durée envisagée</span>
          <Segmented label="Durée envisagée" options={DURATIONS} value={draft.duration} onChange={set('duration')} />
        </div>

        <div className="mt-5">
          <span className="etiquette text-encre-muette">Meilleure période</span>
          <div className="mt-1 grid grid-cols-12 gap-1" role="group" aria-label="Meilleure période">
            {MONTHS.map((m, i) => {
              const on = months.includes(i + 1)
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={on}
                  aria-label={m}
                  title={m}
                  onClick={() => set('months')(on ? months.filter((x) => x !== i + 1) : [...months, i + 1].sort((a, b) => a - b))}
                  className={`rounded-[4px] border py-1 font-mono text-xs ${on ? 'border-bleu bg-bleu text-sur-bleu' : 'border-trait text-encre-douce'}`}
                >
                  {m[0].toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="etiquette text-encre-muette">Budget estimé</span>
            <span className="relative mt-1 block">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="50"
                value={draft.budget ?? ''}
                onChange={(e) => set('budget')(e.target.value === '' ? null : Number(e.target.value))}
                className="champ pr-8"
                aria-label="Budget estimé en euros"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-encre-muette">€</span>
            </span>
          </label>
        </div>

        <div className="mt-5">
          <span className="etiquette text-encre-muette">Avec qui</span>
          <Segmented label="Avec qui" options={COMPANY} value={draft.company} onChange={set('company')} />
        </div>

        <div className="mt-6">
          <span className="etiquette text-encre-muette">À voir / à faire</span>
          <ul className="mt-2 flex flex-col gap-1" aria-label="À voir et à faire">
            {todo.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => set('todo')(todo.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))}
                  className="h-5 w-5 shrink-0 accent-[var(--bleu)]"
                  aria-label={item.text}
                />
                <span className={`min-w-0 flex-1 ${item.done ? 'text-encre-muette line-through' : ''}`}>{item.text}</span>
                <button onClick={() => set('todo')(todo.filter((x) => x.id !== item.id))} className="p-1 text-encre-muette" aria-label={`Retirer ${item.text}`}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addTodo} className="mt-2 flex gap-2">
            <input value={todoText} onChange={(e) => setTodoText(e.target.value)} placeholder="Un lieu, une activité, un resto…" className="champ" aria-label="Ajouter à voir" />
            <button type="submit" className="shrink-0 rounded-[8px] border border-trait px-3 text-bleu" aria-label="Ajouter à la liste">
              <Icon name="plus" size={18} />
            </button>
          </form>
        </div>

        <div className="mt-6">
          <span className="etiquette text-encre-muette">Liens d'inspiration</span>
          <ul className="mt-2 flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-bleu underline">
                  {hostname(l.url)}
                </a>
                <button onClick={() => set('links')(links.filter((x) => x.id !== l.id))} className="p-1 text-encre-muette" aria-label={`Retirer le lien ${hostname(l.url)}`}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          {/* noValidate : on accepte « youtube.com/… » sans https://, complété par addLink */}
          <form onSubmit={addLink} noValidate className="mt-2 flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Coller un lien (vidéo, article, Insta…)"
              className="champ"
              aria-label="Ajouter un lien"
            />
            <button type="submit" className="shrink-0 rounded-[8px] border border-trait px-3 text-bleu" aria-label="Ajouter le lien">
              <Icon name="plus" size={18} />
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="etiquette text-encre-muette">Photos d'inspiration</span>
          <button
            onClick={() => fileInput.current.click()}
            disabled={busy}
            className="flex items-center gap-1 rounded-[8px] border border-trait px-3 py-1.5 text-sm text-bleu disabled:opacity-60"
          >
            <Icon name="plus" size={16} />
            {busy ? 'Traitement…' : 'Ajouter'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
        </div>
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button key={p.id} onClick={() => onOpenPhoto(p.id)} className="aspect-square overflow-hidden rounded-[8px] bg-photo-vide">
                <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <label className="mt-6 block">
          <span className="etiquette text-encre-muette">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes')(e.target.value)}
            rows={3}
            placeholder="Pourquoi y aller, idées en vrac…"
            className="champ mt-1 resize-y"
          />
        </label>

        <button
          onClick={() => {
            if (pending.current) onUpdate(pending.current)
            pending.current = null
            dirty.current = false
            onBecomeTrip()
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] bg-bleu px-4 py-3 font-medium text-sur-bleu hover:bg-bleu-fort"
        >
          <Icon name="pin" size={18} />
          J'y suis : en faire un voyage
        </button>
        <button onClick={remove} className="mt-6 flex items-center gap-1 text-sm text-encre-muette hover:text-encre">
          <Icon name="trash" size={16} />
          Supprimer l'idée
        </button>
      </div>
    </aside>
  )
}
