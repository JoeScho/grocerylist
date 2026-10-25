import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

// Chrome/Android fire this once, early; keep it so the Home screen can offer an install button.
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  listeners.forEach(l => l())
})

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred)
  useEffect(() => {
    const l = () => setAvailable(!!deferred)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    setAvailable(false)
  }
  return { available, install }
}
