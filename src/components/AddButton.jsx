import { useState } from 'react'
import Icon from './Icon.jsx'

// Bouton flottant « + » avec ses deux façons d'ajouter une destination.
export default function AddButton({ onPickOnMap, onSearch, onHere, className = '' }) {
  const [open, setOpen] = useState(false)
  const choose = (action) => () => {
    setOpen(false)
    action()
  }

  return (
    <div className={`fixed z-[900] flex flex-col items-end gap-2 ${className}`}>
      {open && (
        <div className="glisse flex flex-col gap-2">
          <button onClick={choose(onHere)} className="option-flottante">
            <Icon name="locate" size={18} className="text-bleu" />
            Nouveau voyage ici
          </button>
          <button onClick={choose(onPickOnMap)} className="option-flottante">
            <Icon name="crosshair" size={18} className="text-bleu" />
            Cliquer sur la carte
          </button>
          <button onClick={choose(onSearch)} className="option-flottante">
            <Icon name="search" size={18} className="text-bleu" />
            Rechercher une adresse
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-bleu text-sur-bleu shadow-lg hover:bg-bleu-fort"
        aria-label={open ? 'Fermer le menu' : 'Ajouter une destination'}
        aria-expanded={open}
      >
        <Icon name={open ? 'close' : 'plus'} size={26} />
      </button>
    </div>
  )
}
