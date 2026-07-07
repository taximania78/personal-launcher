// Partitionne une liste de tâches en « actives » (à faire) et « terminées »,
// en préservant l'ordre d'entrée dans chaque groupe (tri stable). Utilisé côté
// client pour regrouper les tâches terminées en bas de la liste du jour, de
// façon dynamique au clic — sans changer l'ordre persisté en base.
export function splitActiveCompleted<T extends { done: boolean }>(
  list: readonly T[],
): { active: T[]; completed: T[] } {
  const active: T[] = []
  const completed: T[] = []
  for (const item of list) {
    (item.done ? completed : active).push(item)
  }
  return { active, completed }
}
