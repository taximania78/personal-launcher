// Règle « faut-il re-rendre la page maintenant ? », isolée du composant
// AutoRefresh pour être testable sans DOM. Deux déclencheurs :
// - `return` : la fenêtre ou l'onglet reprend le premier plan. `focus` et
//   `visibilitychange` partent souvent ensemble → anti-rebond court.
// - `timer`  : l'onglet est resté visible sans bouger → péremption longue,
//   les données sont globalement statiques (collectors n8n horaires).
// Un onglet caché n'est jamais rafraîchi : le retour s'en chargera.

import { formatRelative } from '@/lib/formatters'

export type RefreshTrigger = 'return' | 'timer'

export const RETURN_DEBOUNCE_MS = 10_000
export const VISIBLE_STALE_MS = 30 * 60_000

const MIN_AGE_MS: Record<RefreshTrigger, number> = {
  return: RETURN_DEBOUNCE_MS,
  timer: VISIBLE_STALE_MS,
}

export function shouldRefresh(
  trigger: RefreshTrigger,
  { now, lastRefreshAt, visible }: { now: number; lastRefreshAt: number; visible: boolean },
): boolean {
  if (!visible) return false
  return now - lastRefreshAt >= MIN_AGE_MS[trigger]
}

// Libellé du chip de statut. `null` tant que le composant n'est pas monté
// (SSR : pas de date côté client → on ne rend que le point, comme l'horloge).
export function refreshChipLabel(
  { pending, lastUpdatedAt, now }: { pending: boolean; lastUpdatedAt: Date | null; now: Date },
): string | null {
  if (pending) return 'actualisation…'
  if (!lastUpdatedAt) return null
  return formatRelative(lastUpdatedAt, now)
}

const TITLE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris',
})

// Info-bulle : la date et l'heure complètes, le libellé restant relatif.
export function refreshChipTitle(lastUpdatedAt: Date): string {
  return `Dernière mise à jour : ${TITLE_FMT.format(lastUpdatedAt)}`
}
