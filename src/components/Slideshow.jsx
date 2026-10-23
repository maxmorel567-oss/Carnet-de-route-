import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { formatDates } from '../lib/format.js'

const DURATION = 4000

// Diaporama plein écran : fondu enchaîné, légende, pause au toucher.
export default function Slideshow({ trip, photos, onClose }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const go = (step) => setIndex((i) => (i + step + photos.length) % photos.length)

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => go(1), DURATION)
    return () => clearTimeout(timer)
  }, [playing, index]) // eslint-disable-line react-hooks/exhaustive-deps

  // Écran allumé pendant le diaporama (si le navigateur le permet)
  useEffect(() => {
    let lock
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => lock?.release().catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === ' ') setPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const photo = photos[index]

  return (
    <div className="fixed inset-0 z-[2100] bg-[#121418] text-[#F3EEE6]" role="dialog" aria-label="Diaporama">
      <button className="absolute inset-0 h-full w-full cursor-pointer" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Lecture'}>
        {photos.map((p, i) => (
          <img
            key={p.id}
            src={p.url}
            alt=""
            className={`diapo absolute inset-0 h-full w-full object-contain ${i === index ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-4 py-3 [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <span className="etiquette">
          {index + 1} / {photos.length}
          {!playing && ' · en pause'}
        </span>
        <button onClick={onClose} className="pointer-events-auto rounded-[8px] p-2 hover:bg-white/10" aria-label="Fermer le diaporama">
          <Icon name="close" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-6 pt-16 pb-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
        {photo.caption && <p className="glisse text-lg" key={photo.id}>{photo.caption}</p>}
        <p className="mt-1 font-mono text-sm font-bold">{trip.title}</p>
        <p className="text-sm text-[#C9C1B4]">{formatDates(trip.startDate, trip.endDate)}</p>
        <div className="pointer-events-auto mt-3 flex gap-2">
          <button onClick={() => go(-1)} className="rounded-full bg-white/10 p-2" aria-label="Photo précédente">
            <Icon name="left" />
          </button>
          <button onClick={() => setPlaying((p) => !p)} className="rounded-full bg-white/10 p-2" aria-label={playing ? 'Mettre en pause' : 'Reprendre'}>
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button onClick={() => go(1)} className="rounded-full bg-white/10 p-2" aria-label="Photo suivante">
            <Icon name="right" />
          </button>
        </div>
      </div>
    </div>
  )
}
