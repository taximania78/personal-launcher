import type { MonthPoint } from '@/lib/habits-stats'

export function MonthlyTrend({ points }: { points: MonthPoint[] }) {
  return (
    <div className="surface-glass rounded-[var(--radius-lg)] p-4 px-5">
      <div className="flex items-end gap-1.5 h-24">
        {points.map(p => (
          <div key={p.key} className="flex-1 flex items-end h-full">
            <div
              className="w-full rounded-[2px] bg-[var(--color-bg-info)]"
              style={{ height: `${Math.max(3, p.rate * 100)}%` }}
              title={`${p.key} — ${Math.round(p.rate * 100)}%`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {points.map(p => (
          <span key={p.key} className="flex-1 text-center text-xs text-[var(--color-text-tertiary)]">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
