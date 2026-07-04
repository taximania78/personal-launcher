import type { Todo } from '@/lib/queries/todos'
import type { DayJournal } from '@/lib/queries/journal'

export type FocusBannerState =
  | { kind: 'active'; text: string; why: string | null; deepWork: boolean }
  | { kind: 'done'; text: string; why: string | null; deepWork: boolean }
  | { kind: 'unset'; deepWork: boolean }

export function resolveFocusBannerState(
  todo: Todo | null,
  journal: DayJournal | null,
): FocusBannerState {
  const deepWork = journal?.deep_work === true
  if (!todo) return { kind: 'unset', deepWork }
  return { kind: todo.done ? 'done' : 'active', text: todo.text, why: journal?.why ?? null, deepWork }
}
