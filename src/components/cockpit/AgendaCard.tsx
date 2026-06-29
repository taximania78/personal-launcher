import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { CardError } from '../ui/CardError'
import { getUpcomingEvents } from '@/lib/queries/calendar'

const PARIS = 'Europe/Paris'

function formatHHmm(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: PARIS })
}

// Clé de jour stable en Europe/Paris (les timestamps sont stockés en UTC).
function dayKey(d: Date): string {
  return d.toLocaleDateString('fr-FR', { timeZone: PARIS })
}

// Jour Paris au format trié YYYY-MM-DD (comparable lexicographiquement).
function parisYmd(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: PARIS })
}

function dayLabel(d: Date, now: Date): string {
  const tomorrow = new Date(now.getTime() + 86_400_000)
  if (dayKey(d) === dayKey(now)) return "Aujourd'hui"
  if (dayKey(d) === dayKey(tomorrow)) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PARIS })
}

export async function AgendaCard() {
  try {
    const events = await getUpcomingEvents()
    if (events.length === 0) {
      return (
        <Card title="Agenda">
          <EmptyState>Pas d&apos;événement à venir</EmptyState>
        </Card>
      )
    }

    const now = new Date()
    const todayYmd = parisYmd(now)
    // Un événement déjà commencé mais encore en cours (multi-jours : Salon du 18
    // au 19) est retourné par la requête (ends_at >= NOW()) mais sa date de début
    // est passée : on le rattache au jour courant plutôt qu'à son 18 juin révolu.
    const dated = events.map((e) => {
      const start = new Date(e.starts_at)
      const day = parisYmd(start) < todayYmd ? now : start
      return { event: e, start, day }
    })
    const rows = dated.map((r, i) => ({
      ...r,
      showDay: dayKey(r.day) !== (i > 0 ? dayKey(dated[i - 1].day) : null),
    }))

    return (
      <Card title="Agenda">
        <ul className="flex flex-col gap-3 text-sm">
          {rows.map(({ event, start, day, showDay }) => (
            <li key={event.uid} className="flex flex-col gap-1">
              {showDay && (
                <span className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  {dayLabel(day, now)}
                </span>
              )}
              <div className="flex gap-3">
                <span className="text-[var(--color-text-tertiary)] min-w-[42px] tabular-nums">
                  {event.all_day ? 'Toute la journée' : formatHHmm(start)}
                </span>
                <span>{event.title}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    )
  } catch {
    return <CardError title="Agenda" />
  }
}
