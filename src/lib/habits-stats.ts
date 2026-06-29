import type { HabitCheck } from './queries/habits'

export type WeekBucket = { level: 0 | 1 | 2 | 3 | 4; inRange: boolean }

const WEEKS = 53

/** Jour ISO décalé de n jours. Ancre à midi UTC : insensible au DST. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** Lundi (ISO) de la semaine contenant `iso`. */
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
  return dt.toISOString().slice(0, 10)
}

/**
 * Série en cours : jours consécutifs cochés en remontant. Aujourd'hui non
 * encore coché ne casse pas la série (l'ancre devient hier).
 */
export function currentStreak(checkDays: Set<string>, today: string): number {
  let anchor = checkDays.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (checkDays.has(anchor)) {
    streak++
    anchor = addDays(anchor, -1)
  }
  return streak
}

/** Plus longue série de jours consécutifs présents dans `checkDays`. */
export function bestStreak(checkDays: Set<string>): number {
  const days = [...checkDays].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

export type MonthPoint = { key: string; label: string; rate: number }

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/** Nombre de jours du mois (month1 = 1..12). */
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0, 12)).getUTCDate()
}

/**
 * Tendance sur 12 mois glissants (du plus ancien au mois courant).
 * rate = cochesDuMois / (activeHabits * jours), borné 0..1. Le mois courant
 * est normalisé sur les jours écoulés (jusqu'à `today`).
 */
export function monthlyTrend(checks: HabitCheck[], activeHabits: number, today: string): MonthPoint[] {
  const [ty, tm, td] = today.split('-').map(Number)
  const points: MonthPoint[] = []
  for (let i = 11; i >= 0; i--) {
    let y = ty
    let m = tm - i
    while (m <= 0) { m += 12; y -= 1 }
    const key = `${y}-${String(m).padStart(2, '0')}`
    const days = i === 0 ? td : daysInMonth(y, m)
    const count = checks.reduce((n, c) => n + (c.day.startsWith(key) ? 1 : 0), 0)
    const denom = activeHabits * days
    const rate = denom > 0 ? Math.min(1, count / denom) : 0
    points.push({ key, label: MONTH_INITIALS[m - 1], rate })
  }
  return points
}

/**
 * 53 buckets hebdomadaires (du plus ancien au plus récent), le dernier
 * contenant `today`. level = round(joursCochés / 7 * 4) → 0..4.
 * inRange=false si toute la semaine précède `createdDay` (habitude inexistante).
 */
export function weeklyBuckets(checkDays: Set<string>, today: string, createdDay: string): WeekBucket[] {
  const lastMonday = mondayOf(today)
  const buckets: WeekBucket[] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    const weekMonday = addDays(lastMonday, -7 * w)
    const lastDay = addDays(weekMonday, 6)
    let count = 0
    for (let i = 0; i < 7; i++) {
      if (checkDays.has(addDays(weekMonday, i))) count++
    }
    const level = Math.min(4, Math.round((count / 7) * 4)) as WeekBucket['level']
    buckets.push({ level, inRange: lastDay >= createdDay })
  }
  return buckets
}
