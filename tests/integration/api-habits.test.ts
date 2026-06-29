// Pools already point at test DB via tests/setup.ts env remap
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { parisToday, parisWeekDays } from '@/lib/week'

afterAll(() => closePool())

import { POST } from '@/app/api/habits/route'
import { PATCH, DELETE } from '@/app/api/habits/[id]/route'
import { POST as CHECK } from '@/app/api/habits/check/route'

function jsonReq(url: string, method: string, body: unknown) {
  return new Request(url, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/habits', () => {
  beforeEach(() => truncateAll())

  it('crée une habitude', async () => {
    const res = await POST(jsonReq('http://x/api/habits', 'POST', { name: 'Deep work', icon: 'brain' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Deep work')
    expect(body.icon).toBe('brain')
    expect(body.active).toBe(true)
  })

  it('400 si nom vide', async () => {
    const res = await POST(jsonReq('http://x/api/habits', 'POST', { name: '' }))
    expect(res.status).toBe(400)
  })
})

describe('PATCH/DELETE /api/habits/:id', () => {
  beforeEach(() => truncateAll())

  async function seed() {
    return (await POST(jsonReq('http://x/api/habits', 'POST', { name: 'Yoga' }))).json()
  }

  it('renomme et désactive', async () => {
    const h = await seed()
    const res = await PATCH(
      jsonReq(`http://x/api/habits/${h.id}`, 'PATCH', { name: 'Yoga du soir', active: false }),
      { params: Promise.resolve({ id: String(h.id) }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Yoga du soir')
    expect(body.active).toBe(false)
  })

  it('404 sur id inconnu', async () => {
    const res = await PATCH(
      jsonReq('http://x/api/habits/999', 'PATCH', { name: 'x' }),
      { params: Promise.resolve({ id: '999' }) },
    )
    expect(res.status).toBe(404)
  })

  it('supprime → 204 puis 404', async () => {
    const h = await seed()
    const ctx = { params: Promise.resolve({ id: String(h.id) }) }
    expect((await DELETE(new Request('http://x', { method: 'DELETE' }), ctx)).status).toBe(204)
    expect((await DELETE(new Request('http://x', { method: 'DELETE' }), ctx)).status).toBe(404)
  })
})

describe('POST /api/habits/check', () => {
  beforeEach(() => truncateAll())

  it('toggle aujourd’hui : coche puis décoche', async () => {
    const h = await (await POST(jsonReq('http://x/api/habits', 'POST', { name: 'Méditation' }))).json()
    const day = parisToday()
    const r1 = await CHECK(jsonReq('http://x/api/habits/check', 'POST', { habit_id: h.id, day }))
    expect(r1.status).toBe(200)
    expect(await r1.json()).toEqual({ checked: true })
    const r2 = await CHECK(jsonReq('http://x/api/habits/check', 'POST', { habit_id: h.id, day }))
    expect(await r2.json()).toEqual({ checked: false })
  })

  it('400 sur jour futur de la semaine', async () => {
    const h = await (await POST(jsonReq('http://x/api/habits', 'POST', { name: 'x' }))).json()
    const week = parisWeekDays()
    const future = week.find(d => d > parisToday())
    // Un dimanche, il n'y a pas de jour futur dans la semaine — le test est alors sans objet
    if (!future) return
    const res = await CHECK(jsonReq('http://x/api/habits/check', 'POST', { habit_id: h.id, day: future }))
    expect(res.status).toBe(400)
  })

  it('400 sur jour hors semaine courante', async () => {
    const h = await (await POST(jsonReq('http://x/api/habits', 'POST', { name: 'x' }))).json()
    const res = await CHECK(jsonReq('http://x/api/habits/check', 'POST', { habit_id: h.id, day: '2020-01-01' }))
    expect(res.status).toBe(400)
  })

  it('404 sur habitude inconnue', async () => {
    const res = await CHECK(jsonReq('http://x/api/habits/check', 'POST', { habit_id: 999, day: parisToday() }))
    expect(res.status).toBe(404)
  })
})
