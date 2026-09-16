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
// `failed` : au moins une carte est en erreur → le dernier rendu n'a pas
// rapporté de données fraîches, on le dit plutôt que d'afficher « Mis à jour ».
export function refreshChipLabel(
  { pending, lastUpdatedAt, now, failed = false }: {
    pending: boolean; lastUpdatedAt: Date | null; now: Date; failed?: boolean
  },
): string | null {
  if (pending) return 'Mise à jour…'
  if (failed) return 'Erreur lors de la mise à jour'
  if (!lastUpdatedAt) return null
  return `Mis à jour ${formatRelative(lastUpdatedAt, now)}`
}

const TITLE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Paris',
})

// Info-bulle : la date et l'heure complètes, le libellé restant relatif. En
// erreur, `lastUpdatedAt` n'a pas avancé : c'est la dernière réussie.
export function refreshChipTitle(lastUpdatedAt: Date, failed = false): string {
  const what = failed ? 'Dernière mise à jour réussie' : 'Dernière mise à jour'
  return `${what} : ${TITLE_FMT.format(lastUpdatedAt)}`
}
