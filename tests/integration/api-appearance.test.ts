import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'launcher-uploads-'))
  process.env.UPLOAD_DIR = uploadDir
})

afterAll(async () => {
  await rm(uploadDir, { recursive: true, force: true })
  await closePool()
})

async function postBackground(body: Uint8Array, contentType = 'image/png') {
  const { POST } = await import('@/app/api/appearance/background/route')
  const r = await POST(new Request('http://x/api/appearance/background', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: body as BodyInit,
  }))
  const isJson = r.headers.get('content-type')?.includes('application/json')
  return { status: r.status, body: isJson ? await r.json() : null }
}

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

function makePng(sizeBytes: number): Uint8Array {
  const buf = new Uint8Array(sizeBytes)
  buf.set(PNG_HEADER, 0)
  return buf
}

function makeJpeg(sizeBytes: number): Uint8Array {
  const buf = new Uint8Array(sizeBytes)
  buf.set(JPEG_HEADER, 0)
  return buf
}

describe('POST /api/appearance/background', () => {
  beforeEach(() => truncateAll())

  it('accepts a valid PNG and writes it to disk', async () => {
    const r = await postBackground(makePng(1024))
    expect(r.status).toBe(200)
    expect(r.body.background_image_path).toMatch(/^bg-[0-9a-f-]+\.png$/)

    const files = await readdir(uploadDir)
    expect(files).toContain(r.body.background_image_path)
  })

  it('updates app_appearance row', async () => {
    const { getAppAppearance } = await import('@/lib/queries/appearance')
    await postBackground(makePng(2048))
    const appearance = await getAppAppearance()
    expect(appearance?.background_image_path).toMatch(/^bg-[0-9a-f-]+\.png$/)
  })

  it('accepts JPEG', async () => {
    const r = await postBackground(makeJpeg(512), 'image/jpeg')
    expect(r.status).toBe(200)
    expect(r.body.background_image_path).toMatch(/\.jpg$/)
  })

  it('rejects buffer over 5 MB', async () => {
    const tooBig = makePng(5 * 1024 * 1024 + 1)
    const r = await postBackground(tooBig)
    expect(r.status).toBe(413)
  })

  it('rejects unrecognized magic bytes', async () => {
    const gif = new Uint8Array(64)
    gif.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0)
    const r = await postBackground(gif, 'image/png')
    expect(r.status).toBe(415)
  })

  it('deletes the previous file when uploading a new one', async () => {
    const r1 = await postBackground(makePng(512))
    const oldName = r1.body.background_image_path
    const r2 = await postBackground(makePng(512))
    const newName = r2.body.background_image_path
    expect(newName).not.toBe(oldName)

    const files = await readdir(uploadDir)
    expect(files).toContain(newName)
    expect(files).not.toContain(oldName)
  })
})

async function deleteBackground() {
  const { DELETE } = await import('@/app/api/appearance/background/route')
  const r = await DELETE(new Request('http://x/api/appearance/background', { method: 'DELETE' }))
  return { status: r.status, body: await r.json() }
}

describe('DELETE /api/appearance/background', () => {
  beforeEach(() => truncateAll())

  it('clears path and removes the file', async () => {
    const postRes = await postBackground(makePng(256))
    const createdName = postRes.body.background_image_path

    const r = await deleteBackground()
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)

    const { getAppAppearance } = await import('@/lib/queries/appearance')
    const appearance = await getAppAppearance()
    expect(appearance?.background_image_path).toBeNull()

    const files = await readdir(uploadDir)
    expect(files).not.toContain(createdName)
  })

  it('is a no-op when no image is set', async () => {
    const r = await deleteBackground()
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)
  })
})

async function patchAppearance(body: object) {
  const { PATCH } = await import('@/app/api/appearance/route')
  const r = await PATCH(new Request('http://x/api/appearance', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
  return { status: r.status, body: await r.json() }
}

describe('PATCH /api/appearance', () => {
  beforeEach(() => truncateAll())

  it('updates background_dim_pct', async () => {
    const r = await patchAppearance({ background_dim_pct: 45 })
    expect(r.status).toBe(200)
    expect(r.body.background_dim_pct).toBe(45)
  })

  it('rejects negative dim', async () => {
    const r = await patchAppearance({ background_dim_pct: -5 })
    expect(r.status).toBe(400)
  })

  it('rejects dim above 60', async () => {
    const r = await patchAppearance({ background_dim_pct: 80 })
    expect(r.status).toBe(400)
  })

  it('rejects non-integer dim', async () => {
    const r = await patchAppearance({ background_dim_pct: 22.5 })
    expect(r.status).toBe(400)
  })

  it('ignores extra fields silently', async () => {
    const r = await patchAppearance({ background_dim_pct: 40, foo: 'bar' })
    expect(r.status).toBe(200)
    expect(r.body.background_dim_pct).toBe(40)
  })
})
