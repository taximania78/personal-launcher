'use client'
import { useState, useTransition } from 'react'
import { TileIcon } from '../ui/TileIcon'

export type HabitRow = { id: number; name: string; icon: string | null }

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function HabitsGrid({ habits, days, today, initialChecks }: {
  habits: HabitRow[]
  days: string[]           // 7 dates ISO, lundi → dimanche
  today: string            // date ISO du jour (Europe/Paris)
  initialChecks: string[]  // clés "habitId:day"
}) {
  const [checks, setChecks] = useState(() => new Set(initialChecks))
  const [, startTransition] = useTransition()

  function toggle(habitId: number, day: string) {
    const key = `${habitId}:${day}`
    const wasChecked = checks.has(key)
    setChecks(prev => {
      const next = new Set(prev)
      if (wasChecked) next.delete(key); else next.add(key)
      return next
    })
    startTransition(async () => {
      const res = await fetch('/api/habits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, day }),
      })
      if (!res.ok) {
        // rollback
        setChecks(prev => {
          const next = new Set(prev)
          if (wasChecked) next.add(key); else next.delete(key)
          return next
        })
      }
    })
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) repeat(7, 1.75rem)' }}>
      {/* Ligne d'en-tête : initiales des jours */}
      <span />
      {days.map((day, i) => (
        <span
          key={day}
          className={`text-center text-xs ${day === today
            ? 'text-[var(--color-text-primary)] font-medium'
            : 'text-[var(--color-text-tertiary)]'}`}
        >
          {DAY_LABELS[i]}
        </span>
      ))}

      {habits.map(h => (
        <Row key={h.id} habit={h} days={days} today={today} checks={checks} onToggle={toggle} />
      ))}
    </div>
  )
}

function Row({ habit, days, today, checks, onToggle }: {
  habit: HabitRow
  days: string[]
  today: string
  checks: Set<string>
  onToggle: (habitId: number, day: string) => void
}) {
  return (
    <>
      <span className="flex items-center gap-2 text-sm truncate">
        {habit.icon && (
          <span className="text-[var(--color-text-secondary)]">
            <TileIcon icon={habit.icon} size={15} />
          </span>
        )}
        <span className="truncate">{habit.name}</span>
      </span>
      {days.map(day => {
        const checked = checks.has(`${habit.id}:${day}`)
        const future = day > today
        return (
          <button
            key={day}
            onClick={() => onToggle(habit.id, day)}
            disabled={future}
            aria-label={`${habit.name} — ${day}${checked ? ' (fait)' : ''}`}
            className={`h-6 w-6 justify-self-center rounded-[var(--radius-md)] border text-xs transition-colors ${
              checked
                ? 'bg-[var(--color-bg-info)] border-transparent text-[var(--color-text-info)]'
                : future
                  ? 'border-[var(--color-border-tertiary)] opacity-30 cursor-default'
                  : 'border-[var(--color-border-secondary)] hover:border-[var(--color-text-secondary)]'
            }`}
          >
            {checked ? '✓' : ''}
          </button>
        )
      })}
    </>
  )
}
