import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'launcher-bg-current-'))
  process.env.UPLOAD_DIR = uploadDir
})

afterAll(async () => {
  await rm(uploadDir, { recursive: true, force: true })
  await closePool()
})

async function get(headers: HeadersInit = {}) {
  const { GET } = await import('@/app/api/bg/current/route')
  return GET(new Request('http://x/api/bg/current', { headers }))
}

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('GET /api/bg/current', () => {
  beforeEach(() => truncateAll())

  it('returns 404 when no image is set', async () => {
    const r = await get()
    expect(r.status).toBe(404)
  })

  it('streams the file when set, with correct content-type', async () => {
    const buf = new Uint8Array(64)
    buf.set(PNG_HEADER, 0)
    const filename = `bg-${randomUUID()}.png`
    await writeFile(path.join(uploadDir, filename), buf)
    const { updateAppAppearance } = await import('@/lib/queries/appearance')
    await updateAppAppearance({ background_image_path: filename })

    const r = await get()
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/png')
    expect(r.headers.get('cache-control')).toMatch(/max-age=\d+/)
    expect(r.headers.get('etag')).toBeTruthy()
    const body = new Uint8Array(await r.arrayBuffer())
    expect(body.byteLength).toBe(64)
  })

  it('returns 304 when If-None-Match matches', async () => {
    const buf = new Uint8Array(32)
    buf.set(PNG_HEADER, 0)
    const filename = `bg-${randomUUID()}.png`
    await writeFile(path.join(uploadDir, filename), buf)
    const { updateAppAppearance } = await import('@/lib/queries/appearance')
    await updateAppAppearance({ background_image_path: filename })

    const first = await get()
    const etag = first.headers.get('etag')!
    expect(etag).toBeTruthy()

    const second = await get({ 'If-None-Match': etag })
    expect(second.status).toBe(304)
  })

  it('returns 404 when DB references a non-existent file', async () => {
    const { updateAppAppearance } = await import('@/lib/queries/appearance')
    await updateAppAppearance({ background_image_path: `bg-${randomUUID()}.jpg` })
    const r = await get()
    expect(r.status).toBe(404)
  })
})
