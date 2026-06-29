import { ReactNode } from 'react'
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-sm text-[var(--color-text-tertiary)]">{children}</div>
}
