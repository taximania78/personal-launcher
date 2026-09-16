// Règle « faut-il re-rendre la page maintenant ? », isolée du composant
// AutoRefresh pour être testable sans DOM. Deux déclencheurs :
// - `return` : la fenêtre ou l'onglet reprend le premier plan. `focus` et
//   `visibilitychange` partent souvent ensemble → anti-rebond court.
// - `timer`  : l'onglet est resté visible sans bouger → péremption longue,
//   les données sont globalement statiques (collectors n8n horaires).
// Un onglet caché n'est jamais rafraîchi : le retour s'en chargera.

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
