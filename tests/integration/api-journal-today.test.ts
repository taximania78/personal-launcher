import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { PUT } from '@/app/api/journal/today/route'
import { getDayJournal, upsertDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

function put(body: unknown): Request {
  return new Request('http://x/api/journal/today', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/journal/today', () => {
  beforeEach(() => truncateAll())

  it('écrit deep_work du jour', async () => {
    const res = await PUT(put({ deep_work: true }))
    expect(res.status).toBe(200)
    expect((await getDayJournal(parisToday()))?.deep_work).toBe(true)
  })

  it('ne touche pas au reste du journal', async () => {
    await upsertDayJournal(parisToday(), { why: 'Préservé', focus_outcome: 'done' })
    await PUT(put({ deep_work: false }))
    const j = await getDayJournal(parisToday())
    expect(j?.deep_work).toBe(false)
    expect(j?.why).toBe('Préservé')
    expect(j?.focus_outcome).toBe('done')
  })

  it('rejette un corps sans deep_work (400)', async () => {
    expect((await PUT(put({}))).status).toBe(400)
    expect((await PUT(put({ deep_work: 'oui' }))).status).toBe(400)
  })
})
