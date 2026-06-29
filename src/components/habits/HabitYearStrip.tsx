import { TileIcon } from '../ui/TileIcon'
import type { WeekBucket } from '@/lib/habits-stats'

const LEVEL_OPACITY = [0.12, 0.35, 0.6, 0.85, 1]

export function HabitYearStrip({ name, icon, buckets, current, best }: {
  name: string
  icon: string | null
  buckets: WeekBucket[]
  current: number
  best: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-sm w-32 shrink-0 truncate">
        {icon && (
          <span className="text-[var(--color-text-secondary)]">
            <TileIcon icon={icon} size={15} />
          </span>
        )}
        <span className="truncate">{name}</span>
      </span>

      <div className="flex gap-[2px] flex-1 min-w-0">
        {buckets.map((b, i) => (
          <span
            key={i}
            className="h-3 flex-1 rounded-[2px]"
            style={
              b.inRange
                ? { backgroundColor: 'var(--color-bg-info)', opacity: LEVEL_OPACITY[b.level] }
                : { backgroundColor: 'transparent' }
            }
          />
        ))}
      </div>

      <span className="text-xs text-[var(--color-text-tertiary)] shrink-0 whitespace-nowrap">
        {current} j · record {best} j
      </span>
    </div>
  )
}
