import { readerPool, writerPool, withWriterTx } from '../db'

export type WeekPriority = {
  id: number
  week_start: string
  text: string
  done: boolean
  position: number
}

export type WeekPriorityPatch = {
  text?: string
  done?: boolean
  position?: number
}

// id::int (BIGSERIAL) et week_start en texte : conventions du repo (cf. habits.ts).
const RETURN_COLS = `id::int AS id, to_char(week_start, 'YYYY-MM-DD') AS week_start, text, done, position`

export async function listWeekPriorities(weekStart: string): Promise<WeekPriority[]> {
  const r = await readerPool.query<WeekPriority>(
    `SELECT ${RETURN_COLS} FROM week_priorities
     WHERE week_start = $1::date
     ORDER BY position ASC, id ASC`,
    [weekStart],
  )
  return r.rows
}

export async function createWeekPriority(weekStart: string, text: string): Promise<WeekPriority> {
  return withWriterTx(async (c) => {
    const count = await c.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM week_priorities WHERE week_start = $1::date`,
      [weekStart],
    )
    if (count.rows[0].n >= 3) throw new Error('week_priorities limit reached')
    const r = await c.query<WeekPriority>(
      `INSERT INTO week_priorities (week_start, text, position)
       VALUES ($1::date, $2,
               COALESCE((SELECT MAX(position) + 1 FROM week_priorities WHERE week_start = $1::date), 0))
       RETURNING ${RETURN_COLS}`,
      [weekStart, text],
    )
    return r.rows[0]
  })
}

export async function updateWeekPriority(id: number, patch: WeekPriorityPatch): Promise<WeekPriority> {
  const r = await writerPool.query<WeekPriority>(
    `UPDATE week_priorities
     SET text     = COALESCE($2, text),
         done     = COALESCE($3, done),
         position = COALESCE($4, position),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${RETURN_COLS}`,
    [id, patch.text ?? null, patch.done ?? null, patch.position ?? null],
  )
  if (r.rowCount === 0) throw new Error(`WeekPriority ${id} not found`)
  return r.rows[0]
}

export async function deleteWeekPriority(id: number): Promise<void> {
  const r = await writerPool.query(`DELETE FROM week_priorities WHERE id = $1`, [id])
  if (r.rowCount === 0) throw new Error(`WeekPriority ${id} not found`)
}
