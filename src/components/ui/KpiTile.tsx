export function KpiTile({ label, value, accent }: { label: string, value: string | number, accent?: 'default' | 'danger' }) {
  const color = accent === 'danger' ? 'text-[var(--color-text-danger)]' : 'text-[var(--color-text-primary)]'
  return (
    <div className="surface-glass-soft rounded-[var(--radius-md)] py-2.5 px-3">
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className={`text-2xl font-medium tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
