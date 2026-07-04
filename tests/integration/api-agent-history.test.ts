import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { GET } from '@/app/api/agent/history/route'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { createHabit, setHabitCheck } from '@/lib/queries/habits'
import { upsertDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

async function authed(url: string): Promise<Request> {
  const { plaintext } = await createAgentToken('test')
  return new Request(url, { headers: { Authorization: `Bearer ${plaintext}` } })
}

describe('GET /api/agent/history', () => {
  beforeEach(() => truncateAll())

  it('refuse sans token (401)', async () => {
    const res = await GET(new Request('http://x/api/agent/history'))
    expect(res.status).toBe(401)
  })

  it('renvoie journaux + stats habitudes sur la fenêtre', async () => {
    const sport = await createHabit('Sport', null)
    await setHabitCheck(sport.id, parisToday(), true)
    await upsertDayJournal(parisToday(), { focus_outcome: 'done', deep_work: true })
    const res = await GET(await authed('http://x/api/agent/history?days=7'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.days).toBe(7)
    expect(body.journals.map((j: { focus_outcome: string }) => j.focus_outcome)).toContain('done')
    expect(body.habits.find((h: { name: string }) => h.name === 'Sport')?.checks).toBe(1)
  })

  it('borne days et applique le défaut 14', async () => {
    expect((await (await GET(await authed('http://x/api/agent/history'))).json()).days).toBe(14)
    expect((await (await GET(await authed('http://x/api/agent/history?days=999'))).json()).days).toBe(90)
    expect((await (await GET(await authed('http://x/api/agent/history?days=0'))).json()).days).toBe(1)
  })
})
