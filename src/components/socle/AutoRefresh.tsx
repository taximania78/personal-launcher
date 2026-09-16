'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { shouldRefresh, VISIBLE_STALE_MS, type RefreshTrigger } from './auto-refresh-policy'

// Re-rend la page (Server Components → données fraîches) quand on revient
// dessus — depuis un autre onglet (`visibilitychange`) ou depuis une autre
// application (`focus` de la fenêtre ; l'onglet reste « visible » pendant un
// ⌘-Tab, ce signal-là ne suffit pas) — et, plus rarement, quand l'onglet est
// resté au premier plan sans bouger (timer réarmé après chaque refresh).
// `router.refresh()` tourne dans une transition : le contenu courant reste
// affiché, pas de flash des skeletons ; l'état client est conservé, d'où
// `useServerState` dans les cartes interactives pour se réaligner.
export function AutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    let lastRefreshAt = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined

    const armTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => attempt('timer'), VISIBLE_STALE_MS)
    }

    const attempt = (trigger: RefreshTrigger) => {
      const ok = shouldRefresh(trigger, {
        now: Date.now(),
        lastRefreshAt,
        visible: document.visibilityState === 'visible',
      })
      if (!ok) return
      lastRefreshAt = Date.now()
      router.refresh()
      armTimer()
    }

    const onReturn = () => attempt('return')
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    armTimer()

    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [router])

  return null
}
