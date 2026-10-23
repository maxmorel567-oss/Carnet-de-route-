// Thème : 'auto' (suit le téléphone), 'light' ou 'dark'. Appliqué via data-theme sur <html>.
const KEY = 'carnet:theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

export const isDark = () => {
  const t = getTheme()
  return t === 'dark' || (t === 'auto' && media.matches)
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // préférence non mémorisée, mais appliquée pour cette visite
  }
  applyTheme(theme)
  window.dispatchEvent(new Event('carnet:theme'))
}

// Prévient quand le thème effectif change (choix dans l'app ou réglage du téléphone)
export function onThemeChange(callback) {
  const run = () => callback(isDark())
  media.addEventListener('change', run)
  window.addEventListener('carnet:theme', run)
  return () => {
    media.removeEventListener('change', run)
    window.removeEventListener('carnet:theme', run)
  }
}
