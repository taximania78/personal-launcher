import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { PATCH } from '@/app/api/config/route'

afterAll(() => closePool())

async function patch(body: object) {
  const r = await PATCH(new Request('http://x/api/config', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  return { status: r.status, body: await r.json() }
}

describe('PATCH /api/config', () => {
  beforeEach(() => truncateAll())

  it('updates whoogle_url', async () => {
    const r = await patch({ whoogle_url: 'https://whoogle.example.com' })
    expect(r.status).toBe(200)
    expect(r.body.whoogle_url).toBe('https://whoogle.example.com')
  })

  it('updates focus_default', async () => {
    const r = await patch({ focus_default: 'Aucun focus' })
    expect(r.status).toBe(200)
    expect(r.body.focus_default).toBe('Aucun focus')
  })

  it('treats empty string as null', async () => {
    await patch({ whoogle_url: 'https://x' })
    const r = await patch({ whoogle_url: '' })
    expect(r.body.whoogle_url).toBeNull()
  })

  it('rejects non-string field', async () => {
    const r = await patch({ whoogle_url: 42 })
    expect(r.status).toBe(400)
  })
})
