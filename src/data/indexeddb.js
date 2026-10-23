// Stockage local dans le navigateur (IndexedDB) : voyages + photos (Blob).
// v2 : magasin « supprimes » (pierres tombales) pour propager les suppressions à la synchro.
import { openDB } from 'idb'

const dbPromise = openDB('carnet-de-route', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('trips', { keyPath: 'id' })
      const photos = db.createObjectStore('photos', { keyPath: 'id' })
      photos.createIndex('tripId', 'tripId')
    }
    if (oldVersion < 2) db.createObjectStore('supprimes', { keyPath: 'id' })
  },
})

export async function listTrips() {
  return (await dbPromise).getAll('trips')
}

// Modification locale : date de mise à jour = maintenant (la synchro saura qu'il faut l'envoyer)
export async function saveTrip(trip) {
  const saved = { ...trip, updatedAt: Date.now() }
  await (await dbPromise).put('trips', saved)
  return saved
}

// Écriture telle quelle (données reçues de la synchro, ou marque « envoyé »)
export async function putTripRaw(trip) {
  await (await dbPromise).put('trips', trip)
}

export async function deleteTrip(id, { tombstone = true } = {}) {
  const db = await dbPromise
  const tx = db.transaction(['trips', 'photos', 'supprimes'], 'readwrite')
  const photoIds = await tx.objectStore('photos').index('tripId').getAllKeys(id)
  const at = Date.now()
  await Promise.all([
    tx.objectStore('trips').delete(id),
    ...photoIds.map((pid) => tx.objectStore('photos').delete(pid)),
    ...(tombstone ? [tx.objectStore('supprimes').put({ id, kind: 'trip', at }), ...photoIds.map((pid) => tx.objectStore('supprimes').put({ id: pid, kind: 'photo', at }))] : []),
    tx.done,
  ])
}

export async function listPhotos() {
  return (await dbPromise).getAll('photos')
}

export async function savePhoto(photo) {
  const saved = { ...photo, updatedAt: Date.now() }
  await (await dbPromise).put('photos', saved)
  return saved
}

export async function putPhotoRaw(photo) {
  await (await dbPromise).put('photos', photo)
}

export async function deletePhoto(id, { tombstone = true } = {}) {
  const db = await dbPromise
  const tx = db.transaction(['photos', 'supprimes'], 'readwrite')
  await Promise.all([
    tx.objectStore('photos').delete(id),
    ...(tombstone ? [tx.objectStore('supprimes').put({ id, kind: 'photo', at: Date.now() })] : []),
    tx.done,
  ])
}

export async function listDeleted() {
  return (await dbPromise).getAll('supprimes')
}

export async function clearDeleted(ids) {
  const db = await dbPromise
  const tx = db.transaction('supprimes', 'readwrite')
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
}
