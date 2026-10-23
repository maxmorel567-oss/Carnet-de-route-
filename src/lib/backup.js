// Suivi des sauvegardes et de l'installation (préférences locales, jamais indispensables).
const KEY_BACKUP = 'carnet:derniere-sauvegarde'
const KEY_INSTALL = 'carnet:installation-plus-tard'
const DAY = 24 * 60 * 60 * 1000

const read = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Stockage bloqué : le rappel reviendra, sans gravité.
  }
}

export const lastBackup = () => read(KEY_BACKUP)
export const markBackup = () => write(KEY_BACKUP, Date.now())

// Rappel si aucune sauvegarde depuis 14 jours, ou jamais alors que le premier voyage a plus de 3 jours.
export function backupDue(trips) {
  if (!trips.length) return false
  const last = lastBackup()
  if (last) return Date.now() - last > 14 * DAY
  return Date.now() - Math.min(...trips.map((t) => t.createdAt)) > 3 * DAY
}

export function formatLastBackup() {
  const last = lastBackup()
  if (!last) return 'Aucune sauvegarde pour le moment'
  const days = Math.floor((Date.now() - last) / DAY)
  return days === 0 ? "Dernière sauvegarde aujourd'hui" : `Dernière sauvegarde il y a ${days} jour${days > 1 ? 's' : ''}`
}

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export const installDismissed = () => Date.now() - read(KEY_INSTALL) < 7 * DAY
export const dismissInstall = () => write(KEY_INSTALL, Date.now())

// Sur téléphone : menu Partager (Fichiers, Drive…). Sinon : téléchargement classique.
export async function saveFile(blob, name, title = 'Sauvegarde Carnet de Route') {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return true
    } catch (e) {
      if (e.name === 'AbortError') return false
    }
  }
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
