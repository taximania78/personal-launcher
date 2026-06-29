import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { getServicesHealth } from '@/lib/queries/services'
import { getSignals } from '@/lib/queries/signals'
import { formatRelative } from '@/lib/formatters'

type BackupStatus = 'ok' | 'warning' | 'fail'

function BackupGlyph({ status, size = 14 }: { status: BackupStatus, size?: number }) {
  if (status === 'ok') return <CheckCircle2 size={size} aria-hidden />
  if (status === 'warning') return <AlertCircle size={size} aria-hidden />
  return <XCircle size={size} aria-hidden />
}

export async function HomelabCard() {
  try {
    const [health, signals] = await Promise.all([
      getServicesHealth(),
      getSignals(),
    ])

    type Cell = {
      label: string
      value: React.ReactNode
      tone?: 'success' | 'fail'
    }
    const cells: Cell[] = []
    cells.push({
      label: 'Services',
      value: health.total === 0 ? '—' : `${health.up} / ${health.total} up`,
      tone: health.total > 0 && health.up === health.total ? 'success' : undefined,
    })

    const backupsValue: React.ReactNode = signals?.backups_status
      ? (
        <span className="inline-flex items-center gap-1.5">
          <BackupGlyph status={signals.backups_status as BackupStatus} />
          {signals.backups_last_run_at ? formatRelative(new Date(signals.backups_last_run_at)) : ''}
        </span>
      )
      : '—'

    cells.push({
      label: 'Backups',
      value: backupsValue,
      tone: signals?.backups_status === 'ok' ? 'success' : signals?.backups_status === 'fail' ? 'fail' : undefined,
    })

    return (
      <Card title="Homelab & blog">
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {cells.map((c, i) => (
            <div key={i} className="surface-glass-soft rounded-[var(--radius-md)] py-2.5 px-3">
              <div className="text-xs text-[var(--color-text-secondary)]">{c.label}</div>
              <div className={`text-sm font-medium ${
                c.tone === 'success' ? 'text-[var(--color-text-success)]' :
                c.tone === 'fail' ? 'text-[var(--color-text-danger)]' : ''
              }`}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  } catch {
    return <CardError title="Homelab & blog" />
  }
}
