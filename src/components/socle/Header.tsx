import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Clock } from './Clock'
import { Weather } from './Weather'
import { siteConfig } from '@/lib/site-config'

export function Header() {
  return (
    <header className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
      <div
        className="text-on-image text-2xl italic text-[var(--color-text-primary)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {siteConfig.userName ? `Bonjour ${siteConfig.userName}` : 'Bonjour'}
      </div>
      <div className="flex gap-2 items-center">
        <Weather />
        <Clock />
        <Link
          href="/config"
          aria-label="Configuration"
          className="surface-glass-soft inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <Settings size={16} aria-hidden />
        </Link>
      </div>
    </header>
  )
}
