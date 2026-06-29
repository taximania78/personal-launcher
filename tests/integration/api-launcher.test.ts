import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { POST as POSTCreate } from '@/app/api/launcher/route'
import { PATCH, DELETE } from '@/app/api/launcher/[id]/route'
import { POST as POSTMoveUp } from '@/app/api/launcher/[id]/move-up/route'
import { POST as POSTMoveDown } from '@/app/api/launcher/[id]/move-down/route'

afterAll(() => closePool())

async function create(body: object) {
  const r = await POSTCreate(new Request('http://x/api/launcher', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  return { status: r.status, body: await r.json() }
}

describe('POST /api/launcher', () => {
  beforeEach(() => truncateAll())

  it('creates a tile', async () => {
    const r = await create({ name: 'A', icon: '🅰', href: 'https://a' })
    expect(r.status).toBe(200)
    expect(r.body.name).toBe('A')
    expect(r.body.position).toBe(0)
  })

  it('rejects empty name', async () => {
    const r = await create({ name: '', icon: 'x', href: 'https://x' })
    expect(r.status).toBe(400)
  })

  it('rejects name > 32 chars', async () => {
    const r = await create({ name: 'x'.repeat(33), icon: 'x', href: 'https://x' })
    expect(r.status).toBe(400)
  })
})

describe('PATCH /api/launcher/:id', () => {
  beforeEach(() => truncateAll())

  it('updates name', async () => {
    const created = (await create({ name: 'A', icon: '🅰', href: 'https://a' })).body
    const r = await PATCH(
      new Request(`http://x/api/launcher/${created.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A2' }),
      }),
      { params: Promise.resolve({ id: String(created.id) }) },
    )
    expect(r.status).toBe(200)
    expect((await r.json()).name).toBe('A2')
  })

  it('returns 404 on unknown id', async () => {
    const r = await PATCH(
      new Request('http://x/api/launcher/99999', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x' }),
      }),
      { params: Promise.resolve({ id: '99999' }) },
    )
    expect(r.status).toBe(404)
  })
})

describe('DELETE /api/launcher/:id', () => {
  beforeEach(() => truncateAll())

  it('deletes', async () => {
    const c = (await create({ name: 'A', icon: 'a', href: 'https://a' })).body
    const r = await DELETE(
      new Request(`http://x/api/launcher/${c.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: String(c.id) }) },
    )
    expect(r.status).toBe(204)
    const list = await testPool.query('SELECT * FROM launcher_tiles')
    expect(list.rowCount).toBe(0)
  })
})

describe('POST /api/launcher/:id/move-up and move-down', () => {
  beforeEach(() => truncateAll())

  it('move-up swaps positions', async () => {
    const a = (await create({ name: 'A', icon: 'a', href: 'https://a' })).body
    const b = (await create({ name: 'B', icon: 'b', href: 'https://b' })).body
    const r = await POSTMoveUp(
      new Request(`http://x/api/launcher/${b.id}/move-up`, { method: 'POST' }),
      { params: Promise.resolve({ id: String(b.id) }) },
    )
    expect(r.status).toBe(204)
    const list = await testPool.query('SELECT name FROM launcher_tiles ORDER BY position')
    expect(list.rows.map(r => r.name)).toEqual(['B', 'A'])
    expect(a).toBeTruthy()
  })

  it('move-down swaps positions', async () => {
    const a = (await create({ name: 'A', icon: 'a', href: 'https://a' })).body
    const b = (await create({ name: 'B', icon: 'b', href: 'https://b' })).body
    const r = await POSTMoveDown(
      new Request(`http://x/api/launcher/${a.id}/move-down`, { method: 'POST' }),
      { params: Promise.resolve({ id: String(a.id) }) },
    )
    expect(r.status).toBe(204)
    const list = await testPool.query('SELECT name FROM launcher_tiles ORDER BY position')
    expect(list.rows.map(r => r.name)).toEqual(['B', 'A'])
    expect(b).toBeTruthy()
  })
})
