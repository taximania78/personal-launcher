'use client'
import { useState, useTransition } from 'react'
import { TileIcon } from '@/components/ui/TileIcon'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'

export type TileRow = {
  id: number
  name: string
  icon: string
  href: string
  position: number
}

type DraftTile = { name: string, icon: string, href: string }

const EMPTY_DRAFT: DraftTile = { name: '', icon: '', href: '' }

export function TilesManager({ initial }: { initial: TileRow[] }) {
  const [tiles, setTiles] = useState(initial)
  const [draft, setDraft] = useState<DraftTile>(EMPTY_DRAFT)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  function updateLocal(id: number, patch: Partial<TileRow>) {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function saveTile(t: TileRow) {
    const snapshot = initial.find(i => i.id === t.id) ?? t
    setSavingId(t.id)
    startTransition(async () => {
      const res = await fetch(`/api/launcher/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t.name, icon: t.icon, href: t.href }),
      })
      setSavingId(null)
      if (!res.ok) {
        // Rollback
        setTiles(prev => prev.map(x => x.id === t.id ? { ...snapshot } : x))
      }
    })
  }

  function deleteTile(id: number) {
    const snapshot = tiles
    setTiles(prev => prev.filter(t => t.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/launcher/${id}`, { method: 'DELETE' })
      if (!res.ok) setTiles(snapshot)
    })
  }

  function move(id: number, direction: 'up' | 'down') {
    const idx = tiles.findIndex(t => t.id === id)
    if (idx < 0) return
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= tiles.length) return

    // Optimistic swap in array order
    const next = [...tiles]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    setTiles(next)

    startTransition(async () => {
      const res = await fetch(`/api/launcher/${id}/move-${direction}`, { method: 'POST' })
      if (!res.ok) {
        // Rollback
        setTiles(tiles)
      }
    })
  }

  function createTile() {
    if (!draft.name.trim() || !draft.icon.trim() || !draft.href.trim()) return
    const text = { name: draft.name.trim(), icon: draft.icon.trim(), href: draft.href.trim() }
    setDraft(EMPTY_DRAFT)
    // Optimistic add with temp id
    const tempId = -Date.now()
    const optimistic: TileRow = { id: tempId, position: tiles.length, ...text }
    setTiles(prev => [...prev, optimistic])

    startTransition(async () => {
      const res = await fetch('/api/launcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(text),
      })
      if (!res.ok) {
        setTiles(prev => prev.filter(t => t.id !== tempId))
        return
      }
      const created = await res.json()
      setTiles(prev => prev.map(t => t.id === tempId ? { ...created, position: created.position ?? optimistic.position } : t))
    })
  }

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border-tertiary)] text-xs text-[var(--color-text-tertiary)]">
            <th className="text-left px-3 py-2 w-12">Icône</th>
            <th className="text-left px-3 py-2">Nom</th>
            <th className="text-left px-3 py-2">Icône (texte)</th>
            <th className="text-left px-3 py-2">URL</th>
            <th className="px-3 py-2 w-28">Ordre</th>
            <th className="px-3 py-2 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tiles.map((t, i) => (
            <tr key={t.id} className="border-b border-[var(--color-border-tertiary)] last:border-b-0">
              <td className="px-3 py-2">
                <span className="text-[var(--color-text-secondary)]"><TileIcon icon={t.icon} size={18} /></span>
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={t.name}
                  onChange={e => updateLocal(t.id, { name: e.target.value })}
                  onBlur={() => saveTile(t)}
                  className="w-full bg-transparent border-none outline-none focus:bg-[var(--color-bg-secondary)] rounded px-1.5 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={t.icon}
                  onChange={e => updateLocal(t.id, { icon: e.target.value })}
                  onBlur={() => saveTile(t)}
                  className="w-full bg-transparent border-none outline-none focus:bg-[var(--color-bg-secondary)] rounded px-1.5 py-1 font-mono text-xs"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={t.href}
                  onChange={e => updateLocal(t.id, { href: e.target.value })}
                  onBlur={() => saveTile(t)}
                  className="w-full bg-transparent border-none outline-none focus:bg-[var(--color-bg-secondary)] rounded px-1.5 py-1 font-mono text-xs"
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1 justify-center">
                  <button
                    onClick={() => move(t.id, 'up')}
                    disabled={i === 0}
                    aria-label="Monter"
                    className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => move(t.id, 'down')}
                    disabled={i === tiles.length - 1}
                    aria-label="Descendre"
                    className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => deleteTile(t.id)}
                  aria-label="Supprimer"
                  className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-danger)]"
                >
                  <Trash2 size={16} />
                </button>
                {savingId === t.id && <span className="text-xs text-[var(--color-text-tertiary)] ml-1">…</span>}
              </td>
            </tr>
          ))}

          <tr className="bg-[var(--color-bg-secondary)]">
            <td className="px-3 py-2">
              <span className="text-[var(--color-text-tertiary)]"><Plus size={18} aria-hidden /></span>
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Nom"
                className="w-full bg-transparent border-none outline-none px-1.5 py-1"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={draft.icon}
                onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))}
                placeholder="Cloud, Server, 🚀…"
                className="w-full bg-transparent border-none outline-none px-1.5 py-1 font-mono text-xs"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={draft.href}
                onChange={e => setDraft(d => ({ ...d, href: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') createTile() }}
                placeholder="https://service.example.com"
                className="w-full bg-transparent border-none outline-none px-1.5 py-1 font-mono text-xs"
              />
            </td>
            <td></td>
            <td className="px-3 py-2 text-center">
              <button
                onClick={createTile}
                disabled={!draft.name.trim() || !draft.icon.trim() || !draft.href.trim()}
                className="text-sm px-2 py-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-bg-info)]"
              >
                Ajouter
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
