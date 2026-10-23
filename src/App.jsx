import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCarnet } from './hooks/useCarnet.js'
import { useSync } from './sync/useSync.js'
import { placeInfo } from './lib/geocode.js'
import { currentPosition } from './lib/position.js'
import { backupDue, markBackup, saveFile } from './lib/backup.js'
import { tripStops } from './lib/geo.js'
import { newId } from './lib/id.js'
import MapView from './components/MapView.jsx'
import TripPanel from './components/TripPanel.jsx'
import Lightbox from './components/Lightbox.jsx'
import AddButton from './components/AddButton.jsx'
import SearchDialog from './components/SearchDialog.jsx'
import Catalog from './components/Catalog.jsx'
import Icon from './components/Icon.jsx'
import InstallBanner from './components/InstallBanner.jsx'
import Slideshow from './components/Slideshow.jsx'
import IdeaPanel from './components/IdeaPanel.jsx'
import SouvenirModal from './components/SouvenirModal.jsx'
import { todayIso } from './lib/format.js'
import { anniversarySeen, findAnniversary, markAnniversarySeen } from './lib/souvenir.js'

// mode : null | { type: 'voyage' } (placer un voyage) | { type: 'photo', photoId } | { type: 'etape', tripId }
const BANNER = {
  voyage: 'Touche la carte pour placer le voyage.',
  photo: 'Touche la carte là où la photo a été prise.',
  etape: "Touche la carte pour ajouter l'étape.",
}

export default function App() {
  const carnet = useCarnet()
  const sync = useSync(carnet.reload)
  const { photos, numbers } = carnet
  // Voyages faits d'un côté, idées de voyage de l'autre (même stockage, champ wish)
  const trips = useMemo(() => carnet.trips.filter((t) => !t.wish), [carnet.trips])
  const wishes = useMemo(() => carnet.trips.filter((t) => t.wish), [carnet.trips])

  const [selectedId, setSelectedId] = useState(null)
  const [photoId, setPhotoId] = useState(null)
  const [mode, setMode] = useState(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [searchFor, setSearchFor] = useState(null) // null | { type: 'voyage' } | { type: 'etape', tripId }
  const [focus, setFocus] = useState(null)
  const [toast, setToast] = useState('')
  const [myPosition, setMyPosition] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [slideshow, setSlideshow] = useState(false)
  const [souvenirFor, setSouvenirFor] = useState(null) // voyage (avec les champs en cours d'édition)
  const [souvenirHidden, setSouvenirHidden] = useState(anniversarySeen)

  const selected = carnet.trips.find((t) => t.id === selectedId)
  const route = useMemo(() => (selected?.stops?.length ? tripStops(selected) : null), [selected])
  const allTags = useMemo(() => [...new Set(trips.flatMap((t) => t.tags ?? []))].sort((a, b) => a.localeCompare(b, 'fr')), [trips])
  // Filtre par étiquette : la carte ne montre que les voyages concernés et leurs photos.
  const shownTrips = useMemo(() => (activeTag ? trips.filter((t) => t.tags?.includes(activeTag)) : trips), [trips, activeTag])
  // Photos de voyage (les images d'inspiration des idées restent à part : ni carte, ni stats, ni galerie)
  const tripsPhotos = useMemo(() => photos.filter((p) => !p.inspiration), [photos])
  const shownPhotos = useMemo(() => {
    const ids = new Set(shownTrips.map((t) => t.id))
    return tripsPhotos.filter((p) => ids.has(p.tripId))
  }, [tripsPhotos, shownTrips])
  const tripPhotos = useMemo(
    () =>
      photos
        .filter((p) => p.tripId === selectedId && Boolean(p.inspiration) === Boolean(selected?.wish))
        .sort((a, b) => (a.takenAt ?? a.createdAt) - (b.takenAt ?? b.createdAt)),
    [photos, selectedId, selected?.wish],
  )

  // Pays visités (codes ISO) : départs + étapes de tous les voyages
  const visited = useMemo(
    () => [...new Set(trips.flatMap((t) => tripStops(t).map((s) => s.country?.toUpperCase()).filter(Boolean)))],
    [trips],
  )

  // Voyages créés avant le suivi des pays : on retrouve le pays d'un lieu à la fois (1 req/s max pour Nominatim).
  useEffect(() => {
    if (!navigator.onLine) return
    const trip = trips.find((t) => tripStops(t).some((s) => s.country === undefined))
    if (!trip) return
    const timer = setTimeout(async () => {
      const missing = tripStops(trip).find((s) => s.country === undefined)
      const { country } = await placeInfo(missing.lat, missing.lng)
      if (country === undefined) return // recherche en échec (hors-ligne) : on n'insiste pas pendant cette visite
      if (missing === trip.place) carnet.updateTrip(trip.id, { place: { ...trip.place, country } })
      else carnet.updateTrip(trip.id, { stops: trip.stops.map((s) => (s === missing ? { ...s, country } : s)) })
    }, 1200)
    return () => clearTimeout(timer)
  }, [trips]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  // Centre sur le voyage ; avec des étapes, cadre tout le trajet.
  const focusTrip = useCallback((trip, zoom) => {
    const stops = tripStops(trip)
    setFocus(stops.length > 1 ? { bounds: stops.map((s) => [s.lat, s.lng]) } : { lat: trip.place.lat, lng: trip.place.lng, zoom })
  }, [])

  const openTrip = useCallback(
    (trip, zoom) => {
      setSelectedId(trip.id)
      setMode(null)
      setCatalogOpen(false)
      focusTrip(trip, zoom)
    },
    [focusTrip],
  )

  const addStop = async (tripId, { name, lat, lng, country }) => {
    const trip = trips.find((t) => t.id === tripId)
    if (!trip) return
    const stops = [...(trip.stops ?? []), { id: newId(), name, lat, lng, country }]
    await carnet.updateTrip(tripId, { stops })
    focusTrip({ ...trip, stops })
    setToast(`Étape ajoutée : ${name}`)
  }

  const handleAddStop = async (how) => {
    if (how === 'recherche') return setSearchFor({ type: 'etape', tripId: selectedId })
    if (how === 'carte') return setMode({ type: 'etape', tripId: selectedId })
    setToast('Recherche de ta position…')
    try {
      const pos = await currentPosition()
      setMyPosition(pos)
      await addStop(selectedId, { ...(await placeInfo(pos.lat, pos.lng)), lat: pos.lat, lng: pos.lng })
    } catch (e) {
      setToast(e.message)
    }
  }

  // info : { name, country } déjà connus (recherche) ; sinon on les demande pour ce point.
  const addTripAt = async (lat, lng, info, wish = false) => {
    const trip = await carnet.createTrip({ ...(info ?? (await placeInfo(lat, lng))), lat, lng, wish })
    openTrip(trip)
  }

  const addTripHere = async () => {
    setToast('Recherche de ta position…')
    try {
      const pos = await currentPosition()
      setMyPosition(pos)
      const trip = await carnet.createTrip({ ...(await placeInfo(pos.lat, pos.lng)), lat: pos.lat, lng: pos.lng, precise: true })
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
    } else if (mode?.type === 'etape') {
      setMode(null)
      await addStop(mode.tripId, { ...(await placeInfo(lat, lng)), lat, lng })
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
  const souvenir = useMemo(() => (souvenirHidden ? null : findAnniversary(trips)), [trips, souvenirHidden])
  const closeSouvenir = () => {
    markAnniversarySeen()
    setSouvenirHidden(true)
  }

  return (
    <div className={`relative h-full overflow-hidden ${mode ? 'mode-placement' : ''}`}>
      <MapView
        trips={shownTrips}
        wishes={wishes}
        photos={shownPhotos}
        selectedId={selectedId}
        myPosition={myPosition}
        route={route}
        visited={visited}
        focus={focus}
        onMapClick={handleMapClick}
        onSelectTrip={(id) => openTrip(carnet.trips.find((t) => t.id === id))}
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

      {activeTag && (
        <button
          onClick={() => setActiveTag(null)}
          className="puce puce-active fixed top-3 left-16 z-[900] py-2 shadow-md [top:max(0.75rem,env(safe-area-inset-top))] sm:left-52"
          aria-label={`Retirer le filtre ${activeTag}`}
        >
          {activeTag}
          <Icon name="close" size={14} />
        </button>
      )}

      {!mode && !panelVisible && <InstallBanner hasTrips={trips.length > 0} />}

      {/* Bandeau du mode placement */}
      {mode && (
        <div className="glisse fixed top-16 left-1/2 z-[950] flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-center justify-between gap-3 rounded-[8px] border border-trait bg-surface px-4 py-3 shadow-lg">
          <span className="text-sm">
            {BANNER[mode.type]}
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

      {souvenir && !panelVisible && !mode && (
        <div className="glisse fixed bottom-28 left-1/2 z-[800] flex w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 items-center gap-3 rounded-[12px] border border-trait bg-surface p-3 shadow-lg">
          {(() => {
            const cover = photos.find((p) => p.id === souvenir.trip.coverId) ?? photos.find((p) => p.tripId === souvenir.trip.id)
            return cover ? (
              <img src={cover.thumbUrl} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] bg-photo-vide text-encre-muette">
                <Icon name="pin" />
              </span>
            )
          })()}
          <div className="min-w-0 flex-1">
            <p className="etiquette text-bleu">
              Il y a {souvenir.years}&nbsp;an{souvenir.years > 1 ? 's' : ''}
            </p>
            <p className="truncate font-medium">{souvenir.trip.title}</p>
            <button
              onClick={() => {
                closeSouvenir()
                openTrip(souvenir.trip)
              }}
              className="text-sm font-medium text-bleu"
            >
              Revoir ce voyage
            </button>
          </div>
          <button onClick={closeSouvenir} className="self-start rounded-[8px] p-1 text-encre-muette hover:text-encre" aria-label="Fermer le souvenir">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {!mode && (
        <AddButton
          className={`right-4 bottom-6 [bottom:max(1.5rem,env(safe-area-inset-bottom))] ${panelVisible ? 'hidden md:flex md:right-[448px]' : ''}`}
          onPickOnMap={() => {
            setSelectedId(null)
            setMode({ type: 'voyage' })
          }}
          onSearch={() => setSearchFor({ type: 'voyage' })}
          onWish={() => setSearchFor({ type: 'souhait' })}
          onHere={addTripHere}
        />
      )}

      {panelVisible && selected.wish && (
        <IdeaPanel
          key={selected.id}
          idea={selected}
          photos={tripPhotos}
          onAddPhotos={async (files) => {
            const errors = await carnet.addPhotos(selected.id, files, { inspiration: true })
            if (errors.length) setToast(errors.join(' · '))
          }}
          onOpenPhoto={setPhotoId}
          onUpdate={(fields) => carnet.updateTrip(selected.id, fields)}
          onBecomeTrip={async () => {
            await carnet.updateTrip(selected.id, { wish: false, startDate: todayIso(), createdAt: Date.now() })
            setToast('Bon voyage ! Il est maintenant dans tes voyages.')
          }}
          onDelete={async () => {
            await carnet.removeTrip(selected.id)
            setSelectedId(null)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {panelVisible && !selected.wish && (
        <TripPanel
          key={selected.id}
          trip={selected}
          number={numbers[selected.id]}
          photos={tripPhotos}
          knownTags={allTags}
          user={sync.user}
          onShare={(access) => carnet.updateTrip(selected.id, { access })}
          onUpdate={(fields) => carnet.updateTrip(selected.id, fields)}
          onStopsChange={(stops) => carnet.updateTrip(selected.id, { stops })}
          onAddStop={handleAddStop}
          onSlideshow={() => setSlideshow(true)}
          onSouvenir={(draft) => setSouvenirFor({ ...selected, ...draft })}
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
          inspiration={Boolean(selected?.wish)}
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

      {souvenirFor && (
        <SouvenirModal
          trip={souvenirFor}
          number={numbers[souvenirFor.id]}
          photos={tripPhotos}
          onClose={() => setSouvenirFor(null)}
          onDone={() => {
            setSouvenirFor(null)
            setToast('Image souvenir prête.')
          }}
        />
      )}

      {slideshow && selected && tripPhotos.length > 0 && (
        <Slideshow trip={selected} photos={tripPhotos} onClose={() => setSlideshow(false)} />
      )}

      {searchFor && (
        <SearchDialog
          title={{ etape: 'Ajouter une étape', souhait: 'Idée de voyage', voyage: 'Nouveau voyage' }[searchFor.type]}
          onClose={() => setSearchFor(null)}
          onPick={async (r) => {
            setSearchFor(null)
            if (searchFor.type === 'etape') await addStop(searchFor.tripId, r)
            else await addTripAt(r.lat, r.lng, { name: r.name, country: r.country }, searchFor.type === 'souhait')
          }}
        />
      )}

      {catalogOpen && (
        <Catalog
          trips={trips}
          photos={tripsPhotos}
          numbers={numbers}
          needsBackup={needsBackup}
          sync={sync}
          tags={allTags}
          wishes={wishes}
          visited={visited}
          activeTag={activeTag}
          onTag={setActiveTag}
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
