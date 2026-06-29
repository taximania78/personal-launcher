import { NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from '@/lib/env'
import { detectImageMime } from '@/lib/upload/magic-bytes'
import { getAppAppearance, updateAppAppearance } from '@/lib/queries/appearance'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: Request) {
  const buf = new Uint8Array(await req.arrayBuffer())
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'empty body' }, { status: 400 })
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 5 MB)' }, { status: 413 })
  }

  const detected = detectImageMime(buf)
  if (!detected) {
    return NextResponse.json({ error: 'unsupported image type (JPEG/PNG/WebP only)' }, { status: 415 })
  }

  await mkdir(env.UPLOAD_DIR, { recursive: true })
  const filename = `bg-${randomUUID()}.${detected.ext}`
  const fullPath = path.join(env.UPLOAD_DIR, filename)

  try {
    await writeFile(fullPath, buf)
  } catch (err) {
    console.error('[POST /api/appearance/background] write failed', err)
    return NextResponse.json({ error: 'storage error' }, { status: 500 })
  }

  let previousPath: string | null = null
  try {
    const current = await getAppAppearance()
    previousPath = current?.background_image_path ?? null
    await updateAppAppearance({ background_image_path: filename })
  } catch (err) {
    console.error('[POST /api/appearance/background] db update failed, rolling back file', err)
    await unlink(fullPath).catch(() => {})
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }

  if (previousPath) {
    await unlink(path.join(env.UPLOAD_DIR, previousPath)).catch((err) => {
      console.warn('[POST /api/appearance/background] failed to remove previous file', err)
    })
  }

  return NextResponse.json({ background_image_path: filename })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_req: Request) {
  let current
  try {
    current = await getAppAppearance()
  } catch (err) {
    console.error('[DELETE /api/appearance/background] db read failed', err)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }

  const previousPath = current?.background_image_path ?? null

  try {
    await updateAppAppearance({ background_image_path: null })
  } catch (err) {
    console.error('[DELETE /api/appearance/background] db update failed', err)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }

  if (previousPath) {
    await unlink(path.join(env.UPLOAD_DIR, previousPath)).catch((err) => {
      console.warn('[DELETE /api/appearance/background] file removal failed', err)
    })
  }

  return NextResponse.json({ ok: true })
}
