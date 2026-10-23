import { useEffect, useRef, useState } from 'react'
import { syncAvailable } from './config.js'

// Compte Google + synchro. Sans configuration Firebase : rien n'est chargé, l'app reste locale.
export function useSync(reload) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('off') // 'off' | 'sync' | 'ok' | 'error'
  const api = useRef(null)

  useEffect(() => {
    if (!syncAvailable) return
    let cancelled = false
    let stopSync = () => {}
    let unwatch = () => {}
    import('./firebase.js').then((m) => {
      if (cancelled) return
      api.current = m
      unwatch = m.watchUser((u) => {
        stopSync()
        stopSync = () => {}
        setUser(u ? { uid: u.uid, email: u.email.toLowerCase(), name: u.displayName, photo: u.photoURL } : null)
        if (u) stopSync = m.startSync(u, { onRemoteChange: reload, onStatus: setStatus })
        else setStatus('off')
      })
    })
    return () => {
      cancelled = true
      unwatch()
      stopSync()
    }
  }, [reload])

  return {
    available: syncAvailable,
    user,
    status,
    signIn: () => api.current?.signIn(),
    signOut: () => api.current?.signOutUser(),
  }
}
