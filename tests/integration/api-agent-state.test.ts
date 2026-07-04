import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
vi.mock('@/lib/n8n', () => ({ pushTodoSync: vi.fn() }))

import { GET } from '@/app/api/agent/state/route'
import { createTodo, createFocusTodo } from '@/lib/queries/todos'
import { createHabit } from '@/lib/queries/habits'
import { createAgentToken } from '@/lib/queries/agent-tokens'

afterAll(() => closePool())

async function authedReq(): Promise<Request> {
  const { plaintext } = await createAgentToken('test')
  return new Request('http://x/api/agent/state', {
    headers: { Authorization: `Bearer ${plaintext}` },
  })
}

describe('GET /api/agent/state', () => {
  beforeEach(() => truncateAll())

  it('refuse sans token (401)', async () => {
    const res = await GET(new Request('http://x/api/agent/state'))
    expect(res.status).toBe(401)
  })

  it('renvoie focus, todos et habitudes', async () => {
    await createFocusTodo('Mon focus')
    await createTodo('Tâche du jour', false)
    await createHabit('Sport', 'Dumbbell')

    const res = await GET(await authedReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.focus.text).toBe('Mon focus')
    expect(body.todos.today.map((t: { text: string }) => t.text)).toContain('Tâche du jour')
    expect(body.habits.map((h: { name: string }) => h.name)).toContain('Sport')
    expect(Array.isArray(body.checks_today)).toBe(true)
  })

  it('état enrichi : focus done/why, demain, journal, triage, upcoming, semaine, habitudes 7 j', async () => {
    const { upsertDayJournal } = await import('@/lib/queries/journal')
    const { createWeekPriority } = await import('@/lib/queries/week-priorities')
    const { setHabitCheck } = await import('@/lib/queries/habits')
    const { parisToday, parisTomorrow, parisMonday } = await import('@/lib/week')
    const { testPool } = await import('./helpers/test-db')

    await createFocusTodo('Focus du jour')
    await createFocusTodo('Focus de demain', parisTomorrow())
    await upsertDayJournal(parisToday(), { deep_work: true, why: 'Parce que ça compte' })
    const reported = await createTodo('Reporté 3x', false)
    await testPool.query(`UPDATE todos SET postponed_count = 3 WHERE id = $1`, [reported.id])
    const [y, m, d] = parisToday().split('-').map(Number)
    const anchor = new Date(Date.UTC(y, m - 1, d, 12))
    anchor.setUTCDate(anchor.getUTCDate() + 3)
    await createTodo('Dans trois jours', false, anchor.toISOString().slice(0, 10))
    await createWeekPriority(parisMonday(), 'Prio de la semaine')
    const habit = await createHabit('Sport', 'Dumbbell')
    await setHabitCheck(habit.id, parisToday(), true)

    const body = await (await GET(await authedReq())).json()
    expect(body.focus).toMatchObject({ text: 'Focus du jour', done: false, why: 'Parce que ça compte' })
    expect(body.focus_tomorrow.text).toBe('Focus de demain')
    expect(body.journal.deep_work).toBe(true)
    expect(body.triage.map((t: { text: string }) => t.text)).toContain('Reporté 3x')
    expect(body.todos.today.find((t: { text: string }) => t.text === 'Reporté 3x').postponed_count).toBe(3)
    expect(body.todos.upcoming.map((t: { text: string }) => t.text)).toContain('Dans trois jours')
    expect(body.week_priorities.map((p: { text: string }) => p.text)).toContain('Prio de la semaine')
    expect(body.habits.find((h: { name: string }) => h.name === 'Sport').checks_last_7).toBe(1)
  })
})
