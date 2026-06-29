import { describe, it, expect } from 'vitest'
import { TileIcon } from '@/components/ui/TileIcon'

// TileIcon returns a React element without rendering, so we can inspect the
// resolved `.type` directly in the node test environment (no DOM needed).
// A resolved Lucide icon yields a function/forwardRef component; the text
// fallback yields a plain 'span'.
function resolve(icon: string) {
  return TileIcon({ icon }) as { type: unknown, props: { children?: unknown } }
}

const isFallback = (icon: string) => resolve(icon).type === 'span'

describe('TileIcon', () => {
  // These are the icons seeded for the 11 default launcher tiles, stored as
  // Lucide component names (PascalCase). All must resolve to a real icon.
  const DEFAULT_TILE_ICONS = [
    'Server', 'Container', 'Cloud', 'Route', 'Workflow',
    'LineChart', 'ShieldCheck', 'BarChart3', 'GitBranch', 'KeyRound', 'Home',
  ]

  it.each(DEFAULT_TILE_ICONS)('resolves the default tile icon %s to a Lucide component', (icon) => {
    expect(isFallback(icon)).toBe(false)
  })

  it('resolves multi-word Lucide names (regression: LineChart/ShieldCheck/etc fell back to text)', () => {
    expect(isFallback('LineChart')).toBe(false)
    expect(isFallback('ShieldCheck')).toBe(false)
    expect(isFallback('GitBranch')).toBe(false)
    expect(isFallback('KeyRound')).toBe(false)
  })

  it('resolves hyphenated semantic aliases too', () => {
    expect(isFallback('line-chart')).toBe(false)
    expect(isFallback('git-branch')).toBe(false)
    expect(isFallback('home-assistant')).toBe(false)
  })

  it('is case- and separator-insensitive on aliases', () => {
    expect(isFallback('PROXMOX')).toBe(false)
    expect(isFallback('  n8n  ')).toBe(false)
  })

  it('resolves ANY Lucide icon by name, not just the curated aliases', () => {
    // None of these are in the alias map — they hit the full Lucide registry.
    expect(isFallback('Calendar')).toBe(false)
    expect(isFallback('Rss')).toBe(false)
    expect(isFallback('Tv')).toBe(false)
    expect(isFallback('Activity')).toBe(false)
  })

  it('resolves registry icons from kebab-case too', () => {
    expect(isFallback('hard-drive')).toBe(false) // -> HardDrive
    expect(isFallback('bar-chart-3')).toBe(false) // -> BarChart3
  })

  it('falls back to rendering the raw string for non-icons (e.g. emoji)', () => {
    const el = resolve('🚀')
    expect(el.type).toBe('span')
    expect(el.props.children).toBe('🚀')
  })
})
