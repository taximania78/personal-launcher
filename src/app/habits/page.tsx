import Link from 'next/link'
import { listHabits, getChecksSince, type HabitCheck } from '@/lib/queries/habits'
import { parisToday } from '@/lib/week'
import { addDays, weeklyBuckets, currentStreak, bestStreak, monthlyTrend } from '@/lib/habits-stats'
import { MonthlyTrend } from '@/components/habits/MonthlyTrend'
import { HabitYearStrip } from '@/components/habits/HabitYearStrip'

export const dynamic = 'force-dynamic'

export default async function HabitsStatsPage() {
  const today = parisToday()
  const startDay = addDays(today, -371)

  let habits: Awaited<ReturnType<typeof listHabits>> = []
  let checks: HabitCheck[] = []
  let dbError = false
  try {
    ;[habits, checks] = await Promise.all([listHabits(), getChecksSince(startDay)])
  } catch (err) {
    console.error('[/habits]', err)
    dbError = true
  }

  // Les coches des habitudes désactivées sont ignorées : le dénominateur de la
  // tendance ne compte que les habitudes actives, garder leurs coches gonflerait
  // les barres.
  const activeIds = new Set(habits.map(h => h.id))
  const byHabit = new Map<number, Set<string>>()
  const activeChecks: HabitCheck[] = []
  for (const c of checks) {
    if (!activeIds.has(c.habit_id)) continue
    activeChecks.push(c)
    let set = byHabit.get(c.habit_id)
    if (!set) { set = new Set(); byHabit.set(c.habit_id, set) }
    set.add(c.day)
  }
  const trend = monthlyTrend(activeChecks, habits.length, today)

  return (
    <main>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl italic" style={{ fontFamily: 'var(--font-display)' }}>
          Habitudes · Statistiques
        </h1>
        <Link href="/" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          ← Retour
        </Link>
      </div>

      {dbError && (
        <div className="bg-[var(--color-bg-danger)] text-[var(--color-text-danger)] rounded-[var(--radius-md)] p-3 mb-5 text-sm">
          Base de données indisponible. Les statistiques ne peuvent pas être chargées pour le moment.
        </div>
      )}

      {!dbError && habits.length === 0 && (
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Pas encore d’historique — ajoute des habitudes depuis la page Configuration.
        </p>
      )}

      {!dbError && habits.length > 0 && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-medium mb-3">Tendance mensuelle</h2>
            <MonthlyTrend points={trend} />
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">Par habitude</h2>
            <div className="surface-glass rounded-[var(--radius-lg)] p-4 px-5 flex flex-col gap-3">
              {habits.map(h => {
                const days = byHabit.get(h.id) ?? new Set<string>()
                return (
                  <HabitYearStrip
                    key={h.id}
                    name={h.name}
                    icon={h.icon}
                    buckets={weeklyBuckets(days, today, h.created_at)}
                    current={currentStreak(days, today)}
                    best={bestStreak(days)}
                  />
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <span>moins</span>
              {[0.12, 0.35, 0.6, 0.85, 1].map((o, i) => (
                <span key={i} className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: 'var(--color-bg-info)', opacity: o }} />
              ))}
              <span>plus</span>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
