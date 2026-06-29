export function CardSkeleton() {
  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] p-4 px-5 h-32 animate-pulse">
      <div className="h-3 w-24 bg-[var(--color-bg-secondary)] rounded mb-3"></div>
      <div className="h-3 w-3/4 bg-[var(--color-bg-secondary)] rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-[var(--color-bg-secondary)] rounded"></div>
    </div>
  )
}

export function FocusBannerSkeleton() {
  return <div className="bg-[var(--color-bg-info)] rounded-[var(--radius-lg)] h-14 mb-5 animate-pulse"></div>
}
