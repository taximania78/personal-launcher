import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'

import { POST as createHabitRoute } from '@/app/api/agent/habits/route'
import { POST as checkRoute } from '@/app/api/agent/habits/[id]/check/route'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { getWeekChecks } from '@/lib/queries/habits'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

async function bearer(): Promise<string> {
  const { plaintext } = await createAgentToken('test')
  return `Bearer ${plaintext}`
}

describe('POST /api/agent/habits', () => {
  beforeEach(() => truncateAll())

  it('crée une habitude', async () => {
    const res = await createHabitRoute(new Request('http://x/api/agent/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ name: 'Sport', icon: 'Dumbbell' }),
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Sport')
  })

  it('refuse sans token (401)', async () => {
    const res = await createHabitRoute(new Request('http://x/api/agent/habits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/agent/habits/:id/check', () => {
  beforeEach(() => truncateAll())

  async function makeHabit(): Promise<number> {
    const res = await createHabitRoute(new Request('http://x/api/agent/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ name: 'Sport' }),
    }))
    return (await res.json()).id
  }

  it('coche aujourd’hui par défaut', async () => {
    const id = await makeHabit()
    const res = await checkRoute(new Request(`http://x/api/agent/habits/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({}),
    }), { params: Promise.resolve({ id: String(id) }) })
    expect(res.status).toBe(200)
    expect((await res.json()).checked).toBe(true)
    expect((await getWeekChecks([parisToday()])).map(c => c.habit_id)).toContain(id)
  })

  it('décoche avec checked=false', async () => {
    const id = await makeHabit()
    const today = parisToday()
    await checkRoute(new Request(`http://x/api/agent/habits/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ day: today, checked: true }),
    }), { params: Promise.resolve({ id: String(id) }) })
    const res = await checkRoute(new Request(`http://x/api/agent/habits/${id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ day: today, checked: false }),
    }), { params: Promise.resolve({ id: String(id) }) })
    expect((await res.json()).checked).toBe(false)
  })

  it('404 si habitude inconnue', async () => {
    const res = await checkRoute(new Request('http://x/api/agent/habits/999999/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ checked: true }),
    }), { params: Promise.resolve({ id: '999999' }) })
    expect(res.status).toBe(404)
  })
})
