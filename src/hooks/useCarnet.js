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
    async ({ name, lat, lng }) => {
      const trip = await store.saveTrip({
        id: newId(),
        title: name,
        place: { name, lat, lng },
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

  const updateTrip = useCallback(
    async (trip) => {
      // Mise à jour immédiate de l'écran, puis enregistrement.
      setTrips((list) => list.map((t) => (t.id === trip.id ? trip : t)))
      await store.saveTrip(trip)
    },
    [],
  )

  const removeTrip = useCallback(
    async (id) => {
      await store.deleteTrip(id)
      await reload()
    },
    [reload],
  )

  const addPhotos = useCallback(
    async (tripId, files) => {
      const errors = []
      for (const file of files) {
        try {
          const data = await processImage(file)
          await store.savePhoto({ id: newId(), tripId, createdAt: Date.now(), ...data })
        } catch (e) {
          errors.push(e.message)
        }
      }
      await reload()
      return errors
    },
    [reload],
  )

  const placePhoto = useCallback(
    async (photoId, lat, lng) => {
      const photo = rawPhotos.find((p) => p.id === photoId)
      if (!photo) return
      await store.savePhoto({ ...photo, lat, lng, gpsSource: 'manuel' })
      await reload()
    },
    [rawPhotos, reload],
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
    placePhoto,
    removePhoto,
    exportBackup: store.exportAll,
    importBackup,
  }
}
