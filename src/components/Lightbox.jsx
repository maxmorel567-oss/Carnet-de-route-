import { useEffect } from 'react'
import Icon from './Icon.jsx'

const fmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

const POSITION = {
  exif: 'Position lue dans la photo',
  manuel: 'Position placée à la main',
  position: 'Position du voyage (GPS du téléphone)',
}

// Visionneuse plein écran, navigation flèches / clavier.
export default function Lightbox({ photos, photoId, onChange, onClose, onPlace, onDelete }) {
  const index = photos.findIndex((p) => p.id === photoId)
  const photo = photos[index]
  const go = (step) => onChange(photos[(index + step + photos.length) % photos.length].id)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!photo) return null

  const remove = () => {
    if (confirm('Supprimer cette photo ?')) onDelete(photo.id)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-[#121418]/95 text-[#F3EEE6]" role="dialog" aria-label="Photo">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="etiquette">
          {index + 1} / {photos.length}
        </span>
        <button onClick={onClose} className="rounded-[8px] p-2 hover:bg-white/10" aria-label="Fermer">
          <Icon name="close" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img key={photo.id} src={photo.url} alt="" className="glisse max-h-full max-w-full rounded-[8px] object-contain" />
        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 rounded-full bg-black/40 p-2" aria-label="Précédente">
              <Icon name="left" />
            </button>
            <button onClick={() => go(1)} className="absolute right-2 rounded-full bg-black/40 p-2" aria-label="Suivante">
              <Icon name="right" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
        <div className="text-sm">
          {photo.takenAt && <div>{fmt.format(photo.takenAt)}</div>}
          <div className="text-[#C9C1B4]">{POSITION[photo.gpsSource] ?? 'Pas encore placée sur la carte'}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPlace(photo.id)}
            className="flex items-center gap-1 rounded-[8px] bg-[#6B9BE6] px-4 py-2 text-sm font-medium text-[#121418]"
          >
            <Icon name="crosshair" size={16} />
            {photo.lat == null ? 'Placer sur la carte' : 'Déplacer'}
          </button>
          <button onClick={remove} className="rounded-[8px] p-2 hover:bg-white/10" aria-label="Supprimer la photo">
            <Icon name="trash" />
          </button>
        </div>
      </div>
    </div>
  )
}
