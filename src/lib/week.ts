const TZ = 'Europe/Paris'

/** Date ISO (YYYY-MM-DD) de `now` vue depuis Europe/Paris. */
export function parisToday(now: Date = new Date()): string {
  // en-CA formate nativement en YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

/** Date ISO (YYYY-MM-DD) du lendemain de `now` vue depuis Europe/Paris. */
export function parisTomorrow(now: Date = new Date()): string {
  const [y, m, d] = parisToday(now).split('-').map(Number)
  // Midi UTC : insensible aux décalages DST lors de l'addition d'un jour
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  anchor.setUTCDate(anchor.getUTCDate() + 1)
  return anchor.toISOString().slice(0, 10)
}

/** Les 7 dates ISO (lundi → dimanche) de la semaine Europe/Paris contenant `now`. */
export function parisWeekDays(now: Date = new Date()): string[] {
  const [y, m, d] = parisToday(now).split('-').map(Number)
  // Midi UTC : insensible aux décalages DST lors des additions de jours
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  const monday = new Date(anchor)
  monday.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}
