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
}

export type TodoListItem = Todo & { overdue: boolean }

export async function listTodos(): Promise<TodoListItem[]> {
  const today = parisToday()
  const r = await readerPool.query<TodoListItem>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at,
           (done = FALSE AND scheduled_for < $1::date) AS overdue
    FROM todos
    WHERE is_focus = FALSE
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
    SELECT id, text, done, position, is_focus, created_at, updated_at
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
    RETURNING id, text, done, position, is_focus, created_at, updated_at
  `, [text, isFocus, scheduledFor])
  return r.rows[0]
}

export async function toggleTodo(id: number): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos
    SET done = NOT done, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at
  `, [id])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function setTodoDone(id: number, done: boolean): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos
    SET done = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at
  `, [id, done])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function setFocus(id: number): Promise<Todo> {
  return withWriterTx(async (c) => {
    await c.query(`UPDATE todos SET is_focus = FALSE, updated_at = NOW() WHERE is_focus = TRUE`)
    const r = await c.query<Todo>(`
      UPDATE todos
      SET is_focus = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, text, done, position, is_focus, created_at, updated_at
    `, [id])
    if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
    return r.rows[0]
  })
}

export async function clearFocus(): Promise<void> {
  await writerPool.query(`UPDATE todos SET is_focus = FALSE, updated_at = NOW() WHERE is_focus = TRUE`)
}

export async function updateTodoText(id: number, text: string): Promise<Todo> {
  const r = await writerPool.query<Todo>(`
    UPDATE todos SET text = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, text, done, position, is_focus, created_at, updated_at
  `, [id, text])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
  return r.rows[0]
}

export async function deleteTodo(id: number): Promise<void> {
  const r = await writerPool.query(`DELETE FROM todos WHERE id = $1`, [id])
  if (r.rowCount === 0) throw new Error(`Todo ${id} not found`)
}

export async function createFocusTodo(text: string): Promise<Todo> {
  return withWriterTx(async (c) => {
    // Clear existing focus first
    await c.query(`UPDATE todos SET is_focus = FALSE, updated_at = NOW() WHERE is_focus = TRUE`)
    // Insert with is_focus = true
    const r = await c.query<Todo>(`
      INSERT INTO todos (text, is_focus, position)
      VALUES ($1, TRUE, COALESCE((SELECT MAX(position) + 1 FROM todos), 0))
      RETURNING id, text, done, position, is_focus, created_at, updated_at
    `, [text])
    return r.rows[0]
  })
}

export async function getFocusTodo(): Promise<Todo | null> {
  // « Focus unique du jour » : une focus posée un jour précédent est ignorée,
  // la bannière retombe alors sur app_config.focus_default.
  const r = await readerPool.query<Todo>(`
    SELECT id, text, done, position, is_focus, created_at, updated_at
    FROM todos
    WHERE is_focus = TRUE
      AND (updated_at AT TIME ZONE 'Europe/Paris')::date = $1::date
    LIMIT 1
  `, [parisToday()])
  return r.rows[0] ?? null
}
