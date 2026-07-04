// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool, testPool } from './helpers/test-db'
import {
  listTodos,
  listTomorrowTodos,
  createTodo,
  toggleTodo,
  setFocus,
  deleteTodo,
  updateTodoText,
  createFocusTodo,
  getFocusTodo,
  setTodoDone,
  rescheduleTodo,
  listTriageTodos,
  listUpcomingTodos,
  clearFocus,
} from '@/lib/queries/todos'
import { parisToday, parisTomorrow } from '@/lib/week'

afterAll(() => closePool())

describe('todos queries', () => {
  beforeEach(() => truncateAll())

  it('creates and lists todos', async () => {
    await createTodo('Tâche A', false)
    await createTodo('Tâche B', false)
    const list = await listTodos()
    expect(list).toHaveLength(2)
    expect(list.map(t => t.text)).toEqual(['Tâche A', 'Tâche B'])
  })

  it('exclut les tâches focus de la liste', async () => {
    await createTodo('Régulière', false)
    await createTodo('Focus', true)
    const list = await listTodos()
    expect(list.map(t => t.text)).toEqual(['Régulière'])
    expect(list.every(t => !t.is_focus)).toBe(true)
  })

  it('ne garde qu’une seule focus via setFocus', async () => {
    const a = await createTodo('A', true)
    const b = await createTodo('B', false)
    await setFocus(b.id)
    const { rows } = await testPool.query('SELECT id FROM todos WHERE is_focus = TRUE')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(b.id)
    expect(a).toBeTruthy()
  })

  it('toggles done', async () => {
    const t = await createTodo('x', false)
    const after = await toggleTodo(t.id)
    expect(after.done).toBe(true)
  })

  it('deletes', async () => {
    const t = await createTodo('x', false)
    await deleteTodo(t.id)
    const list = await listTodos()
    expect(list).toHaveLength(0)
  })

  it('updates text', async () => {
    const t = await createTodo('original', false)
    const after = await updateTodoText(t.id, 'modified')
    expect(after.text).toBe('modified')
  })

  it('throws on createTodo conflict when focus already exists', async () => {
    await createTodo('first focus', true)
    await expect(createTodo('second focus', true))
      .rejects
      .toThrow()
  })
})

describe('createFocusTodo', () => {
  beforeEach(() => truncateAll())

  it('creates a todo with is_focus=true atomically', async () => {
    const t = await createFocusTodo('Focus me')
    expect(t.is_focus).toBe(true)
    expect(t.text).toBe('Focus me')
  })

  it('clears existing focus before setting new one', async () => {
    const a = await createTodo('A', true)
    const b = await createFocusTodo('B')
    const { rows } = await testPool.query('SELECT id FROM todos WHERE is_focus = TRUE')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(b.id)
    const aRow = await testPool.query('SELECT is_focus FROM todos WHERE id = $1', [a.id])
    expect(aRow.rows[0].is_focus).toBe(false)
  })
})

describe('getFocusTodo', () => {
  beforeEach(() => truncateAll())

  it('returns null when no focus', async () => {
    await createTodo('plain', false)
    expect(await getFocusTodo()).toBeNull()
  })

  it('returns the focus todo', async () => {
    await createTodo('plain', false)
    await createFocusTodo('Focus me')
    const f = await getFocusTodo()
    expect(f?.text).toBe('Focus me')
  })

  it('un focus d\'un jour passé n\'est plus le focus, mais réapparaît en retard', async () => {
    const t = await createFocusTodo('Vieux focus')
    await testPool.query(
      `UPDATE todos SET scheduled_for = CURRENT_DATE - 1 WHERE id = $1`,
      [t.id],
    )
    expect(await getFocusTodo()).toBeNull()
    const list = await listTodos()
    const row = list.find(x => x.id === t.id)
    expect(row).toBeDefined()
    expect(row!.overdue).toBe(true)
  })
})

describe('listTodos — portée du jour', () => {
  beforeEach(() => truncateAll())

  it('exclut une tâche cochée un jour passé', async () => {
    const t = await createTodo('Hier fait', false)
    await toggleTodo(t.id) // done = true
    await testPool.query(
      `UPDATE todos SET updated_at = NOW() - INTERVAL '2 days' WHERE id = $1`,
      [t.id],
    )
    const list = await listTodos()
    expect(list.find(x => x.id === t.id)).toBeUndefined()
  })

  it('garde une tâche cochée aujourd’hui (overdue=false)', async () => {
    const t = await createTodo('Aujourd’hui fait', false)
    await toggleTodo(t.id)
    const list = await listTodos()
    const row = list.find(x => x.id === t.id)
    expect(row).toBeDefined()
    expect(row!.overdue).toBe(false)
  })

  it('marque overdue une tâche non cochée d’un jour passé', async () => {
    const t = await createTodo('En retard', false)
    await testPool.query(
      `UPDATE todos SET scheduled_for = CURRENT_DATE - 1 WHERE id = $1`,
      [t.id],
    )
    const list = await listTodos()
    const row = list.find(x => x.id === t.id)
    expect(row).toBeDefined()
    expect(row!.overdue).toBe(true)
  })

  it('place les tâches en retard avant celles du jour', async () => {
    const late = await createTodo('Retard', false)
    await testPool.query(
      `UPDATE todos SET scheduled_for = CURRENT_DATE - 1 WHERE id = $1`,
      [late.id],
    )
    await createTodo('Du jour', false)
    const list = await listTodos()
    expect(list[0].id).toBe(late.id)
    expect(list[0].overdue).toBe(true)
  })

  it('une tâche du jour non cochée n’est pas overdue', async () => {
    const t = await createTodo('Du jour', false)
    const list = await listTodos()
    expect(list.find(x => x.id === t.id)!.overdue).toBe(false)
  })

  it('exclut une tâche de demain et la place dans listTomorrowTodos', async () => {
    const t = await createTodo('Demain', false)
    await testPool.query(
      `UPDATE todos SET scheduled_for = CURRENT_DATE + 1 WHERE id = $1`,
      [t.id],
    )
    expect((await listTodos()).find(x => x.id === t.id)).toBeUndefined()
    const tomorrow = await listTomorrowTodos()
    expect(tomorrow.map(x => x.id)).toContain(t.id)
  })

  it('createTodo accepte une date planifiée explicite', async () => {
    await createTodo('Demain via param', false, '2999-01-01')
    const { rows } = await testPool.query(
      `SELECT scheduled_for::text FROM todos WHERE text = 'Demain via param'`,
    )
    expect(rows[0].scheduled_for).toBe('2999-01-01')
  })
})

describe('setTodoDone', () => {
  beforeEach(() => truncateAll())

  it('affirme done=true puis done=false (idempotent)', async () => {
    const t = await createTodo('x', false)
    expect((await setTodoDone(t.id, true)).done).toBe(true)
    expect((await setTodoDone(t.id, true)).done).toBe(true)
    expect((await setTodoDone(t.id, false)).done).toBe(false)
  })

  it('lève si id inconnu', async () => {
    await expect(setTodoDone(999999, true)).rejects.toThrow()
  })
})

describe('focus par jour, reports, triage, à-venir', () => {
  beforeEach(() => truncateAll())

  function shiftDays(n: number): string {
    const [y, m, d] = parisToday().split('-').map(Number)
    const anchor = new Date(Date.UTC(y, m - 1, d, 12))
    anchor.setUTCDate(anchor.getUTCDate() + n)
    return anchor.toISOString().slice(0, 10)
  }

  it('getFocusTodo sélectionne par date : aujourd\'hui vs demain', async () => {
    await createFocusTodo('Focus aujourd\'hui')
    await createFocusTodo('Focus demain', parisTomorrow())
    expect((await getFocusTodo())?.text).toBe('Focus aujourd\'hui')
    expect((await getFocusTodo(parisTomorrow()))?.text).toBe('Focus demain')
  })

  it('un second focus du même jour remplace le premier (déflague, ne supprime pas)', async () => {
    const first = await createFocusTodo('Premier')
    await createFocusTodo('Second')
    expect((await getFocusTodo())?.text).toBe('Second')
    const r = await testPool.query(
      `SELECT is_focus FROM todos WHERE id = $1`, [first.id])
    expect(r.rows[0].is_focus).toBe(false)
  })

  it('setFocus(id, date) promeut un todo existant et le re-date', async () => {
    const t = await createTodo('Tâche libre', false)
    await setFocus(t.id, parisTomorrow())
    expect((await getFocusTodo(parisTomorrow()))?.id).toBe(t.id)
  })

  it('clearFocus ne touche que le jour demandé', async () => {
    await createFocusTodo('Aujourd\'hui')
    await createFocusTodo('Demain', parisTomorrow())
    await clearFocus()
    expect(await getFocusTodo()).toBeNull()
    expect((await getFocusTodo(parisTomorrow()))?.text).toBe('Demain')
  })

  it('rescheduleTodo : +1 si date ultérieure, 0 si égale/antérieure, démote is_focus', async () => {
    const t = await createFocusTodo('Focus à reporter')
    const after = await rescheduleTodo(t.id, parisTomorrow())
    expect(after.postponed_count).toBe(1)
    expect(after.is_focus).toBe(false)
    expect((await rescheduleTodo(t.id, parisTomorrow())).postponed_count).toBe(1)  // égale
    expect((await rescheduleTodo(t.id, parisToday())).postponed_count).toBe(1)     // antérieure
  })

  it('une todo faite re-datée n\'incrémente pas', async () => {
    const t = await createTodo('Faite', false)
    await setTodoDone(t.id, true)
    expect((await rescheduleTodo(t.id, parisTomorrow())).postponed_count).toBe(0)
  })

  it('listTriageTodos : ≥3 reports OU ≥3 jours de retard, days_overdue jamais négatif', async () => {
    const reported = await createTodo('Reporté 3x', false, parisTomorrow())
    await testPool.query(`UPDATE todos SET postponed_count = 3 WHERE id = $1`, [reported.id])
    const late = await createTodo('En retard 3j', false, shiftDays(-3))
    await createTodo('Saine', false)
    const triage = await listTriageTodos()
    const texts = triage.map(t => t.text)
    expect(texts).toContain('Reporté 3x')
    expect(texts).toContain('En retard 3j')
    expect(texts).not.toContain('Saine')
    expect(triage.find(t => t.text === 'En retard 3j')?.days_overdue).toBe(3)
    expect(triage.find(t => t.text === 'Reporté 3x')?.days_overdue).toBe(0)
  })

  it('listUpcomingTodos : fenêtre J+2..J+7 exclusivement', async () => {
    await createTodo('Demain', false, parisTomorrow())          // J+1 : exclue
    await createTodo('Jeudi', false, shiftDays(3))               // incluse
    await createTodo('Limite', false, shiftDays(7))              // incluse
    await createTodo('Trop loin', false, shiftDays(8))           // exclue
    const upcoming = await listUpcomingTodos()
    expect(upcoming.map(t => t.text)).toEqual(['Jeudi', 'Limite'])
    expect(upcoming[0].scheduled_for).toBe(shiftDays(3))
  })
})
