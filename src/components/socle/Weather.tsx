import { getMeteo } from '@/lib/queries/meteo'
import { siteConfig } from '@/lib/site-config'

export async function Weather() {
  const fallback = `${siteConfig.weatherLocation} · —`
  try {
    const result = await Promise.race([
      getMeteo(),
      new Promise<null>((r) => setTimeout(() => r(null), 500)),
    ])
    if (!result) return <Chip text={fallback} />
    return <Chip text={`${result.location} · ${Number(result.temperature_c).toFixed(0)}°C`} />
  } catch {
    return <Chip text={fallback} />
  }
}

function Chip({ text }: { text: string }) {
  return (
    <span className="surface-glass-soft inline-flex items-center gap-1.5 py-1.5 px-3 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)]">
      {text}
    </span>
  )
}
