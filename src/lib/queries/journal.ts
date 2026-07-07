import { readerPool, writerPool } from '../db'
import { parisToday } from '../week'

export type DayJournal = {
  day: string
  focus_todo_id: number | null
  focus_text: string | null
  why: string | null
  focus_outcome: 'done' | 'reported' | 'expired' | 'not_set'
  report_reason: 'trop_gros' | 'imprevu' | 'evite' | 'plus_pertinent' | 'autre' | null
  report_comment: string | null
  deep_work: boolean | null
  shutdown_at: Date | null
  shutdown_mode: 'normal' | 'degrade' | null
}

export type DayJournalPatch = {
  focus_todo_id?: number | null
  focus_text?: string | null
  why?: string | null
  focus_outcome?: 'done' | 'reported' | 'expired' | 'not_set'
  report_reason?: 'trop_gros' | 'imprevu' | 'evite' | 'plus_pertinent' | 'autre' | null
  report_comment?: string | null
  deep_work?: boolean | null
  shutdown_at?: string | null
  shutdown_mode?: 'normal' | 'degrade' | null
}

// day en texte (to_char) : pg parserait un DATE en Date locale → dérive timezone.
const RETURN_COLS = `
  to_char(day, 'YYYY-MM-DD') AS day, focus_todo_id::int AS focus_todo_id, focus_text, why,
  focus_outcome, report_reason, report_comment, deep_work, shutdown_at, shutdown_mode
`

const JOURNAL_COLUMNS = [
  'focus_todo_id', 'focus_text', 'why', 'focus_outcome', 'report_reason',
  'report_comment', 'deep_work', 'shutdown_at', 'shutdown_mode',
] as const

export async function getDayJournal(date: string): Promise<DayJournal | null> {
  const r = await readerPool.query<DayJournal>(
    `SELECT ${RETURN_COLS} FROM day_journal WHERE day = $1::date`,
    [date],
  )
  return r.rows[0] ?? null
}

export async function upsertDayJournal(date: string, patch: DayJournalPatch): Promise<DayJournal> {
  const keys = JOURNAL_COLUMNS.filter((k) => patch[k] !== undefined)
  const cols = ['day', ...keys]
  const params: unknown[] = [date, ...keys.map((k) => patch[k])]
  const placeholders = cols.map((_, i) => `$${i + 1}`)
  const updates = [
    ...keys.map((k) => `${k} = EXCLUDED.${k}`),
    'updated_at = NOW()',
  ].join(', ')
  const r = await writerPool.query<DayJournal>(
    `INSERT INTO day_journal (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     ON CONFLICT (day) DO UPDATE SET ${updates}
     RETURNING ${RETURN_COLS}`,
    params,
  )
  return r.rows[0]
}

export async function listJournals(days: number): Promise<DayJournal[]> {
  const r = await readerPool.query<DayJournal>(
    `SELECT ${RETURN_COLS}
     FROM day_journal
     WHERE day > $1::date - $2::int AND day <= $1::date
     ORDER BY day DESC`,
    [parisToday(), days],
  )
  return r.rows
}
