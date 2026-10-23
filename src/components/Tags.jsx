import { useState } from 'react'
import Icon from './Icon.jsx'

const PRESETS = ['City trip', 'Nature', 'Plage', 'Montagne', 'Road trip', 'Week-end', 'Famille', 'Amis']

export function Chip({ label, active = false, onClick, onRemove }) {
  return (
    <span className={`puce ${active ? 'puce-active' : ''}`}>
      <button type="button" onClick={onClick} disabled={!onClick} className="disabled:cursor-default">
        {label}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Retirer ${label}`} className="-mr-1 opacity-70 hover:opacity-100">
          <Icon name="close" size={14} />
        </button>
      )}
    </span>
  )
}

// Étiquettes d'un voyage : suggestions (déjà utilisées puis courantes) ou texte libre.
export function TagEditor({ tags = [], known = [], onChange }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const options = [...new Set([...known, ...PRESETS])].filter((t) => !tags.includes(t)).slice(0, 8)

  const add = (value) => {
    const tag = value.trim()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setText('')
  }

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {tags.map((t) => (
        <Chip key={t} label={t} active onRemove={() => onChange(tags.filter((x) => x !== t))} />
      ))}
      {!adding && (
        <button type="button" onClick={() => setAdding(true)} className="puce text-bleu">
          <Icon name="plus" size={14} />
          Ajouter
        </button>
      )}
      {adding && (
        <div className="w-full rounded-[8px] border border-trait bg-fond p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add(text)
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nouvelle étiquette"
              className="champ bg-surface"
              aria-label="Nouvelle étiquette"
            />
            <button type="button" onClick={() => setAdding(false)} className="etiquette shrink-0 text-encre-muette">
              Fini
            </button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((t) => (
              <Chip key={t} label={t} onClick={() => add(t)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
