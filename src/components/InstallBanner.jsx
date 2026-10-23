import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { dismissInstall, installDismissed, isInstalled, isIOS } from '../lib/backup.js'

// Invite à installer l'app : sur iPhone, Safari efface les données d'un site non installé après ~7 jours sans visite.
export default function InstallBanner({ hasTrips }) {
  const [prompt, setPrompt] = useState(null)
  const [hidden, setHidden] = useState(() => isInstalled() || installDismissed())

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || !hasTrips || (!prompt && !isIOS())) return null

  const later = () => {
    dismissInstall()
    setHidden(true)
  }
  const install = async () => {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setHidden(true)
  }

  return (
    <div className="glisse fixed top-16 left-1/2 z-[850] flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-start gap-3 rounded-[8px] border border-trait bg-surface px-4 py-3 shadow-lg [top:max(4rem,calc(env(safe-area-inset-top)+3.25rem))]">
      <Icon name="download" size={20} className="mt-0.5 shrink-0 text-bleu" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Installe l'app pour protéger tes voyages</p>
        <p className="mt-0.5 text-encre-douce">
          {prompt ? 'Elle s’ouvre comme une vraie app, même hors-ligne.' : 'Touche Partager puis «\u00a0Sur l’écran d’accueil\u00a0».'}
        </p>
        <div className="mt-2 flex gap-4">
          {prompt && (
            <button onClick={install} className="etiquette text-bleu">
              Installer
            </button>
          )}
          <button onClick={later} className="etiquette text-encre-muette">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
