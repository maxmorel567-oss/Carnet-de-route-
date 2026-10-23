// Connexion Google + synchronisation Firestore (chargé seulement si la configuration existe).
//
// Principe : IndexedDB reste la source de l'écran (l'app marche hors-ligne).
// - Envoi : tout voyage / photo modifié localement depuis le dernier envoi (updatedAt > syncedAt).
// - Réception : écoute en direct des voyages et photos auxquels l'adresse Gmail a accès (champ access).
// - Conflit : la version la plus récente (updatedAt) gagne.
// - Partage : access = adresses autorisées ; seul le propriétaire (owner) peut la modifier.
// Les photos sont stockées dans Firestore en base64 (≤ 1 Mio par document) : pas besoin de
// Cloud Storage, qui exige une carte bancaire.
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { collection, connectFirestoreEmulator, deleteDoc, doc, initializeFirestore, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import * as store from '../data/store.js'
import { blobToDataUrl, dataUrlToBlob } from '../lib/image.js'
import { firebaseConfig, useEmulators } from './config.js'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  // Tests : connexion Google simulée par l'émulateur
  window.__carnetTestSignIn = (email) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })))
}

export const watchUser = (callback) => onAuthStateChanged(auth, callback)

export async function signIn() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    // Fenêtre bloquée (certaines apps installées) : connexion par redirection
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
    } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      throw e
    }
  }
}

export const signOutUser = () => signOut(auth)

const MAX_IMAGE = 900_000 // caractères base64 : marge sous la limite de 1 Mio par document
const LOCAL_ONLY = new Set(['syncedAt', 'pushedAccess'])
const strip = (record) => Object.fromEntries(Object.entries(record).filter(([k]) => !LOCAL_ONLY.has(k)))
const sameList = (a = [], b = []) => a.length === b.length && a.every((x, i) => x === b[i])

// Image envoyée : recompressée plus fort si elle dépasse la limite d'un document
async function cloudImage(blob) {
  let data = await blobToDataUrl(blob)
  for (const [size, quality] of [
    [1280, 0.72],
    [960, 0.6],
  ]) {
    if (data.length <= MAX_IMAGE) break
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    data = canvas.toDataURL('image/jpeg', quality)
  }
  return data
}

/**
 * Lance la synchro pour l'utilisateur connecté. Renvoie la fonction d'arrêt.
 * onRemoteChange : des données sont arrivées (recharger l'écran) ; onStatus : 'sync' | 'ok' | 'error'.
 */
export function startSync(user, { onRemoteChange, onStatus }) {
  const email = user.email.toLowerCase()
  const uid = user.uid
  let pushing = false
  let again = false
  let timer
  let stopped = false
  // Voyage que ce compte peut envoyer : le sien, un voyage partagé avec lui, ou un voyage jamais envoyé
  const allowed = (t) => !t.owner || t.owner === uid || (t.access ?? []).includes(email)

  async function push() {
    if (stopped) return
    if (pushing) {
      again = true
      return
    }
    pushing = true
    onStatus('sync')
    try {
      const [trips, photos, deleted] = await Promise.all([store.listTrips(), store.listPhotos(), store.listDeleted()])
      const sent = new Map(trips.map((t) => [t.id, t]))
      const resendPhotosOf = new Set()

      for (const t of trips) {
        if (!allowed(t) || (t.syncedAt && t.syncedAt >= t.updatedAt)) continue
        const owner = t.owner ?? uid
        const ownerEmail = t.ownerEmail ?? email
        // Le propriétaire figure toujours dans les accès
        const access = [...new Set([ownerEmail, ...(t.access ?? [])])]
        await setDoc(doc(db, 'trips', t.id), strip({ ...t, owner, ownerEmail, access }))
        if (!sameList(t.pushedAccess, access)) resendPhotosOf.add(t.id)
        const local = { ...t, owner, ownerEmail, access, syncedAt: t.updatedAt, pushedAccess: access }
        await store.putTripRaw(local)
        sent.set(t.id, local)
      }

      for (const p of photos) {
        const updatedAt = p.updatedAt ?? p.createdAt
        if (p.syncedAt && p.syncedAt >= updatedAt && !resendPhotosOf.has(p.tripId)) continue
        const trip = sent.get(p.tripId)
        if (!trip?.syncedAt || !allowed(trip)) continue // le voyage doit exister en ligne avant ses photos
        const { blob, thumb, ...meta } = p
        await setDoc(
          doc(db, 'photos', p.id),
          strip({ ...meta, updatedAt, access: trip.access, image: await cloudImage(blob), thumb: await blobToDataUrl(thumb) }),
        )
        await store.putPhotoRaw({ ...p, updatedAt, syncedAt: updatedAt })
      }

      for (const d of deleted) {
        try {
          await deleteDoc(doc(db, d.kind === 'trip' ? 'trips' : 'photos', d.id))
        } catch (e) {
          // Pas le droit (voyage d'un autre) : la suppression reste locale
          if (e.code !== 'permission-denied' && e.code !== 'not-found') throw e
        }
      }
      if (deleted.length) await store.clearDeleted(deleted.map((d) => d.id))
      onStatus('ok')
    } catch (e) {
      console.error('Synchro :', e)
      onStatus('error')
    } finally {
      pushing = false
      if (again) {
        again = false
        push()
      }
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(push, 1200)
  }

  // Applique une modification venue d'ailleurs, sauf si la version locale est plus récente et pas encore envoyée
  async function applyTrip(change) {
    const id = change.doc.id
    const local = (await store.listTrips()).find((t) => t.id === id)
    const pendingLocal = local && local.updatedAt > (local.syncedAt ?? 0)
    if (change.type === 'removed') {
      if (local && !pendingLocal) await store.deleteTrip(id, { tombstone: false })
      return
    }
    const remote = change.doc.data()
    if (local && (local.syncedAt ?? 0) >= remote.updatedAt) return
    if (pendingLocal && local.updatedAt >= remote.updatedAt) return
    await store.putTripRaw({ ...remote, id, syncedAt: remote.updatedAt, pushedAccess: remote.access })
  }

  async function applyPhoto(change) {
    const id = change.doc.id
    const local = (await store.listPhotos()).find((p) => p.id === id)
    const localUpdated = local ? (local.updatedAt ?? local.createdAt) : 0
    const pendingLocal = local && localUpdated > (local.syncedAt ?? 0)
    if (change.type === 'removed') {
      if (local && !pendingLocal) await store.deletePhoto(id, { tombstone: false })
      return
    }
    const { image, thumb, access, ...meta } = change.doc.data()
    if (local && (local.syncedAt ?? 0) >= meta.updatedAt) return
    if (pendingLocal && localUpdated >= meta.updatedAt) return
    await store.putPhotoRaw({ ...meta, id, blob: await dataUrlToBlob(image), thumb: await dataUrlToBlob(thumb), syncedAt: meta.updatedAt })
  }

  // Écoutes en direct ; premier envoi une fois les deux premières réponses reçues
  let firstSnapshots = 0
  const listen = (name, apply) =>
    onSnapshot(
      query(collection(db, name), where('access', 'array-contains', email)),
      async (snap) => {
        for (const change of snap.docChanges()) await apply(change)
        if (snap.docChanges().length) onRemoteChange()
        if (++firstSnapshots === 2) push()
      },
      (e) => {
        console.error('Synchro :', e)
        onStatus('error')
      },
    )
  const unsubscribe = [listen('trips', applyTrip), listen('photos', applyPhoto), store.onLocalChange(schedule)]
  window.addEventListener('online', push)
  onStatus('sync')

  return () => {
    stopped = true
    clearTimeout(timer)
    unsubscribe.forEach((u) => u())
    window.removeEventListener('online', push)
  }
}
