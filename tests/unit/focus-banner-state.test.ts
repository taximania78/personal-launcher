import { describe, it, expect } from 'vitest'
import { resolveFocusBannerState } from '@/components/cockpit/focus-banner-state'
import type { Todo } from '@/lib/queries/todos'
import type { DayJournal } from '@/lib/queries/journal'

function todo(partial: Partial<Todo>): Todo {
  return {
    id: 1, text: 'Focus', done: false, position: 0, is_focus: true,
    created_at: new Date(), updated_at: new Date(), postponed_count: 0, ...partial,
  }
}
function journal(partial: Partial<DayJournal>): DayJournal {
  return {
    day: '2026-07-04', focus_todo_id: 1, focus_text: 'Focus', why: null,
    focus_outcome: 'not_set', report_reason: null, report_comment: null,
    deep_work: null, shutdown_at: null, shutdown_mode: null, ...partial,
  }
}

describe('resolveFocusBannerState', () => {
  it('absence de focus → unset (null-safe)', () => {
    expect(resolveFocusBannerState(null, null)).toEqual({ kind: 'unset', deepWork: false })
  })

  it('focus non fait → active, avec texte et why du journal', () => {
    const s = resolveFocusBannerState(todo({ text: 'Livrer X' }), journal({ why: 'Deadline' }))
    expect(s).toEqual({ kind: 'active', text: 'Livrer X', why: 'Deadline', deepWork: false })
  })

  it('focus fait → done', () => {
    expect(resolveFocusBannerState(todo({ done: true }), null).kind).toBe('done')
  })

  it('deep_work true → deepWork, y compris sans focus', () => {
    expect(resolveFocusBannerState(todo({}), journal({ deep_work: true })).deepWork).toBe(true)
    expect(resolveFocusBannerState(null, journal({ deep_work: true }))).toEqual({ kind: 'unset', deepWork: true })
  })
})
