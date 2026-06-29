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
})
