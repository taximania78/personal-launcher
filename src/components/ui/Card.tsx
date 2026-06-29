import { ReactNode } from 'react'

export function Card({ icon, title, action, children }: {
  icon?: ReactNode, title: string, action?: ReactNode, children: ReactNode,
}) {
  return (
    <div className="surface-glass rounded-[var(--radius-lg)] p-4 px-5">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-[var(--color-text-secondary)]">{icon}</span>}
        <span className="text-sm font-medium">{title}</span>
        {action && <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">{action}</span>}
      </div>
      {children}
    </div>
  )
}
