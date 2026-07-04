import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { GET, POST } from '@/app/api/agent/week-priorities/route'
import { PATCH, DELETE } from '@/app/api/agent/week-priorities/[id]/route'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { parisMonday } from '@/lib/week'

afterAll(() => closePool())

async function bearer(): Promise<string> {
  const { plaintext } = await createAgentToken('test')
  return `Bearer ${plaintext}`
}
async function post(body: unknown) {
  return POST(new Request('http://x/api/agent/week-priorities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
    body: JSON.stringify(body),
  }))
}

describe('/api/agent/week-priorities', () => {
  beforeEach(() => truncateAll())

  it('refuse sans token (401)', async () => {
    const res = await GET(new Request('http://x/api/agent/week-priorities'))
    expect(res.status).toBe(401)
  })

  it('POST puis GET sur la semaine courante', async () => {
    await post({ text: 'Candidatures' })
    const res = await GET(new Request('http://x/api/agent/week-priorities', {
      headers: { Authorization: await bearer() },
    }))
    const rows = await res.json()
    expect(rows.map((p: { text: string }) => p.text)).toEqual(['Candidatures'])
    expect(rows[0].week_start).toBe(parisMonday())
  })

  it('POST avec week_start explicite (lundi suivant) + GET filtré', async () => {
    const [y, m, d] = parisMonday().split('-').map(Number)
    const anchor = new Date(Date.UTC(y, m - 1, d, 12))
    anchor.setUTCDate(anchor.getUTCDate() + 7)
    const next = anchor.toISOString().slice(0, 10)
    await post({ text: 'Semaine prochaine', week_start: next })
    const res = await GET(new Request(`http://x/api/agent/week-priorities?week_start=${next}`, {
      headers: { Authorization: await bearer() },
    }))
    expect((await res.json()).map((p: { text: string }) => p.text)).toEqual(['Semaine prochaine'])
  })

  it('4e priorité → 409 ; week_start non-lundi → 400', async () => {
    await post({ text: 'Un' })
    await post({ text: 'Deux' })
    await post({ text: 'Trois' })
    expect((await post({ text: 'Quatre' })).status).toBe(409)
    expect((await post({ text: 'x', week_start: '2999-01-05' })).status).toBe(400) // pas un lundi
  })

  it('PATCH done, DELETE, 404 sur id inconnu', async () => {
    const created = await (await post({ text: 'À finir' })).json()
    const patched = await PATCH(new Request(`http://x/api/agent/week-priorities/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: await bearer() },
      body: JSON.stringify({ done: true }),
    }), { params: Promise.resolve({ id: String(created.id) }) })
    expect((await patched.json()).done).toBe(true)
    const del = await DELETE(new Request(`http://x/api/agent/week-priorities/${created.id}`, {
      method: 'DELETE', headers: { Authorization: await bearer() },
    }), { params: Promise.resolve({ id: String(created.id) }) })
    expect(del.status).toBe(204)
    const notFound = await DELETE(new Request('http://x/api/agent/week-priorities/999999', {
      method: 'DELETE', headers: { Authorization: await bearer() },
    }), { params: Promise.resolve({ id: '999999' }) })
    expect(notFound.status).toBe(404)
  })
})
