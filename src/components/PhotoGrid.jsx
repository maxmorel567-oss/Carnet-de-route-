export default function PhotoGrid({ photos, onOpen }) {
  if (!photos.length) {
    return (
      <div className="mt-3 rounded-[8px] bg-photo-vide px-4 py-8 text-center text-sm text-encre-douce">
        Aucune photo. La position GPS des photos est lue automatiquement.
      </div>
    )
  }
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpen(p.id)}
          className="glisse relative aspect-square overflow-hidden rounded-[8px] bg-photo-vide"
        >
          <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          {p.lat == null && (
            <span className="etiquette absolute bottom-1 left-1 rounded-[4px] bg-surface/90 px-1 text-[10px] text-encre">
              Sans GPS
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
