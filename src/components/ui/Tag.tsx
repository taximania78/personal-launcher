import { ReactNode } from 'react'

export function Tag({ children, tone = 'neutral' }: { children: ReactNode, tone?: 'neutral' | 'warning' | 'danger' }) {
  const bg = tone === 'danger' ? 'bg-[var(--color-bg-danger)] text-[var(--color-text-danger)]'
           : tone === 'warning' ? 'bg-[var(--color-bg-warning)] text-[var(--color-text-warning)]'
           : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
  return <span className={`text-sm rounded-[var(--radius-md)] py-1 px-2.5 ${bg}`}>{children}</span>
}
