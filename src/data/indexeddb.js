// Stockage local dans le navigateur (IndexedDB) : voyages + photos (Blob).
import { openDB } from 'idb'

const dbPromise = openDB('carnet-de-route', 1, {
  upgrade(db) {
    db.createObjectStore('trips', { keyPath: 'id' })
    const photos = db.createObjectStore('photos', { keyPath: 'id' })
    photos.createIndex('tripId', 'tripId')
  },
})

export async function listTrips() {
  return (await dbPromise).getAll('trips')
}

export async function saveTrip(trip) {
  const saved = { ...trip, updatedAt: Date.now() }
  await (await dbPromise).put('trips', saved)
  return saved
}

export async function deleteTrip(id) {
  const db = await dbPromise
  const tx = db.transaction(['trips', 'photos'], 'readwrite')
  const photoIds = await tx.objectStore('photos').index('tripId').getAllKeys(id)
  await Promise.all([
    tx.objectStore('trips').delete(id),
    ...photoIds.map((pid) => tx.objectStore('photos').delete(pid)),
    tx.done,
  ])
}

export async function listPhotos() {
  return (await dbPromise).getAll('photos')
}

export async function savePhoto(photo) {
  await (await dbPromise).put('photos', photo)
  return photo
}

export async function deletePhoto(id) {
  await (await dbPromise).delete('photos', id)
}
