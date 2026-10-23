// Point d'entrée unique pour les données locales (IndexedDB).
// Chaque modification locale prévient les abonnés (la synchro Firebase, si elle est active).
import * as backend from './indexeddb.js'
import { blobToDataUrl, dataUrlToBlob } from '../lib/image.js'

const listeners = new Set()
export const onLocalChange = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const notify = (fn) => async (...args) => {
  const result = await fn(...args)
  listeners.forEach((l) => l())
  return result
}

export const { listTrips, listPhotos, putTripRaw, putPhotoRaw, listDeleted, clearDeleted } = backend
export const saveTrip = notify(backend.saveTrip)
export const savePhoto = notify(backend.savePhoto)
export const deleteTrip = notify(backend.deleteTrip)
export const deletePhoto = notify(backend.deletePhoto)

const FORMAT = 'carnet-de-route'

// Sauvegarde complète (photos incluses) dans un objet JSON.
export async function exportAll() {
  const [trips, photos] = await Promise.all([listTrips(), listPhotos()])
  return {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    trips,
    photos: await Promise.all(
      photos.map(async ({ blob, thumb, ...meta }) => ({
        ...meta,
        image: await blobToDataUrl(blob),
        thumb: await blobToDataUrl(thumb),
      })),
    ),
  }
}

// Fusionne une sauvegarde : les éléments de même id sont remplacés.
export async function importAll(data) {
  if (data?.format !== FORMAT || !Array.isArray(data.trips) || !Array.isArray(data.photos)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Carnet de Route.")
  }
  for (const trip of data.trips) await backend.saveTrip(trip)
  for (const { image, thumb, ...meta } of data.photos) {
    await backend.savePhoto({ ...meta, blob: await dataUrlToBlob(image), thumb: await dataUrlToBlob(thumb) })
  }
  listeners.forEach((l) => l())
  return { trips: data.trips.length, photos: data.photos.length }
}
