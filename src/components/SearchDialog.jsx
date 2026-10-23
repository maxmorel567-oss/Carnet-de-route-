import { useState } from 'react'
import Icon from './Icon.jsx'
import { searchPlaces } from '../lib/geocode.js'

export default function SearchDialog({ onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    try {
      setResults(await searchPlaces(query.trim()))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onClick={onClose}>
      <div
        className="glisse w-full max-w-[520px] rounded-[12px] border border-trait bg-surface p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Rechercher une adresse"
      >
        <form onSubmit={submit} className="flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ville, adresse, monument…"
            className="champ"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
          <button
            type="submit"
            className="shrink-0 rounded-[8px] bg-bleu px-4 text-sur-bleu hover:bg-bleu-fort"
            aria-label="Rechercher"
          >
            <Icon name="search" />
          </button>
        </form>

        {loading && <p className="mt-3 text-sm text-encre-douce">Recherche…</p>}
        {error && <p className="mt-3 text-sm text-encre">{error}</p>}
        {results && !loading && (
          <ul className="mt-3 max-h-[50vh] overflow-y-auto">
            {results.length === 0 && <li className="py-2 text-sm text-encre-douce">Aucun résultat.</li>}
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => onPick(r)}
                  className="flex w-full items-start gap-2 rounded-[8px] px-2 py-2 text-left hover:bg-bois"
                >
                  <Icon name="pin" size={18} className="mt-1 shrink-0 text-bleu" />
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-sm text-encre-douce">{r.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
