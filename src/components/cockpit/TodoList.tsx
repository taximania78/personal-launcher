'use client'
import { useState, useTransition } from 'react'

export type TodoRow = {
  id: number
  text: string
  done: boolean
  is_focus: boolean
  overdue: boolean
  postponed_count: number
}

export type UpcomingGroup = {
  date: string
  label: string
  todos: { id: number; text: string; postponed_count: number }[]
}

type Tab = 'today' | 'tomorrow'

function PostponedBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      title={`Reportée ${count} fois`}
      className="text-[11px] font-semibold leading-tight text-[var(--color-text-warning)] rounded-full bg-[var(--color-bg-warning)] px-1.5"
    >
      ×{count}
    </span>
  )
}

function ItemRow({
  todo, warn = false, editing, draft,
  onToggle, onDelete, onStartEdit, onDraftChange, onSaveEdit, onCancelEdit, onStartReport,
}: {
  todo: TodoRow
  warn?: boolean
  editing: boolean
  draft: string
  onToggle?: (id: number) => void
  onDelete: (id: number) => void
  onStartEdit: (todo: TodoRow) => void
  onDraftChange: (v: string) => void
  onSaveEdit: (id: number) => void
  onCancelEdit: () => void
  onStartReport: (id: number) => void
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
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => onDraftChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSaveEdit(todo.id)
            if (e.key === 'Escape') onCancelEdit()
          }}
          onBlur={() => onSaveEdit(todo.id)}
          className="flex-1 bg-transparent border-b border-[var(--color-border-secondary)] outline-none text-sm"
        />
      ) : (
        <span
          onDoubleClick={() => onStartEdit(todo)}
          title="Double-clic pour éditer"
          className={`flex-1 cursor-text ${todo.done ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}
        >
          {todo.text}
        </span>
      )}
      <PostponedBadge count={todo.postponed_count} />
      <button
        onClick={() => onStartReport(todo.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-tertiary)] hover:text-[var(--color-text-warning)] text-base"
        aria-label="Reporter"
        title="Reporter"
      >
        →
      </button>
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

function ReportRow({
  minDate, onTomorrow, onDate, onCancel,
}: {
  minDate: string
  onTomorrow: () => void
  onDate: (date: string) => void
  onCancel: () => void
}) {
  return (
    <li className="flex gap-2 items-center text-xs pl-6 text-[var(--color-text-secondary)]">
      <span>Reporter :</span>
      <button
        onClick={onTomorrow}
        className="px-2 py-0.5 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
      >
        demain
      </button>
      <input
        type="date"
        min={minDate}
        onChange={e => { if (e.target.value) onDate(e.target.value) }}
        className="bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] px-1.5 py-0.5 text-xs outline-none"
        aria-label="Reporter à une date"
      />
      <button onClick={onCancel} className="hover:text-[var(--color-text-primary)]">annuler</button>
    </li>
  )
}

function AddRow({
  value, dateValue, minDate, onChange, onDateChange, onAdd,
}: {
  value: string
  dateValue: string
  minDate: string
  onChange: (v: string) => void
  onDateChange: (v: string) => void
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
      <input
        type="date"
        value={dateValue}
        min={minDate}
        onChange={e => onDateChange(e.target.value)}
        title="Planifier à une date (vide = onglet courant)"
        aria-label="Date de planification"
        className="bg-transparent text-xs text-[var(--color-text-tertiary)] outline-none w-28"
      />
    </li>
  )
}

export function TodoList({
  today, tomorrow, upcoming, todayIso, tomorrowIso,
}: {
  today: TodoRow[]
  tomorrow: TodoRow[]
  upcoming: UpcomingGroup[]
  todayIso: string
  tomorrowIso: string
}) {
  const [tab, setTab] = useState<Tab>('today')
  const [todayTodos, setTodayTodos] = useState(today)
  const [tomorrowTodos, setTomorrowTodos] = useState(tomorrow)
  const [isPending, startTransition] = useTransition()
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [reportingId, setReportingId] = useState<number | null>(null)

  function toggle(id: number) {
    if (isPending) return
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
    if (isPending) return
    const inToday = todayTodos.some(t => t.id === id)
    const setList = inToday ? setTodayTodos : setTomorrowTodos
    const snapshot = inToday ? todayTodos : tomorrowTodos
    setList(prev => prev.filter(t => t.id !== id))
    startTransition(async () => {
      const res = await fetch(`/api/todo/${id}`, { method: 'DELETE' })
      if (!res.ok) setList(snapshot)
    })
  }

  function startEdit(todo: TodoRow) {
    setEditingId(todo.id)
    setDraft(todo.text)
  }

  function saveEdit(id: number) {
    if (isPending) return
    if (editingId !== id) return
    setEditingId(null)
    const text = draft.trim()
    const inToday = todayTodos.some(t => t.id === id)
    const setList = inToday ? setTodayTodos : setTomorrowTodos
    const previous = (inToday ? todayTodos : tomorrowTodos).find(t => t.id === id)
    if (!previous || !text || text === previous.text) return
    setList(prev => prev.map(t => t.id === id ? { ...t, text } : t))
    startTransition(async () => {
      const res = await fetch(`/api/todo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) setList(prev => prev.map(t => t.id === id ? { ...t, text: previous.text } : t))
    })
  }

  function report(id: number, date: string) {
    if (isPending) return
    setReportingId(null)
    const inToday = todayTodos.some(t => t.id === id)
    const item = (inToday ? todayTodos : tomorrowTodos).find(t => t.id === id)
    if (!item) return
    const snapshotToday = todayTodos
    const snapshotTomorrow = tomorrowTodos
    ;(inToday ? setTodayTodos : setTomorrowTodos)(prev => prev.filter(t => t.id !== id))
    if (date === tomorrowIso && inToday) {
      setTomorrowTodos(prev => [...prev, { ...item, overdue: false, postponed_count: item.postponed_count + 1 }])
    }
    startTransition(async () => {
      const res = await fetch(`/api/todo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_for: date }),
      })
      if (!res.ok) {
        setTodayTodos(snapshotToday)
        setTomorrowTodos(snapshotTomorrow)
      }
    })
  }

  function addTodo() {
    if (isPending) return
    const text = newText.trim()
    if (!text) return
    const scheduledFor = newDate || null
    setNewText('')
    setNewDate('')
    const target: Tab | 'later' =
      scheduledFor === null ? tab
        : scheduledFor === todayIso ? 'today'
          : scheduledFor === tomorrowIso ? 'tomorrow'
            : 'later'
    const body = scheduledFor === null ? { text, when: tab } : { text, scheduled_for: scheduledFor }
    if (target === 'later') {
      // Datée au-delà de demain : apparaîtra dans « À venir » au prochain chargement.
      startTransition(async () => {
        await fetch('/api/todo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      })
      return
    }
    const setList = target === 'today' ? setTodayTodos : setTomorrowTodos
    const tempId = -Date.now()
    const optimistic: TodoRow = { id: tempId, text, done: false, is_focus: false, overdue: false, postponed_count: 0 }
    setList(prev => [...prev, optimistic])
    startTransition(async () => {
      const res = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setList(prev => prev.filter(t => t.id !== tempId))
        return
      }
      const created = await res.json()
      setList(prev => prev.map(t => t.id === tempId
        ? {
            id: created.id, text: created.text, done: created.done, is_focus: false,
            overdue: false, postponed_count: created.postponed_count ?? 0,
          }
        : t))
    })
  }

  function rows(list: TodoRow[], opts: { withToggle: boolean; warn?: boolean }) {
    return list.flatMap(t => {
      const row = (
        <ItemRow
          key={t.id}
          todo={t}
          warn={opts.warn}
          editing={editingId === t.id}
          draft={draft}
          onToggle={opts.withToggle ? toggle : undefined}
          onDelete={remove}
          onStartEdit={startEdit}
          onDraftChange={setDraft}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId(null)}
          onStartReport={setReportingId}
        />
      )
      if (reportingId !== t.id) return [row]
      return [row, (
        <ReportRow
          key={`report-${t.id}`}
          minDate={tomorrowIso}
          onTomorrow={() => report(t.id, tomorrowIso)}
          onDate={d => report(t.id, d)}
          onCancel={() => setReportingId(null)}
        />
      )]
    })
  }

  const overdue = todayTodos.filter(t => t.overdue)
  const todayOnly = todayTodos.filter(t => !t.overdue)
  const completed = todayTodos.filter(t => t.done).length
  const upcomingCount = upcoming.reduce((n, g) => n + g.todos.length, 0)

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
                {rows(overdue, { withToggle: true, warn: true })}
              </ul>
            </div>
          )}
          {overdue.length > 0 && todayOnly.length > 0 && (
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Aujourd&apos;hui</div>
          )}
          <ul className="flex flex-col gap-2.5">
            {rows(todayOnly, { withToggle: true })}
            <AddRow
              value={newText} dateValue={newDate} minDate={todayIso}
              onChange={setNewText} onDateChange={setNewDate} onAdd={addTodo}
            />
          </ul>
        </>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows(tomorrowTodos, { withToggle: false })}
          <AddRow
            value={newText} dateValue={newDate} minDate={todayIso}
            onChange={setNewText} onDateChange={setNewDate} onAdd={addTodo}
          />
        </ul>
      )}

      {upcomingCount > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-[var(--color-text-tertiary)] cursor-pointer select-none">
            À venir (7 j) · {upcomingCount}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {upcoming.map(g => (
              <div key={g.date}>
                <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">{g.label}</div>
                <ul className="flex flex-col gap-1.5">
                  {g.todos.map(t => (
                    <li key={t.id} className="flex gap-2.5 items-center text-sm text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-text-tertiary)] text-base">•</span>
                      <span className="flex-1">{t.text}</span>
                      <PostponedBadge count={t.postponed_count} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  )
}
