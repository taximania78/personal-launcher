'use client'
import { useState, useTransition } from 'react'

export type WeekRow = { id: number; text: string; done: boolean }

export function WeekPriorities({ initial }: { initial: WeekRow[] }) {
  const [rows, setRows] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  function toggle(id: number) {
    if (isPending) return
    const previous = rows.find(r => r.id === id)
    if (!previous) return
    setRows(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r))
    startTransition(async () => {
      const res = await fetch(`/api/week-priorities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !previous.done }),
      })
      if (!res.ok) setRows(prev => prev.map(r => r.id === id ? { ...r, done: previous.done } : r))
    })
  }

  function remove(id: number) {
    if (isPending) return
    const snapshot = rows
    setRows(prev => prev.filter(r => r.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/week-priorities/${id}`, { method: 'DELETE' })
      if (!res.ok) setRows(snapshot)
    })
  }

  function saveEdit(id: number) {
    if (isPending) return
    if (editingId !== id) return
    setEditingId(null)
    const text = draft.trim()
    const previous = rows.find(r => r.id === id)
    if (!previous || !text || text === previous.text) return
    setRows(prev => prev.map(r => r.id === id ? { ...r, text } : r))
    startTransition(async () => {
      const res = await fetch(`/api/week-priorities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) setRows(prev => prev.map(r => r.id === id ? { ...r, text: previous.text } : r))
    })
  }

  function add() {
    if (isPending) return
    const text = newText.trim()
    if (!text || rows.length >= 3) return
    setNewText('')
    const tempId = -Date.now()
    setRows(prev => [...prev, { id: tempId, text, done: false }])
    startTransition(async () => {
      const res = await fetch('/api/week-priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        setRows(prev => prev.filter(r => r.id !== tempId))
        return
      }
      const created = await res.json()
      setRows(prev => prev.map(r => r.id === tempId
        ? { id: created.id, text: created.text, done: created.done }
        : r))
    })
  }

  return (
    <>
      {rows.length === 0 && (
        <p className="text-sm text-[var(--color-text-tertiary)] italic mb-2">
          Pas de cap cette semaine — revue dimanche 18h30.
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {rows.map(r => (
          <li key={r.id} className="flex gap-2.5 items-center text-sm group">
            <button
              onClick={() => toggle(r.id)}
              className={`text-base ${r.done ? 'text-[var(--color-text-success)]' : 'text-[var(--color-text-tertiary)]'}`}
              aria-label={r.done ? 'Marquer non atteinte' : 'Marquer atteinte'}
            >
              {r.done ? '☑' : '☐'}
            </button>
            {editingId === r.id ? (
              <input
                autoFocus
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEdit(r.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onBlur={() => saveEdit(r.id)}
                className="flex-1 bg-transparent border-b border-[var(--color-border-secondary)] outline-none text-sm"
              />
            ) : (
              <span
                onDoubleClick={() => { setEditingId(r.id); setDraft(r.text) }}
                title="Double-clic pour éditer"
                className={`flex-1 cursor-text ${r.done ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}
              >
                {r.text}
              </span>
            )}
            <button
              onClick={() => remove(r.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-tertiary)] hover:text-[var(--color-text-danger)] text-base"
              aria-label="Supprimer"
            >
              ×
            </button>
          </li>
        ))}
        {rows.length < 3 && (
          <li className="flex gap-2.5 items-center text-sm">
            <span className="text-[var(--color-text-tertiary)] text-base">＋</span>
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add() }}
              placeholder="Priorité de la semaine (3 max)…"
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[var(--color-text-tertiary)]"
            />
          </li>
        )}
      </ul>
    </>
  )
}
