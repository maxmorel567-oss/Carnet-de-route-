import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCarnet } from './hooks/useCarnet.js'
import { placeName } from './lib/geocode.js'
import { currentPosition } from './lib/position.js'
import { backupDue, markBackup, saveFile } from './lib/backup.js'
import MapView from './components/MapView.jsx'
import TripPanel from './components/TripPanel.jsx'
import Lightbox from './components/Lightbox.jsx'
import AddButton from './components/AddButton.jsx'
import SearchDialog from './components/SearchDialog.jsx'
import Catalog from './components/Catalog.jsx'
import Icon from './components/Icon.jsx'
import InstallBanner from './components/InstallBanner.jsx'

// mode : null | { type: 'voyage' } (placer un voyage) | { type: 'photo', photoId }
export default function App() {
  const carnet = useCarnet()
  const { trips, photos, numbers } = carnet

  const [selectedId, setSelectedId] = useState(null)
  const [photoId, setPhotoId] = useState(null)
  const [mode, setMode] = useState(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [focus, setFocus] = useState(null)
  const [toast, setToast] = useState('')
  const [myPosition, setMyPosition] = useState(null)

  const selected = trips.find((t) => t.id === selectedId)
  const tripPhotos = useMemo(
    () => photos.filter((p) => p.tripId === selectedId).sort((a, b) => (a.takenAt ?? a.createdAt) - (b.takenAt ?? b.createdAt)),
    [photos, selectedId],
  )

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const openTrip = useCallback((trip, zoom) => {
    setSelectedId(trip.id)
    setMode(null)
    setCatalogOpen(false)
    setFocus({ lat: trip.place.lat, lng: trip.place.lng, zoom })
  }, [])

  const addTripAt = async (lat, lng, name) => {
    const trip = await carnet.createTrip({ name: name ?? (await placeName(lat, lng)), lat, lng })
    openTrip(trip)
  }

  const addTripHere = async () => {
    setToast('Recherche de ta position…')
    try {
      const pos = await currentPosition()
      setMyPosition(pos)
      const trip = await carnet.createTrip({ name: await placeName(pos.lat, pos.lng), lat: pos.lat, lng: pos.lng, precise: true })
      openTrip(trip, 15)
      setToast('Voyage créé à ta position. Les photos sans GPS y seront placées.')
    } catch (e) {
      setToast(e.message)
    }
  }

  const handleMapClick = async ({ lat, lng }) => {
    if (mode?.type === 'voyage') {
      setMode(null)
      await addTripAt(lat, lng)
    } else if (mode?.type === 'photo') {
      setMode(null)
      await carnet.placePhoto(mode.photoId, lat, lng)
      setToast('Photo placée sur la carte.')
    } else {
      setSelectedId(null)
    }
  }

  const [backupVersion, setBackupVersion] = useState(0)
  const needsBackup = useMemo(() => backupDue(trips), [trips, backupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    const data = await carnet.exportBackup()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    if (await saveFile(blob, `carnet-de-route-${new Date().toISOString().slice(0, 10)}.json`)) {
      markBackup()
      setBackupVersion((v) => v + 1)
      setToast('Sauvegarde créée. Garde ce fichier en lieu sûr (Drive, Fichiers…).')
    }
  }

  const handleImport = async (file) => {
    try {
      const { trips: t, photos: p } = await carnet.importBackup(JSON.parse(await file.text()))
      setToast(`Import terminé : ${t} voyage(s), ${p} photo(s).`)
    } catch (e) {
      setToast(e instanceof SyntaxError ? 'Fichier illisible.' : e.message)
    }
  }

  const handleAddPhotos = async (files) => {
    const errors = await carnet.addPhotos(selectedId, files)
    if (errors.length) setToast(errors.join(' · '))
  }

  const panelVisible = selected && !mode

  return (
    <div className={`relative h-full overflow-hidden ${mode ? 'mode-placement' : ''}`}>
      <MapView
        trips={trips}
        photos={photos}
        selectedId={selectedId}
        myPosition={myPosition}
        focus={focus}
        onMapClick={handleMapClick}
        onSelectTrip={(id) => openTrip(trips.find((t) => t.id === id))}
        onSelectPhoto={(p) => {
          setSelectedId(p.tripId)
          setPhotoId(p.id)
        }}
      />

      {/* Menu discret */}
      <button
        onClick={() => setCatalogOpen(true)}
        className="fixed top-3 left-3 z-[900] flex items-center gap-2 rounded-[8px] border border-trait bg-surface px-3 py-2 shadow-md hover:bg-bois [top:max(0.75rem,env(safe-area-inset-top))]"
        aria-label="Mes voyages"
      >
        <Icon name="menu" />
        <span className="etiquette hidden sm:inline">Carnet de route</span>
        {needsBackup && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-surface bg-bleu" aria-label="Sauvegarde conseillée" />}
      </button>

      {!mode && !panelVisible && <InstallBanner hasTrips={trips.length > 0} />}

      {/* Bandeau du mode placement */}
      {mode && (
        <div className="glisse fixed top-16 left-1/2 z-[950] flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-center justify-between gap-3 rounded-[8px] border border-trait bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm">
            {mode.type === 'voyage' ? 'Touche la carte pour placer le voyage.' : 'Touche la carte là où la photo a été prise.'}
          </span>
          <button onClick={() => setMode(null)} className="etiquette shrink-0 text-bleu">
            Annuler
          </button>
        </div>
      )}

      {!carnet.loading && trips.length === 0 && !mode && (
        <div className="glisse fixed bottom-28 left-1/2 z-[800] w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 rounded-[12px] border border-trait bg-surface p-4 text-center shadow-lg">
          <p className="font-mono font-bold">Première escale ?</p>
          <p className="mt-1 text-sm text-encre-douce">Appuie sur + pour épingler ta première destination.</p>
        </div>
      )}

      {!mode && (
        <AddButton
          className={`right-4 bottom-6 [bottom:max(1.5rem,env(safe-area-inset-bottom))] ${panelVisible ? 'hidden md:flex md:right-[448px]' : ''}`}
          onPickOnMap={() => {
            setSelectedId(null)
            setMode({ type: 'voyage' })
          }}
          onSearch={() => setSearchOpen(true)}
          onHere={addTripHere}
        />
      )}

      {panelVisible && (
        <TripPanel
          key={selected.id}
          trip={selected}
          number={numbers[selected.id]}
          photos={tripPhotos}
          onUpdate={(fields) => carnet.updateTrip(selected.id, fields)}
          onDelete={async () => {
            await carnet.removeTrip(selected.id)
            setSelectedId(null)
          }}
          onClose={() => setSelectedId(null)}
          onAddPhotos={handleAddPhotos}
          onOpenPhoto={setPhotoId}
        />
      )}

      {photoId && tripPhotos.some((p) => p.id === photoId) && (
        <Lightbox
          photos={tripPhotos}
          photoId={photoId}
          coverId={(tripPhotos.find((p) => p.id === selected?.coverId) ?? tripPhotos[0])?.id}
          onChange={setPhotoId}
          onCaption={(id, caption) => carnet.updatePhoto(id, { caption })}
          onSetCover={(id) => {
            carnet.updateTrip(selected.id, { coverId: id })
            setToast('Photo de couverture choisie.')
          }}
          onClose={() => setPhotoId(null)}
          onPlace={(id) => {
            setPhotoId(null)
            setMode({ type: 'photo', photoId: id })
          }}
          onDelete={async (id) => {
            setPhotoId(null)
            await carnet.removePhoto(id)
          }}
        />
      )}

      {searchOpen && (
        <SearchDialog
          onClose={() => setSearchOpen(false)}
          onPick={async (r) => {
            setSearchOpen(false)
            await addTripAt(r.lat, r.lng, r.name)
          }}
        />
      )}

      {catalogOpen && (
        <Catalog
          trips={trips}
          photos={photos}
          numbers={numbers}
          needsBackup={needsBackup}
          onSelect={openTrip}
          onClose={() => setCatalogOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}

      {toast && (
        <div className="glisse fixed bottom-24 left-1/2 z-[2500] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[8px] bg-encre px-4 py-3 text-sm text-fond shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
