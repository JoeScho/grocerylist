import { useEffect } from 'react'

// Keeps the screen on while `active`. The browser drops the lock whenever the app is
// backgrounded, so it's taken again each time the page becomes visible.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const take = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then(
        l => { if (stopped) l.release(); else lock = l },
        () => {}, // Refused (low battery, unsupported context): carry on without it.
      )
    }
    take()
    document.addEventListener('visibilitychange', take)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', take)
      lock?.release()
    }
  }, [active])
}
