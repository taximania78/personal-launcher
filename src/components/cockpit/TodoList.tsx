'use client'
import { useState, useTransition } from 'react'

export type TodoRow = {
  id: number
  text: string
  done: boolean
  is_focus: boolean
  overdue: boolean
}

type Tab = 'today' | 'tomorrow'

function ItemRow({
  todo, onToggle, onDelete, warn = false,
}: {
  todo: TodoRow
  onToggle?: (id: number) => void
  onDelete: (id: number) => void
  warn?: boolean
}) {
  return (
    <li className="flex gap-2.5 items-center text-sm group">
      {onToggle ? (
        <button
          onClick={() => onToggle(todo.id)}
          className={`text-base ${todo.done ? 'text-[var(--color-text-success)]' : warn ? 'text-[var(--color-text-warning)]' : 'text-[var(--color-text-tertiary)]'}`}
          aria-label={todo.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
        >
          {todo.done ? '☑' : '☐'}
        </button>
      ) : (
        <span className="text-[var(--color-text-tertiary)] text-base">•</span>
      )}
      <span className={`flex-1 ${todo.done ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}>
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-tertiary)] hover:text-[var(--color-text-danger)] text-base"
        aria-label="Supprimer"
      >
        ×
      </button>
    </li>
  )
}

function AddRow({
  value, onChange, onAdd,
}: {
  value: string
  onChange: (v: string) => void
  onAdd: () => void
}) {
  return (
    <li className="flex gap-2.5 items-center text-sm">
      <span className="text-[var(--color-text-tertiary)] text-base">＋</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onAdd() }}
        placeholder="Nouvelle tâche…"
        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[var(--color-text-tertiary)]"
      />
    </li>
  )
}

export function TodoList({ today, tomorrow }: { today: TodoRow[]; tomorrow: TodoRow[] }) {
  const [tab, setTab] = useState<Tab>('today')
  const [todayTodos, setTodayTodos] = useState(today)
  const [tomorrowTodos, setTomorrowTodos] = useState(tomorrow)
  const [, startTransition] = useTransition()
  const [newText, setNewText] = useState('')

  function toggle(id: number) {
    const previous = todayTodos.find(x => x.id === id)
    if (!previous) return
    const previousDone = previous.done
    const previousOverdue = previous.overdue
    // Une tâche cochée n'est jamais "en retard" ; on relève le drapeau localement.
    setTodayTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, overdue: false } : t))
    startTransition(async () => {
      const res = await fetch(`/api/todo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !previousDone }),
      })
      if (!res.ok) {
        setTodayTodos(prev => prev.map(x => x.id === id ? { ...x, done: previousDone, overdue: previousOverdue } : x))
      }
    })
  }

  function remove(id: number) {
    const inToday = todayTodos.some(t => t.id === id)
    const setList = inToday ? setTodayTodos : setTomorrowTodos
    const snapshot = inToday ? todayTodos : tomorrowTodos
    setList(prev => prev.filter(t => t.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/todo/${id}`, { method: 'DELETE' })
      if (!res.ok) setList(snapshot)
    })
  }

  function addTodo() {
    const text = newText.trim()
    if (!text) return
    setNewText('')
    const when: Tab = tab
    const setList = when === 'today' ? setTodayTodos : setTomorrowTodos
    const tempId = -Date.now()
    const optimistic: TodoRow = { id: tempId, text, done: false, is_focus: false, overdue: false }
    setList(prev => [...prev, optimistic])
    startTransition(async () => {
      const res = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, when }),
      })
      if (!res.ok) {
        setList(prev => prev.filter(t => t.id !== tempId))
        return
      }
      const created = await res.json()
      setList(prev => prev.map(t => t.id === tempId
        ? { id: created.id, text: created.text, done: created.done, is_focus: created.is_focus ?? false, overdue: false }
        : t))
    })
  }

  const overdue = todayTodos.filter(t => t.overdue)
  const todayOnly = todayTodos.filter(t => !t.overdue)
  const completed = todayTodos.filter(t => t.done).length

  return (
    <>
      <div className="flex gap-3 mb-3 text-xs">
        <button
          onClick={() => setTab('today')}
          className={tab === 'today' ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}
        >
          Aujourd&apos;hui
        </button>
        <button
          onClick={() => setTab('tomorrow')}
          className={tab === 'tomorrow' ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-tertiary)]'}
        >
          Demain
        </button>
      </div>

      {tab === 'today' ? (
        <>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-2 -mt-1">{completed} / {todayTodos.length}</div>
          {overdue.length > 0 && (
            <div className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-bg-warning)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-warning)]">En retard</span>
                <span className="text-[11px] font-semibold leading-tight text-[var(--color-text-warning)] rounded-full bg-[var(--color-bg-primary)] px-1.5">{overdue.length}</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {overdue.map(t => (
                  <ItemRow key={t.id} todo={t} onToggle={toggle} onDelete={remove} warn />
                ))}
              </ul>
            </div>
          )}
          {overdue.length > 0 && todayOnly.length > 0 && (
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Aujourd&apos;hui</div>
          )}
          <ul className="flex flex-col gap-2.5">
            {todayOnly.map(t => (
              <ItemRow key={t.id} todo={t} onToggle={toggle} onDelete={remove} />
            ))}
            <AddRow value={newText} onChange={setNewText} onAdd={addTodo} />
          </ul>
        </>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {tomorrowTodos.map(t => (
            <ItemRow key={t.id} todo={t} onDelete={remove} />
          ))}
          <AddRow value={newText} onChange={setNewText} onAdd={addTodo} />
        </ul>
      )}
    </>
  )
}
