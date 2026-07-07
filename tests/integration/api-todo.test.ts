// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
vi.mock('@/lib/n8n', () => ({ pushTodoSync: vi.fn() }))

afterAll(() => closePool())

import { POST } from '@/app/api/todo/route'
import { listTodos, listTomorrowTodos } from '@/lib/queries/todos'

describe('POST /api/todo', () => {
  beforeEach(() => truncateAll())

  it('creates a todo and returns 200', async () => {
    const req = new Request('http://localhost/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Hello')
  })

  it('returns 400 on invalid body', async () => {
    const req = new Request('http://localhost/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ensure unused import doesn't break — used in PATCH section below
  it('testPool import sanity', () => {
    expect(testPool).toBeTruthy()
  })
})

import { PATCH, DELETE } from '@/app/api/todo/[id]/route'

describe('PATCH /api/todo/:id', () => {
  beforeEach(() => truncateAll())

  it('toggles done', async () => {
    const create = await POST(new Request('http://x/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x' }),
    }))
    const { id } = await create.json()

    const req = new Request(`http://x/api/todo/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: String(id) }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.done).toBe(true)
  })

  it('returns 404 on unknown id', async () => {
    const req = new Request('http://x/api/todo/99999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '99999' }) })
    expect(res.status).toBe(404)
  })

  it('is_focus est ignoré par POST et refusé seul par PATCH (focus agent-only)', async () => {
    const created = await (await POST(new Request('http://x/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'pas un focus', is_focus: true }),
    }))).json()
    const r = await testPool.query('SELECT is_focus FROM todos WHERE id = $1', [created.id])
    expect(r.rows[0].is_focus).toBe(false)

    const res = await PATCH(
      new Request(`http://x/api/todo/${created.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_focus: true }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) },
    )
    expect(res.status).toBe(400)  // aucun champ connu → refine échoue
  })

  it('PATCH { scheduled_for } demain : reporte et incrémente le compteur', async () => {
    const { parisTomorrow } = await import('@/lib/week')
    const created = await (await POST(new Request('http://x/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'à reporter' }),
    }))).json()
    const res = await PATCH(
      new Request(`http://x/api/todo/${created.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_for: parisTomorrow() }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.postponed_count).toBe(1)
  })
})

describe('POST /api/todo — when=tomorrow', () => {
  beforeEach(() => truncateAll())

  it('range la tâche dans demain, pas dans aujourd’hui', async () => {
    const req = new Request('http://localhost/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Préparer demain', when: 'tomorrow' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    const today = await listTodos()
    expect(today.find(t => t.id === body.id)).toBeUndefined()

    const tomorrow = await listTomorrowTodos()
    expect(tomorrow.map(t => t.id)).toContain(body.id)
  })

  it('scheduled_for libre prime sur when', async () => {
    const res = await POST(new Request('http://localhost/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Plus tard', when: 'today', scheduled_for: '2999-01-01' }),
    }))
    const body = await res.json()
    const r = await testPool.query(
      `SELECT scheduled_for::text FROM todos WHERE id = $1`, [body.id])
    expect(r.rows[0].scheduled_for).toBe('2999-01-01')
  })

  it('par défaut (when absent) range la tâche aujourd’hui', async () => {
    const req = new Request('http://localhost/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Du jour' }),
    })
    const res = await POST(req)
    const body = await res.json()
    const today = await listTodos()
    expect(today.map(t => t.id)).toContain(body.id)
  })
})

describe('DELETE /api/todo/:id', () => {
  beforeEach(() => truncateAll())

  it('deletes', async () => {
    const t = await (await POST(new Request('http://x/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x' }),
    }))).json()
    const res = await DELETE(new Request(`http://x/api/todo/${t.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(t.id) }) })
    expect(res.status).toBe(204)
    const r = await testPool.query('SELECT * FROM todos WHERE id = $1', [t.id])
    expect(r.rowCount).toBe(0)
  })
})
