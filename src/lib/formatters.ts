export function formatCountdown(target: Date): string | null {
  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return null
  const totalMin = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins} min`
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

export function formatRelative(past: Date): string {
  const diffMs = Date.now() - past.getTime()
  const totalSec = Math.floor(diffMs / 1000)
  if (totalSec < 60) return 'à l\'instant'
  const mins = Math.floor(totalSec / 60)
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export function formatVisitors(n: number): string {
  if (n < 1000) return n.toString()
  return `${(n / 1000).toFixed(1)}k`
}

export function formatDaysAgo(past: Date): number {
  return Math.floor((Date.now() - past.getTime()) / 86400000)
}
