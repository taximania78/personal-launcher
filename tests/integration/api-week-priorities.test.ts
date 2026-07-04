import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { GET, POST } from '@/app/api/week-priorities/route'
import { PATCH, DELETE } from '@/app/api/week-priorities/[id]/route'
import { parisMonday } from '@/lib/week'

afterAll(() => closePool())

function post(body: unknown): Request {
  return new Request('http://x/api/week-priorities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/week-priorities (UI, semaine courante)', () => {
  beforeEach(() => truncateAll())

  it('POST puis GET sur la semaine courante', async () => {
    expect((await POST(post({ text: 'Cap de la semaine' }))).status).toBe(200)
    const rows = await (await GET()).json()
    expect(rows.map((p: { text: string }) => p.text)).toEqual(['Cap de la semaine'])
    expect(rows[0].week_start).toBe(parisMonday())
  })

  it('limite 3 → 409 ; texte vide → 400', async () => {
    await POST(post({ text: 'Un' }))
    await POST(post({ text: 'Deux' }))
    await POST(post({ text: 'Trois' }))
    expect((await POST(post({ text: 'Quatre' }))).status).toBe(409)
    expect((await POST(post({ text: '' }))).status).toBe(400)
  })

  it('PATCH done/text, DELETE, 404 sur id inconnu', async () => {
    const p = await (await POST(post({ text: 'À finir' }))).json()
    const patched = await PATCH(new Request(`http://x/api/week-priorities/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    }), { params: Promise.resolve({ id: String(p.id) }) })
    expect((await patched.json()).done).toBe(true)
    const del = await DELETE(new Request(`http://x/api/week-priorities/${p.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(p.id) }) })
    expect(del.status).toBe(204)
    const notFound = await PATCH(new Request('http://x/api/week-priorities/999999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    }), { params: Promise.resolve({ id: '999999' }) })
    expect(notFound.status).toBe(404)
  })
})
