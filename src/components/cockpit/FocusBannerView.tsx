'use client'
import { useState, useTransition } from 'react'
import { Target } from 'lucide-react'
import type { FocusBannerState } from './focus-banner-state'

export function FocusBannerView({
  state: initial, todoId,
}: {
  state: FocusBannerState
  todoId: number | null
}) {
  const [state, setState] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function toggleDone() {
    if (isPending || state.kind === 'unset' || todoId === null) return
    const previous = state
    // Pas de spread de l'union discriminée : TS ne réassignerait pas le résultat à FocusBannerState.
    const nextState: FocusBannerState = state.kind === 'done'
      ? { kind: 'active', text: state.text, why: state.why, deepWork: state.deepWork }
      : { kind: 'done', text: state.text, why: state.why, deepWork: state.deepWork }
    setState(nextState)
    startTransition(async () => {
      const res = await fetch(`/api/todo/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: nextState.kind === 'done' }),
      })
      if (!res.ok) setState(previous)
    })
  }

  function toggleDeepWork() {
    if (isPending) return
    const previous = state
    const next = !state.deepWork
    setState(previous.kind === 'unset'
      ? { kind: 'unset', deepWork: next }
      : { ...previous, deepWork: next })
    startTransition(async () => {
      const res = await fetch('/api/journal/today', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deep_work: next }),
      })
      if (!res.ok) setState(previous)
    })
  }

  return (
    <div className="surface-glass-info rounded-[var(--radius-lg)] py-4 px-5 mb-5 flex items-center gap-3">
      <span aria-hidden className="text-[var(--color-text-info)]">
        <Target size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--color-text-primary)] uppercase tracking-wide">
          Focus unique du jour
        </div>
        {state.kind === 'unset' ? (
          <>
            <div
              className="text-lg text-[var(--color-text-tertiary)] italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Aucun focus défini
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Définis-le avec l&apos;agent</div>
          </>
        ) : (
          <>
            <div
              className={`text-lg italic ${state.kind === 'done'
                ? 'line-through text-[var(--color-text-tertiary)]'
                : 'text-[var(--color-text-primary)]'}`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {state.text}
            </div>
            {state.why && (
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Pourquoi ça compte : {state.why}
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleDeepWork}
          aria-pressed={state.deepWork}
          disabled={isPending}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${state.deepWork
            ? 'bg-[var(--color-bg-info)] text-[var(--color-text-info)] font-semibold'
            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'}`}
        >
          {state.deepWork ? 'Deep work ✓' : 'Deep work'}
        </button>
        {state.kind !== 'unset' && (
          <button
            onClick={toggleDone}
            disabled={isPending}
            aria-pressed={state.kind === 'done'}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${state.kind === 'done'
              ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-success)] font-semibold'
              : 'bg-[var(--color-bg-info)] text-[var(--color-text-info)] hover:font-semibold'}`}
          >
            {state.kind === 'done' ? '✓ Terminé' : 'Terminer'}
          </button>
        )}
      </div>
    </div>
  )
}
