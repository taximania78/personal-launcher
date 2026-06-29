import { Target } from 'lucide-react'
import { getFocusTodo } from '@/lib/queries/todos'
import { getAppConfig } from '@/lib/queries/config'

export async function FocusBanner() {
  try {
    const [todo, config] = await Promise.all([getFocusTodo(), getAppConfig()])
    const focus = todo?.text ?? config?.focus_default ?? '—'
    return <Banner focus={focus} />
  } catch {
    return <Banner focus="—" />
  }
}

function Banner({ focus }: { focus: string }) {
  return (
    <div className="surface-glass-info rounded-[var(--radius-lg)] py-4 px-5 mb-5 flex items-center gap-3">
      <span aria-hidden className="text-[var(--color-text-info)]">
        <Target size={20} />
      </span>
      <div>
        <div className="text-xs text-[var(--color-text-primary)] uppercase tracking-wide">Focus unique du jour</div>
        <div
          className="text-lg text-[var(--color-text-primary)] italic"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {focus}
        </div>
      </div>
    </div>
  )
}
