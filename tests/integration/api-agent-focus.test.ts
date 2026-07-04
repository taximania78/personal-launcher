import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
vi.mock('@/lib/n8n', () => ({ pushTodoSync: vi.fn() }))

import { PUT, DELETE } from '@/app/api/agent/focus/route'
import { pushTodoSync } from '@/lib/n8n'
import { getFocusTodo } from '@/lib/queries/todos'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { getDayJournal } from '@/lib/queries/journal'
import { createTodo } from '@/lib/queries/todos'
import { parisToday, parisTomorrow } from '@/lib/week'

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

  it('PUT { text, when: "tomorrow" } pose le focus de demain sans toucher aujourd\'hui', async () => {
    const res = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Focus de demain', when: 'tomorrow' }),
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).date).toBe(parisTomorrow())
    const { getFocusTodo } = await import('@/lib/queries/todos')
    expect((await getFocusTodo(parisTomorrow()))?.text).toBe('Focus de demain')
    expect(await getFocusTodo()).toBeNull()
  })

  it('PUT accepte une date ISO (vendredi → lundi)', async () => {
    const res = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Focus de lundi', when: '2999-01-04' }),
    }))
    expect(res.status).toBe(200)
    const { getFocusTodo } = await import('@/lib/queries/todos')
    expect((await getFocusTodo('2999-01-04'))?.text).toBe('Focus de lundi')
  })

  it('PUT { todo_id, why } promeut un todo existant et écrit le journal', async () => {
    const t = await createTodo('Tâche à promouvoir', false)
    const res = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ todo_id: t.id, why: 'Deadline client' }),
    }))
    expect(res.status).toBe(200)
    const journal = await getDayJournal(parisToday())
    expect(journal?.why).toBe('Deadline client')
    expect(journal?.focus_text).toBe('Tâche à promouvoir')
  })

  it('PUT refuse text ET todo_id ensemble (400), et todo_id inconnu (404)', async () => {
    const both = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'x', todo_id: 1 }),
    }))
    expect(both.status).toBe(400)
    const unknown = await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ todo_id: 999999 }),
    }))
    expect(unknown.status).toBe(404)
  })

  it('DELETE recale le journal du jour sur not_set', async () => {
    await PUT(new Request('http://x/api/agent/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ text: 'Éphémère', why: 'Sera effacé' }),
    }))
    const res = await DELETE(new Request('http://x/api/agent/focus', {
      method: 'DELETE', headers: { Authorization: await bearer() },
    }))
    expect(res.status).toBe(204)
    const journal = await getDayJournal(parisToday())
    expect(journal?.focus_text).toBeNull()
    expect(journal?.why).toBeNull()
    expect(journal?.focus_outcome).toBe('not_set')
  })
})
