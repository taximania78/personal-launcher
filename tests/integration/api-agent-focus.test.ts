import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
vi.mock('@/lib/n8n', () => ({ pushTodoSync: vi.fn() }))

import { PUT, DELETE } from '@/app/api/agent/focus/route'
import { pushTodoSync } from '@/lib/n8n'
import { getFocusTodo } from '@/lib/queries/todos'
import { createAgentToken } from '@/lib/queries/agent-tokens'

afterAll(() => closePool())

async function bearer(): Promise<string> {
  const { plaintext } = await createAgentToken('test')
  return `Bearer ${plaintext}`
}

describe('focus /api/agent/focus', () => {
  beforeEach(() => truncateAll())
  beforeEach(() => vi.clearAllMocks())

  it('PUT crée le focus du jour', async () => {
    const res = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Finir le rapport' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe('Finir le rapport')
    expect((await getFocusTodo())?.text).toBe('Finir le rapport')
  })

  it('PUT refuse un texte vide (400)', async () => {
    const res = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: '' }),
    }))
    expect(res.status).toBe(400)
  })

  it('DELETE efface le focus', async () => {
    await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'X' }),
    }))
    const res = await DELETE(new Request('http://x/api/agent/focus', {
      method: 'DELETE', headers: { Authorization: await bearer() },
    }))
    expect(res.status).toBe(204)
    expect(await getFocusTodo()).toBeNull()
  })

  it('refuse sans token (401)', async () => {
    const res = await DELETE(new Request('http://x/api/agent/focus', { method: 'DELETE' }))
    expect(res.status).toBe(401)
  })

  it('PUT notifie n8n via pushTodoSync', async () => {
    await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Finir le rapport' }),
    }))
    expect(vi.mocked(pushTodoSync)).toHaveBeenCalledWith('created', expect.objectContaining({ text: 'Finir le rapport' }))
  })
})
