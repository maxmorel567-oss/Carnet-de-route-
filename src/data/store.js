// Point d'entrée unique pour les données.
// Pour passer à Supabase plus tard : écrire data/supabase.js avec les mêmes
// fonctions et changer uniquement l'import ci-dessous (voir README).
import * as backend from './indexeddb.js'
import { blobToDataUrl, dataUrlToBlob } from '../lib/image.js'

export const { listTrips, saveTrip, deleteTrip, listPhotos, savePhoto, deletePhoto } = backend

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
  return { trips: data.trips.length, photos: data.photos.length }
}
