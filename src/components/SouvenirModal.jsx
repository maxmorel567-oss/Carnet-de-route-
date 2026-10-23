import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { buildSouvenir } from '../lib/souvenirImage.js'
import { saveFile } from '../lib/backup.js'

// Aperçu de l'image souvenir, puis partage (le partage doit partir d'un toucher : l'image est prête avant)
export default function SouvenirModal({ trip, number, photos, onClose, onDone }) {
  const [image, setImage] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let url
    buildSouvenir({ trip, number, photos })
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setImage({ blob, url })
      })
      .catch(() => setError("L'image n'a pas pu être créée."))
    return () => url && URL.revokeObjectURL(url)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    const name = `souvenir-${(trip.title || 'voyage').toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, '-')}.png`
    if (await saveFile(image.blob, name, 'Souvenir de voyage')) onDone()
  }

  return (
    <div className="fixed inset-0 z-[2100] flex flex-col items-center justify-center gap-4 bg-[#121418]/90 p-4" role="dialog" aria-label="Image souvenir">
      <button onClick={onClose} className="absolute top-3 right-3 rounded-[8px] p-2 text-[#F3EEE6] hover:bg-white/10" aria-label="Fermer">
        <Icon name="close" />
      </button>
      {error && <p className="text-[#F3EEE6]">{error}</p>}
      {!image && !error && <p className="etiquette text-[#F3EEE6]">Création de l'image…</p>}
      {image && (
        <>
          <img src={image.url} alt={`Image souvenir : ${trip.title}`} className="glisse max-h-[75dvh] max-w-full rounded-[8px] shadow-2xl" />
          <button onClick={share} className="flex items-center gap-2 rounded-[8px] bg-[#6B9BE6] px-5 py-3 font-medium text-[#121418]">
            <Icon name="upload" size={18} />
            Partager ou enregistrer
          </button>
        </>
      )}
    </div>
  )
}
