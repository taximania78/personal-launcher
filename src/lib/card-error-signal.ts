// Compteur des cartes en erreur actuellement montées. `CardError` s'y inscrit
// au montage et s'en retire au démontage (CardErrorBeacon) ; le chip de mise à
// jour s'y abonne (useSyncExternalStore) pour dériver son état « erreur » en
// direct — y compris quand une carte arrive en streaming après le header, ou
// quand un refresh remplace une CardError par sa carte (démontage → décrément).
let count = 0
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export function cardErrorEnter(): void {
  count += 1
  notify()
}

export function cardErrorLeave(): void {
  if (count === 0) return
  count -= 1
  notify()
}

export function getCardErrorCount(): number {
  return count
}

export function subscribeCardErrors(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Tests uniquement : remet le store à zéro entre deux cas. */
export function _resetCardErrors(): void {
  count = 0
  listeners.clear()
}
