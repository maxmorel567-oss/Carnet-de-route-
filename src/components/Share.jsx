import { useState } from 'react'
import Icon from './Icon.jsx'

// Partage d'un voyage avec d'autres comptes Google (synchro active uniquement)
export default function Share({ trip, user, onChange }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const isOwner = !trip.owner || trip.owner === user.uid
  const others = (trip.access ?? []).filter((e) => e !== (trip.ownerEmail ?? user.email))

  if (!isOwner) {
    return (
      <div className="mt-6">
        <span className="etiquette text-encre-muette">Partage</span>
        <p className="mt-1 text-sm text-encre-douce">
          Voyage partagé par <span className="font-medium text-encre">{trip.ownerEmail}</span>. Tu peux ajouter des photos et écrire dans le journal.
        </p>
      </div>
    )
  }

  const add = (e) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError('Adresse email invalide.')
    if (value === user.email) return setError("C'est ton adresse.")
    setError('')
    setEmail('')
    onChange([...new Set([trip.ownerEmail ?? user.email, ...(trip.access ?? []), value])])
  }

  return (
    <div className="mt-6">
      <span className="etiquette text-encre-muette">Partage</span>
      {others.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {others.map((e) => (
            <li key={e} className="flex items-center gap-2 text-sm">
              <Icon name="heart" size={14} className="shrink-0 text-bleu" />
              <span className="min-w-0 flex-1 truncate">{e}</span>
              <button onClick={() => onChange((trip.access ?? []).filter((x) => x !== e))} className="p-1 text-encre-muette" aria-label={`Ne plus partager avec ${e}`}>
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-encre-douce">Ajoute l'adresse Gmail d'un proche : il verra ce voyage et pourra y ajouter ses photos.</p>
      )}
      <form onSubmit={add} noValidate className="mt-2 flex gap-2">
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@gmail.com"
          className="champ"
          aria-label="Partager avec (adresse email)"
        />
        <button type="submit" className="shrink-0 rounded-[8px] bg-bleu px-4 text-sm font-medium text-sur-bleu">
          Partager
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-rouge">{error}</p>}
    </div>
  )
}
