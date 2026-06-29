import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
vi.mock('@/lib/n8n', () => ({ pushTodoSync: vi.fn() }))

import { POST } from '@/app/api/agent/todos/route'
import { PATCH, DELETE } from '@/app/api/agent/todos/[id]/route'
import { listTodos, listTomorrowTodos } from '@/lib/queries/todos'
import { createAgentToken } from '@/lib/queries/agent-tokens'

afterAll(() => closePool())

async function bearer(): Promise<string> {
  const { plaintext } = await createAgentToken('test')
  return `Bearer ${plaintext}`
}

describe('POST /api/agent/todos', () => {
  beforeEach(() => truncateAll())

  it('crée une todo today', async () => {
    const res = await POST(new Request('http://x/api/agent/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Du jour' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect((await listTodos()).map(t => t.id)).toContain(body.id)
  })

  it('crée une todo tomorrow', async () => {
    const res = await POST(new Request('http://x/api/agent/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Demain', when: 'tomorrow' }),
    }))
    const body = await res.json()
    expect((await listTomorrowTodos()).map(t => t.id)).toContain(body.id)
  })

  it('refuse sans token (401)', async () => {
    const res = await POST(new Request('http://x/api/agent/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x' }),
    }))
    expect(res.status).toBe(401)
  })
})

describe('PATCH/DELETE /api/agent/todos/:id', () => {
  beforeEach(() => truncateAll())

  async function makeTodo(): Promise<number> {
    const res = await POST(new Request('http://x/api/agent/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'x' }),
    }))
    return (await res.json()).id
  }

  it('PATCH affirme done=true', async () => {
    const id = await makeTodo()
    const res = await PATCH(new Request(`http://x/api/agent/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ done: true }),
    }), { params: Promise.resolve({ id: String(id) }) })
    expect(res.status).toBe(200)
    expect((await res.json()).done).toBe(true)
  })

  it('PATCH édite le texte', async () => {
    const id = await makeTodo()
    const res = await PATCH(new Request(`http://x/api/agent/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'modifié' }),
    }), { params: Promise.resolve({ id: String(id) }) })
    expect((await res.json()).text).toBe('modifié')
  })

  it('PATCH 400 si corps vide', async () => {
    const id = await makeTodo()
    const res = await PATCH(new Request(`http://x/api/agent/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ id: String(id) }) })
    expect(res.status).toBe(400)
  })

  it('PATCH 404 si id inconnu', async () => {
    const res = await PATCH(new Request('http://x/api/agent/todos/999999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ done: true }),
    }), { params: Promise.resolve({ id: '999999' }) })
    expect(res.status).toBe(404)
  })

  it('DELETE supprime', async () => {
    const id = await makeTodo()
    const res = await DELETE(new Request(`http://x/api/agent/todos/${id}`, {
      method: 'DELETE', headers: { Authorization: await bearer() },
    }), { params: Promise.resolve({ id: String(id) }) })
    expect(res.status).toBe(204)
    expect((await listTodos()).map(t => t.id)).not.toContain(id)
  })
})
