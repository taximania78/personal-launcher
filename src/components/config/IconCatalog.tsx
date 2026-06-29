'use client'
import { useMemo, useRef, useState } from 'react'
import { icons, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { ALIASES } from '@/components/ui/TileIcon'

export function IconCatalog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lucideNames = useMemo(() => Object.keys(icons) as (keyof typeof icons)[], [])
  const q = query.trim().toLowerCase()
  const aliasEntries = Object.entries(ALIASES).filter(([name]) => name.includes(q))
  const lucideFiltered = lucideNames.filter(n => n.toLowerCase().includes(q))

  function copy(name: string) {
    navigator.clipboard?.writeText(name).catch(() => {})
    setCopied(name)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-4 px-5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
        Dictionnaire des icônes
        <span className="text-xs text-[var(--color-text-tertiary)]">
          (clic sur une icône → nom copié)
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 grid gap-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher (calendar, tv, shield…)"
              className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)] w-full max-w-xs"
            />
            {copied && (
              <span className="flex items-center gap-1 text-sm text-[var(--color-text-success)]">
                <Check size={14} aria-hidden /> Copié : {copied}
              </span>
            )}
          </div>

          {aliasEntries.length > 0 && (
            <IconGroup title="Alias homelab">
              {aliasEntries.map(([name, Comp]) => (
                <IconCell key={`alias-${name}`} name={name} onCopy={copy} copied={copied === name}>
                  <Comp size={20} aria-hidden />
                </IconCell>
              ))}
            </IconGroup>
          )}

          {lucideFiltered.length > 0 && (
            <IconGroup title={`Lucide (${lucideFiltered.length})`}>
              {lucideFiltered.map(name => {
                const Comp = icons[name]
                return (
                  <IconCell key={name} name={name} onCopy={copy} copied={copied === name}>
                    <Comp size={20} aria-hidden />
                  </IconCell>
                )
              })}
            </IconGroup>
          )}

          {aliasEntries.length === 0 && lucideFiltered.length === 0 && (
            <div className="text-sm text-[var(--color-text-tertiary)]">Aucune icône trouvée.</div>
          )}
        </div>
      )}
    </div>
  )
}

function IconGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">{title}</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
        {children}
      </div>
    </div>
  )
}

function IconCell({ name, copied, onCopy, children }: {
  name: string
  copied: boolean
  onCopy: (name: string) => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={() => onCopy(name)}
      title={name}
      className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-[var(--radius-md)] border text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-info)] hover:text-[var(--color-text-primary)] transition-colors ${
        copied ? 'border-[var(--color-text-success)]' : 'border-transparent'
      }`}
    >
      {children}
      <span className="text-[11px] leading-tight max-w-full truncate">{name}</span>
    </button>
  )
}
