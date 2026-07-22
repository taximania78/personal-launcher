import Link from 'next/link'
import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { TileIcon } from '../ui/TileIcon'
import { HabitsGrid } from './HabitsGrid'
import { listHabits, getWeekChecks } from '@/lib/queries/habits'
import { getAppConfig } from '@/lib/queries/config'
import { parisToday, parisWeekDays } from '@/lib/week'

export async function HabitsCard() {
  let content: React.ReactNode
  try {
    const days = parisWeekDays()
    const [habits, checks, config] = await Promise.all([
      listHabits(),
      getWeekChecks(days),
      getAppConfig(),
    ])
    if (habits.length === 0) {
      content = (
        <div className="text-sm text-[var(--color-text-tertiary)]">
          Aucune habitude — ajoute-en depuis la page Configuration.
        </div>
      )
    } else {
      content = (
        <HabitsGrid
          habits={habits.map(h => ({ id: h.id, name: h.name, icon: h.icon }))}
          days={days}
          today={parisToday()}
          initialChecks={checks.map(c => `${c.habit_id}:${c.day}`)}
          confettiEnabled={config?.confetti_enabled ?? true}
        />
      )
    }
  } catch {
    return <CardError title="Habitudes" />
  }
  return (
    <Card
      title="Habitudes"
      action={
        <Link
          href="/habits"
          aria-label="Voir les statistiques des habitudes"
          className="hover:text-[var(--color-text-primary)]"
        >
          <TileIcon icon="History" size={15} />
        </Link>
      }
    >
      {content}
    </Card>
  )
}
