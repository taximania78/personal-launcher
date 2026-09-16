'use client'
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getCardErrorCount, subscribeCardErrors } from '@/lib/card-error-signal'
import {
  shouldRefresh, refreshChipLabel, refreshChipTitle, VISIBLE_STALE_MS, type RefreshTrigger,
} from './auto-refresh-policy'

// Re-rend la page (Server Components → données fraîches) quand on revient
// dessus — depuis un autre onglet (`visibilitychange`) ou depuis une autre
// application (`focus` de la fenêtre ; l'onglet reste « visible » pendant un
// ⌘-Tab, ce signal-là ne suffit pas) — et, plus rarement, quand l'onglet est
// resté au premier plan sans bouger (timer réarmé après chaque refresh).
// `router.refresh()` tourne dans une transition : le contenu courant reste
// affiché, pas de flash des skeletons ; l'état client est conservé, d'où
// `useServerState` dans les cartes interactives pour se réaligner.
//
// Rend le chip de statut du header : point vert + « Mis à jour il y a N min »,
// qui pulse pendant l'actualisation ; cliquable pour forcer un refresh. Point
// rouge + « Erreur lors de la mise à jour » si des cartes sont en erreur (base
// injoignable : le serveur répond, les cartes rendent CardError) — dans ce cas
// `lastUpdatedAt` n'avance pas, l'info-bulle donne la dernière réussie.

const TICK_MS = 30_000

// false en SSR et pendant l'hydratation, true ensuite — sans mismatch : le
// libellé dépend de l'heure du client, que le serveur ne connaît pas (cf. Clock).
const noopSubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

export function AutoRefresh() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const mounted = useMounted()
  const failed = useSyncExternalStore(subscribeCardErrors, getCardErrorCount, () => 0) > 0
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const wasPending = useRef(false)

  // Fin de transition = nouveau payload fusionné → c'est l'instant « à jour »,
  // sauf si des cartes sont en erreur (les balises ont déjà compté : layout).
  useEffect(() => {
    if (wasPending.current && !isPending && getCardErrorCount() === 0) {
      const done = new Date()
      setLastUpdatedAt(done)
      setNow(done)
    }
    wasPending.current = isPending
  }, [isPending])

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
      startTransition(() => router.refresh())
      armTimer()
    }

    const onReturn = () => attempt('return')
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    armTimer()
    // Le libellé relatif (« il y a N min ») doit vieillir sans événement.
    const tick = setInterval(() => setNow(new Date()), TICK_MS)

    return () => {
      clearTimeout(timer)
      clearInterval(tick)
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [router])

  function forceRefresh() {
    if (isPending) return
    startTransition(() => router.refresh())
  }

  const label = mounted ? refreshChipLabel({ pending: isPending, lastUpdatedAt, now, failed }) : null

  return (
    <button
      type="button"
      onClick={forceRefresh}
      disabled={isPending}
      title={mounted ? refreshChipTitle(lastUpdatedAt, failed) : undefined}
      aria-label="Actualiser la page"
      className="surface-glass-soft inline-flex items-center gap-2 py-1.5 px-3 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:cursor-default"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${failed && !isPending
          ? 'bg-[var(--color-text-danger)]'
          : 'bg-[var(--color-text-success)]'} ${isPending ? 'animate-pulse' : ''}`}
      />
      {label && <span>{label}</span>}
    </button>
  )
}
