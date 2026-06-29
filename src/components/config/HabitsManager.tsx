'use client'
import { useRef, useState, useTransition } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TileIcon } from '../ui/TileIcon'

export type HabitItem = {
  id: number
  name: string
  icon: string | null
  active: boolean
}

export function HabitsManager({ initial }: { initial: HabitItem[] }) {
  const [habits, setHabits] = useState(initial)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [, startTransition] = useTransition()

  function add() {
    const name = newName.trim()
    if (!name) return
    const icon = newIcon.trim() || null
    setNewName(''); setNewIcon('')
    startTransition(async () => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon }),
      })
      if (res.ok) {
        const created: HabitItem = await res.json()
        setHabits(prev => [...prev, created])
      }
    })
  }

  // Icône au moment où l'édition commence (focus) : référence pour
  // détecter un vrai changement au blur et restaurer en cas d'erreur API.
  const iconBeforeEdit = useRef<string | null>(null)

  function updateIconLocal(id: number, icon: string) {
    setHabits(prev => prev.map(x => x.id === id ? { ...x, icon: icon || null } : x))
  }

  function saveIcon(h: HabitItem) {
    const before = iconBeforeEdit.current
    if ((h.icon ?? '') === (before ?? '')) return
    startTransition(async () => {
      const res = await fetch(`/api/habits/${h.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon: h.icon }),
      })
      if (!res.ok) setHabits(prev => prev.map(x => x.id === h.id ? { ...x, icon: before || null } : x))
    })
  }

  function toggleActive(h: HabitItem) {
    setHabits(prev => prev.map(x => x.id === h.id ? { ...x, active: !h.active } : x))
    startTransition(async () => {
      const res = await fetch(`/api/habits/${h.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !h.active }),
      })
      if (!res.ok) setHabits(prev => prev.map(x => x.id === h.id ? { ...x, active: h.active } : x))
    })
  }

  function move(id: number, direction: 'up' | 'down') {
    const idx = habits.findIndex(h => h.id === id)
    if (idx < 0) return
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= habits.length) return

    // Optimistic swap in array order
    const next = [...habits]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    setHabits(next)

    startTransition(async () => {
      const res = await fetch(`/api/habits/${id}/move-${direction}`, { method: 'POST' })
      if (!res.ok) setHabits(habits)
    })
  }

  function remove(id: number) {
    const snapshot = habits
    setHabits(prev => prev.filter(x => x.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' })
      if (!res.ok) setHabits(snapshot)
    })
  }

  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-tertiary)] rounded-[var(--radius-lg)] p-4 px-5">
      <ul className="flex flex-col gap-2.5 mb-4">
        {habits.map((h, i) => (
          <li key={h.id} className="flex gap-2.5 items-center text-sm group">
            <span className="text-[var(--color-text-secondary)] w-5 flex justify-center">
              {h.icon ? <TileIcon icon={h.icon} size={15} /> : '·'}
            </span>
            <input
              type="text"
              value={h.icon ?? ''}
              onFocus={() => { iconBeforeEdit.current = h.icon ?? '' }}
              onChange={e => updateIconLocal(h.id, e.target.value)}
              onBlur={() => saveIcon(h)}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder="icône"
              aria-label={`Icône de ${h.name}`}
              className="w-32 bg-transparent border border-transparent hover:border-[var(--color-border-secondary)] focus:border-[var(--color-text-secondary)] focus:bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] px-2 py-1 text-xs outline-none text-[var(--color-text-secondary)]"
            />
            <span className={`flex-1 ${h.active ? '' : 'line-through text-[var(--color-text-tertiary)]'}`}>{h.name}</span>
            <span className="flex gap-1">
              <button
                onClick={() => move(h.id, 'up')}
                disabled={i === 0}
                aria-label="Monter"
                className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => move(h.id, 'down')}
                disabled={i === habits.length - 1}
                aria-label="Descendre"
                className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={16} />
              </button>
            </span>
            <button
              onClick={() => toggleActive(h)}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              {h.active ? 'Désactiver' : 'Réactiver'}
            </button>
            <button
              onClick={() => remove(h.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-tertiary)] hover:text-[var(--color-text-danger)] text-base"
              aria-label="Supprimer"
            >
              ×
            </button>
          </li>
        ))}
        {habits.length === 0 && (
          <li className="text-sm text-[var(--color-text-tertiary)]">Aucune habitude.</li>
        )}
      </ul>
      <div className="flex gap-2.5 items-center">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Nouvelle habitude (ex. Deep work)"
          className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]"
        />
        <input
          type="text"
          value={newIcon}
          onChange={e => setNewIcon(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Icône Lucide (optionnel)"
          className="w-44 bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-[var(--radius-md)] px-3 py-2 text-sm outline-none focus:border-[var(--color-text-secondary)]"
        />
        <button
          onClick={add}
          className="text-sm px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-bg-info)] text-[var(--color-text-info)]"
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}
