import { Clock } from 'lucide-react'
import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { KpiTile } from '../ui/KpiTile'
import { Tag } from '../ui/Tag'
import {
  getJobKpis, getPendingFollowups, getNextApplicationEvent,
} from '@/lib/queries/applications'
import { getNextInterview } from '@/lib/queries/calendar'
import { formatCountdown, formatDaysAgo } from '@/lib/formatters'

export async function JobCard() {
  try {
    const [kpis, followups, nextApp, nextCal] = await Promise.all([
      getJobKpis(),
      getPendingFollowups(),
      getNextApplicationEvent(),
      getNextInterview(),
    ])

    const candidates: { at: Date, label: string }[] = []
    if (nextCal) candidates.push({ at: new Date(nextCal.starts_at), label: nextCal.title })
    if (nextApp) candidates.push({ at: new Date(nextApp.next_event), label: nextApp.company })
    candidates.sort((a, b) => a.at.getTime() - b.at.getTime())
    const next = candidates[0]
    const countdown = next ? formatCountdown(next.at) : null

    return (
      <Card title="Job search">
        <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}>
          <KpiTile label="Envoyées" value={(kpis['Applied'] ?? 0) + (kpis['Rejected'] ?? 0)} />
          <KpiTile label="En cours" value={kpis['Applied'] ?? 0} />
          <KpiTile label="Entretiens" value={kpis['Interview'] ?? 0} />
          <KpiTile label="Relances dues" value={followups.length} accent={followups.length > 0 ? 'danger' : 'default'} />
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <span className="text-sm text-[var(--color-text-secondary)]">À relancer :</span>
          {followups.length === 0 && <span className="text-sm text-[var(--color-text-tertiary)]">aucune</span>}
          {followups.map(f => {
            const days = f.last_contact ? formatDaysAgo(new Date(f.last_contact)) : null
            const tone = days !== null && days >= 14 ? 'danger' : 'warning'
            return <Tag key={f.notion_id} tone={tone}>{f.company}{days !== null ? ` (${days}j)` : ''}</Tag>
          })}
          {next && countdown && (
            <span className="ml-auto text-sm text-[var(--color-text-secondary)] inline-flex gap-1.5 items-center">
              <Clock size={14} aria-hidden /> {next.label} dans <b className="font-medium text-[var(--color-text-primary)]">{countdown}</b>
            </span>
          )}
        </div>
      </Card>
    )
  } catch {
    return <CardError title="Job search" />
  }
}
