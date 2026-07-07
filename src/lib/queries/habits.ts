import { readerPool, writerPool, withWriterTx } from '../db'
import { parisToday } from '../week'

export type Habit = {
  id: number
  name: string
  icon: string | null
  position: number
  active: boolean
  created_at: string   // jour de création YYYY-MM-DD (Europe/Paris)
}

export type HabitCheck = {
  habit_id: number
  day: string   // ISO YYYY-MM-DD (cast ::text côté SQL — pas de dérive timezone)
}

// id::int — habits.id est BIGINT et pg renvoie les int8 en string ; le cast
// garantit des ids number côté JS (sinon zod rejette habit_id dans /check).
const HABIT_COLS =
  "id::int AS id, name, icon, position, active, " +
  "to_char(created_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS created_at"

export async function listHabits(includeInactive = false): Promise<Habit[]> {
  const r = await readerPool.query<Habit>(`
    SELECT ${HABIT_COLS}
    FROM habits
    ${includeInactive ? '' : 'WHERE active = TRUE'}
    ORDER BY position ASC, created_at ASC
  `)
  return r.rows
}

export async function createHabit(name: string, icon: string | null): Promise<Habit> {
  const r = await writerPool.query<Habit>(`
    INSERT INTO habits (name, icon, position)
    VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM habits), 0))
    RETURNING ${HABIT_COLS}
  `, [name, icon])
  return r.rows[0]
}

export type HabitPatch = {
  name?: string
  icon?: string | null
  position?: number
  active?: boolean
}

export async function updateHabit(id: number, patch: HabitPatch): Promise<Habit> {
  const sets: string[] = []
  const values: unknown[] = [id]
  for (const key of ['name', 'icon', 'position', 'active'] as const) {
    if (patch[key] !== undefined) {
      values.push(patch[key])
      sets.push(`${key} = $${values.length}`)
    }
  }
  if (sets.length === 0) throw new Error('empty patch')
  const r = await writerPool.query<Habit>(`
    UPDATE habits SET ${sets.join(', ')}
    WHERE id = $1
    RETURNING ${HABIT_COLS}
  `, values)
  if (r.rowCount === 0) throw new Error(`Habit ${id} not found`)
  return r.rows[0]
}

export async function deleteHabit(id: number): Promise<void> {
  const r = await writerPool.query(`DELETE FROM habits WHERE id = $1`, [id])
  if (r.rowCount === 0) throw new Error(`Habit ${id} not found`)
}

export async function moveHabitUp(id: number): Promise<void> {
  return withWriterTx(async (c) => {
    const me = await c.query<{ position: number }>(
      `SELECT position FROM habits WHERE id = $1 FOR UPDATE`, [id])
    if (me.rowCount === 0) throw new Error(`Habit ${id} not found`)
    const myPos = me.rows[0].position
    const above = await c.query<{ id: number; position: number }>(
      `SELECT id::int AS id, position FROM habits
       WHERE position < $1
       ORDER BY position DESC LIMIT 1
       FOR UPDATE`, [myPos])
    if (above.rowCount === 0) return  // no-op, already at top
    const aboveRow = above.rows[0]
    await c.query(`UPDATE habits SET position = $1 WHERE id = $2`, [aboveRow.position, id])
    await c.query(`UPDATE habits SET position = $1 WHERE id = $2`, [myPos, aboveRow.id])
  })
}

export async function moveHabitDown(id: number): Promise<void> {
  return withWriterTx(async (c) => {
    const me = await c.query<{ position: number }>(
      `SELECT position FROM habits WHERE id = $1 FOR UPDATE`, [id])
    if (me.rowCount === 0) throw new Error(`Habit ${id} not found`)
    const myPos = me.rows[0].position
    const below = await c.query<{ id: number; position: number }>(
      `SELECT id::int AS id, position FROM habits
       WHERE position > $1
       ORDER BY position ASC LIMIT 1
       FOR UPDATE`, [myPos])
    if (below.rowCount === 0) return  // no-op, already at bottom
    const belowRow = below.rows[0]
    await c.query(`UPDATE habits SET position = $1 WHERE id = $2`, [belowRow.position, id])
    await c.query(`UPDATE habits SET position = $1 WHERE id = $2`, [myPos, belowRow.id])
  })
}

export async function getWeekChecks(days: string[]): Promise<HabitCheck[]> {
  const r = await readerPool.query<HabitCheck>(`
    SELECT habit_id::int AS habit_id, day::text AS day
    FROM habit_checks
    WHERE day = ANY($1::date[])
  `, [days])
  return r.rows
}

export async function getChecksSince(startDay: string): Promise<HabitCheck[]> {
  const r = await readerPool.query<HabitCheck>(`
    SELECT habit_id::int AS habit_id, day::text AS day
    FROM habit_checks
    WHERE day >= $1::date
    ORDER BY day ASC
  `, [startDay])
  return r.rows
}

export async function toggleCheck(habitId: number, day: string): Promise<{ checked: boolean }> {
  const ins = await writerPool.query(`
    INSERT INTO habit_checks (habit_id, day)
    VALUES ($1, $2)
    ON CONFLICT (habit_id, day) DO NOTHING
  `, [habitId, day])
  if (ins.rowCount === 1) return { checked: true }
  await writerPool.query(`DELETE FROM habit_checks WHERE habit_id = $1 AND day = $2`, [habitId, day])
  return { checked: false }
}

export async function setHabitCheck(
  habitId: number,
  day: string,
  checked: boolean,
): Promise<{ checked: boolean }> {
  if (checked) {
    await writerPool.query(`
      INSERT INTO habit_checks (habit_id, day)
      VALUES ($1, $2)
      ON CONFLICT (habit_id, day) DO NOTHING
    `, [habitId, day])
    return { checked: true }
  }
  await writerPool.query(`DELETE FROM habit_checks WHERE habit_id = $1 AND day = $2`, [habitId, day])
  return { checked: false }
}

export type HabitCheckCount = { habit_id: number; name: string; checks: number }

export async function getHabitCheckCounts(days: number): Promise<HabitCheckCount[]> {
  const r = await readerPool.query<HabitCheckCount>(`
    SELECT h.id::int AS habit_id, h.name, COUNT(c.day)::int AS checks
    FROM habits h
    LEFT JOIN habit_checks c
      ON c.habit_id = h.id AND c.day > $1::date - $2::int
    WHERE h.active = TRUE
    GROUP BY h.id, h.name, h.position
    ORDER BY h.position ASC
  `, [parisToday(), days])
  return r.rows
}

/** L'habitude « Deep work » active (insensible à la casse), s'il y en a une. */
export async function findDeepWorkHabit(): Promise<Habit | null> {
  const r = await readerPool.query<Habit>(`
    SELECT ${HABIT_COLS}
    FROM habits
    WHERE active = TRUE AND lower(name) = 'deep work'
    ORDER BY position ASC
    LIMIT 1
  `)
  return r.rows[0] ?? null
}
