import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { GET, PUT } from '@/app/api/agent/journal/[date]/route'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

function ctx(date: string) {
  return { params: Promise.resolve({ date }) }
}
async function authed(method: string, date: string, body?: unknown): Promise<Request> {
  const { plaintext } = await createAgentToken('test')
  return new Request(`http://x/api/agent/journal/${date}`, {
    method,
    headers: { Authorization: `Bearer ${plaintext}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('/api/agent/journal/[date]', () => {
  beforeEach(() => truncateAll())

  it('refuse sans token (401)', async () => {
    const day = parisToday()
    const res = await GET(new Request(`http://x/api/agent/journal/${day}`), ctx(day))
    expect(res.status).toBe(401)
  })

  it('PUT puis GET : shutdown normal complet', async () => {
    const day = parisToday()
    const put = await PUT(await authed('PUT', day, {
      focus_outcome: 'done', deep_work: true,
      shutdown_at: '2026-07-04T18:30:00.000Z', shutdown_mode: 'normal',
    }), ctx(day))
    expect(put.status).toBe(200)
    const body = await (await GET(await authed('GET', day), ctx(day))).json()
    expect(body.focus_outcome).toBe('done')
    expect(body.deep_work).toBe(true)
    expect(body.shutdown_mode).toBe('normal')
  })

  it('PUT accepte expired (clôture dégradée)', async () => {
    const day = parisToday()
    const put = await PUT(await authed('PUT', day, {
      focus_outcome: 'expired', shutdown_mode: 'degrade',
    }), ctx(day))
    expect((await put.json()).focus_outcome).toBe('expired')
  })

  it('GET renvoie null quand rien n\'est écrit', async () => {
    const day = parisToday()
    const res = await GET(await authed('GET', day), ctx(day))
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })

  it('date mal formée → 400 ; corps vide → 400', async () => {
    const bad = await GET(await authed('GET', 'pas-une-date'), ctx('pas-une-date'))
    expect(bad.status).toBe(400)
    const empty = await PUT(await authed('PUT', parisToday(), {}), ctx(parisToday()))
    expect(empty.status).toBe(400)
  })
})
