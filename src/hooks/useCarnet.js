import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as store from '../data/store.js'
import { processImage } from '../lib/image.js'
import { newId } from '../lib/id.js'
import { todayIso } from '../lib/format.js'

// Ajoute les URL d'affichage aux photos et libère les anciennes.
function useObjectUrls(photos) {
  const previous = useRef([])
  const withUrls = useMemo(
    () => photos.map((p) => ({ ...p, url: URL.createObjectURL(p.blob), thumbUrl: URL.createObjectURL(p.thumb) })),
    [photos],
  )
  useEffect(() => {
    previous.current.forEach((p) => {
      URL.revokeObjectURL(p.url)
      URL.revokeObjectURL(p.thumbUrl)
    })
    previous.current = withUrls
  }, [withUrls])
  return withUrls
}

export function useCarnet() {
  const [trips, setTrips] = useState([])
  const [rawPhotos, setRawPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const tripsRef = useRef(trips)
  tripsRef.current = trips

  const reload = useCallback(async () => {
    const [t, p] = await Promise.all([store.listTrips(), store.listPhotos()])
    setTrips(t)
    setRawPhotos(p)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
    // Demande au navigateur de ne pas effacer les données en cas de manque d'espace.
    navigator.storage?.persist?.()
  }, [reload])

  const photos = useObjectUrls(rawPhotos)

  // Numéro de voyage (N° 001, 002…) selon l'ordre de création.
  const numbers = useMemo(() => {
    const map = {}
    ;[...trips].sort((a, b) => a.createdAt - b.createdAt).forEach((t, i) => (map[t.id] = i + 1))
    return map
  }, [trips])

  const createTrip = useCallback(
    // precise : position GPS du téléphone (et pas un centre-ville trouvé par recherche)
    async ({ name, lat, lng, country, precise = false }) => {
      const trip = await store.saveTrip({
        id: newId(),
        title: name,
        place: { name, lat, lng, country, precise },
        startDate: todayIso(),
        endDate: '',
        notes: '',
        createdAt: Date.now(),
      })
      await reload()
      return trip
    },
    [reload],
  )

  // Fusionne quelques champs dans le voyage : deux écrans peuvent modifier des champs différents sans s'écraser.
  const updateTrip = useCallback(async (id, patch) => {
    const current = tripsRef.current.find((t) => t.id === id)
    if (!current) return
    setTrips((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    await store.saveTrip({ ...current, ...patch })
  }, [])

  const removeTrip = useCallback(
    async (id) => {
      await store.deleteTrip(id)
      await reload()
    },
    [reload],
  )

  const addPhotos = useCallback(
    async (tripId, files) => {
      const trip = trips.find((t) => t.id === tripId)
      const errors = []
      for (const file of files) {
        try {
          const data = await processImage(file)
          // Photo sans GPS (fréquent sur iPhone) dans un voyage créé à ma position : on la place là.
          if (data.lat == null && trip?.place.precise) {
            Object.assign(data, { lat: trip.place.lat, lng: trip.place.lng, gpsSource: 'position' })
          }
          await store.savePhoto({ id: newId(), tripId, createdAt: Date.now(), ...data })
        } catch (e) {
          errors.push(e.message)
        }
      }
      await reload()
      return errors
    },
    [trips, reload],
  )

  const updatePhoto = useCallback(
    async (photoId, patch) => {
      const photo = rawPhotos.find((p) => p.id === photoId)
      if (!photo) return
      await store.savePhoto({ ...photo, ...patch })
      await reload()
    },
    [rawPhotos, reload],
  )

  const placePhoto = useCallback(
    (photoId, lat, lng) => updatePhoto(photoId, { lat, lng, gpsSource: 'manuel' }),
    [updatePhoto],
  )

  const removePhoto = useCallback(
    async (id) => {
      await store.deletePhoto(id)
      await reload()
    },
    [reload],
  )

  const importBackup = useCallback(
    async (data) => {
      const result = await store.importAll(data)
      await reload()
      return result
    },
    [reload],
  )

  return {
    loading,
    trips,
    photos,
    numbers,
    createTrip,
    updateTrip,
    removeTrip,
    addPhotos,
    updatePhoto,
    placePhoto,
    removePhoto,
    exportBackup: store.exportAll,
    importBackup,
  }
}
