'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { TileIcon } from '../ui/TileIcon'
import { emitDeepWorkSync, onDeepWorkSync } from '@/lib/deep-work-sync'

export type HabitRow = { id: number; name: string; icon: string | null }

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Toutes les habitudes (actives) ont-elles leur coche pour ce jour ? */
function allCheckedForDay(habits: HabitRow[], checks: Set<string>, day: string) {
  return habits.length > 0 && habits.every(h => checks.has(`${h.id}:${day}`))
}

// Palette tirée des accents sémantiques de l'app (info bleu = la coche d'habitude,
// success vert = accompli, warning orange ≈ branding papaya, danger corail) plutôt
// qu'un arc-en-ciel générique → confettis cohérents avec la charte, lisibles en
// thème clair comme sombre.
const CONFETTI_COLORS = ['#4C86F0', '#35C08A', '#FF9F45', '#F26D6D']

// Cannon réutilisé, SANS Web Worker : le worker par défaut de canvas-confetti est
// créé depuis un blob: que la CSP de l'app bloque (next.config.ts n'a pas de
// worker-src → fallback sur script-src, sans blob:). Rendu main-thread, suffisant
// pour un effet ponctuel.
let confettiCannon: import('canvas-confetti').CreateTypes | null = null
async function getConfettiCannon() {
  if (!confettiCannon) {
    const { default: confetti } = await import('canvas-confetti')
    confettiCannon = confetti.create(undefined, { useWorker: false, resize: true })
  }
  return confettiCannon
}

async function celebrate() {
  const cannon = await getConfettiCannon()
  // Éclatement « réaliste » multi-couches (recette canvas-confetti) : plusieurs
  // salves aux spread / vélocité / scalar variés pour un rendu naturel et premium
  // plutôt qu'une salve unique et plate. disableForReducedMotion géré côté lib.
  const burst = (ratio: number, opts: import('canvas-confetti').Options) =>
    cannon({
      origin: { y: 0.7 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
      ...opts,
      particleCount: Math.floor(160 * ratio),
    })
  burst(0.25, { spread: 26, startVelocity: 55 })
  burst(0.2, { spread: 60 })
  burst(0.35, { spread: 100, decay: 0.91, scalar: 0.9 })
  burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  burst(0.1, { spread: 120, startVelocity: 45 })
}

export function HabitsGrid({ habits, days, today, initialChecks, confettiEnabled }: {
  habits: HabitRow[]
  days: string[]           // 7 dates ISO, lundi → dimanche
  today: string            // date ISO du jour (Europe/Paris)
  initialChecks: string[]  // clés "habitId:day"
  confettiEnabled: boolean // confettis à la complétion du jour
}) {
  const [checks, setChecks] = useState(() => new Set(initialChecks))
  const [, startTransition] = useTransition()
  const deepWorkHabit = habits.find(h => h.name.toLowerCase() === 'deep work')

  // Miroir de `checks` pour lire l'état frais dans le handler deep-work (dont le
  // closure d'effet est figé), sans re-souscrire à chaque coche.
  const checksRef = useRef(checks)
  useEffect(() => { checksRef.current = checks }, [checks])

  useEffect(() => {
    if (!deepWorkHabit) return
    return onDeepWorkSync(detail => {
      if (detail.source === 'grid') return
      const key = `${deepWorkHabit.id}:${detail.day}`
      const prev = checksRef.current
      if (prev.has(key) === detail.checked) return
      const next = new Set(prev)
      if (detail.checked) next.add(key); else next.delete(key)
      setChecks(next)
      // Deep Work complété depuis la bannière (hors grille) : confettis si c'est
      // la dernière habitude du jour. Hors du updater → pas de double-fire.
      if (
        confettiEnabled && detail.checked && detail.day === today &&
        allCheckedForDay(habits, next, today)
      ) celebrate()
    })
  }, [deepWorkHabit, confettiEnabled, habits, today])

  function toggle(habitId: number, day: string) {
    const key = `${habitId}:${day}`
    const wasChecked = checks.has(key)
    const checkedAfter = !wasChecked
    // Ce clic complète-t-il toutes les habitudes du jour ? (sur l'état d'avant toggle)
    const completesToday =
      confettiEnabled && day === today && checkedAfter &&
      allCheckedForDay(habits, new Set(checks).add(`${habitId}:${today}`), today)
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
      } else {
        const result = await res.json()
        if (deepWorkHabit && habitId === deepWorkHabit.id) {
          emitDeepWorkSync({ day, checked: result.checked, source: 'grid' })
        }
        // Recaler l'état local si le serveur a renvoyé quelque chose de différent
        if (result.checked !== checkedAfter) {
          setChecks(prev => {
            const next = new Set(prev)
            if (result.checked) next.add(key); else next.delete(key)
            return next
          })
        }
        // Dernier clic qui complète le jour (confirmé serveur) → confettis.
        if (completesToday && result.checked) celebrate()
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
