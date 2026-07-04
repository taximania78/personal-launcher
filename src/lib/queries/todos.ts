import { readerPool, writerPool, withWriterTx } from '../db'
import { parisToday, parisTomorrow } from '../week'

export type Todo = {
  id: number
  text: string
  done: boolean
  position: number
  is_focus: boolean
  created_at: Date
  updated_at: Date
  postponed_count: number
}

export type TodoListItem = Todo & { overdue: boolean; days_overdue: number }

export async function listTodos(): Promise<TodoListItem[]> {
  const today = parisToday()
  const r = await readerPool.query<TodoListItem>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at, postponed_count,
           (done = FALSE AND scheduled_for < $1::date) AS overdue,
           GREATEST(($1::date - scheduled_for), 0)::int AS days_overdue
    FROM todos
    WHERE (is_focus = FALSE OR scheduled_for < $1::date)
      AND (
        (done = FALSE AND scheduled_for <= $1::date)
        OR (done = TRUE AND (updated_at AT TIME ZONE 'Europe/Paris')::date = $1::date)
      )
    ORDER BY overdue DESC, position ASC, created_at ASC
    LIMIT 6
  `, [today])
  return r.rows
}

export async function listTomorrowTodos(): Promise<Todo[]> {
  const r = await readerPool.query<Todo>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at, postponed_count
    FROM todos
    WHERE is_focus = FALSE
      AND done = FALSE
      AND scheduled_for = $1::date
    ORDER BY position ASC, created_at ASC
    LIMIT 6
  `, [parisTomorrow()])
  return r.rows
}

export async function createTodo(
  text: string,
  isFocus: boolean,
  scheduledFor: string = parisToday(),
): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    INSERT INTO todos (text, is_focus, position, scheduled_for)
    VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM todos), 0), $3)
    RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
  `, [text, isFocus, scheduledFor])
  return r.rows[0]
}

export async function toggleTodo(id: number): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos
    SET done = NOT done, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
  `, [id])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function setTodoDone(id: number, done: boolean): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos
    SET done = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
  `, [id, done])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function setFocus(id: number, date: string = parisToday()): Promise<Todo> {
  return withWriterTx(async (c) => {
    await c.query(
      `UPDATE todos SET is_focus = FALSE, updated_at = NOW()
       WHERE is_focus = TRUE AND scheduled_for = $1::date`,
      [date],
    )
    const r = await c.query<Todo>(`
      UPDATE todos
      SET is_focus = TRUE,
          postponed_count = postponed_count
            + CASE WHEN $2::date > scheduled_for AND done = FALSE THEN 1 ELSE 0 END,
          scheduled_for = $2::date,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
    `, [id, date])
    if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
    return r.rows[0]
  })
}

export async function clearFocus(date: string = parisToday()): Promise<void> {
  await writerPool.query(
    `UPDATE todos SET is_focus = FALSE, updated_at = NOW()
     WHERE is_focus = TRUE AND scheduled_for = $1::date`,
    [date],
  )
}

export async function updateTodoText(id: number, text: string): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos SET text = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
  `, [id, text])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function deleteTodo(id: number): Promise<void> {
  const r = await writerPool.query(`DELETE FROM todos WHERE id = $1`, [id])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
}

export async function createFocusTodo(
  text: string,
  scheduledFor: string = parisToday(),
): Promise<Todo> {
  return withWriterTx(async (c) => {
    await c.query(
      `UPDATE todos SET is_focus = FALSE, updated_at = NOW()
       WHERE is_focus = TRUE AND scheduled_for = $1::date`,
      [scheduledFor],
    )
    const r = await c.query<Todo>(`
      INSERT INTO todos (text, is_focus, position, scheduled_for)
      VALUES ($1, TRUE, COALESCE((SELECT MAX(position) + 1 FROM todos), 0), $2::date)
      RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
    `, [text, scheduledFor])
    return r.rows[0]
  })
}

export async function getFocusTodo(date: string = parisToday()): Promise<Todo | null> {
  const r = await readerPool.query<Todo>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at, postponed_count
    FROM todos
    WHERE is_focus = TRUE AND scheduled_for = $1::date
    LIMIT 1
  `, [date])
  return r.rows[0] ?? null
}

export async function rescheduleTodo(id: number, newDate: string): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos
    SET postponed_count = postponed_count
          + CASE WHEN $2::date > scheduled_for AND done = FALSE THEN 1 ELSE 0 END,
        scheduled_for = $2::date,
        is_focus = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
  `, [id, newDate])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export type TriageTodo = {
  id: number
  text: string
  postponed_count: number
  days_overdue: number
}

export async function listTriageTodos(): Promise<TriageTodo[]> {
  const r = await readerPool.query<TriageTodo>(`
    SELECT id, text, postponed_count,
           GREATEST(($1::date - scheduled_for), 0)::int AS days_overdue
    FROM todos
    WHERE done = FALSE
      AND NOT (is_focus = TRUE AND scheduled_for >= $1::date)
      AND (postponed_count >= 3 OR scheduled_for <= $1::date - 3)
    ORDER BY scheduled_for ASC, id ASC
  `, [parisToday()])
  return r.rows
}

export type UpcomingTodo = Todo & { scheduled_for: string }

export async function listUpcomingTodos(days: number = 7): Promise<UpcomingTodo[]> {
  const r = await readerPool.query<UpcomingTodo>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at, postponed_count,
           to_char(scheduled_for, 'YYYY-MM-DD') AS scheduled_for
    FROM todos
    WHERE done = FALSE
      AND scheduled_for > $1::date + 1
      AND scheduled_for <= $1::date + $2::int
    ORDER BY scheduled_for ASC, position ASC, created_at ASC
  `, [parisToday(), days])
  return r.rows
}
