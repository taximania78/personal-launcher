import { NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { env } from '@/lib/env'
import { getAppAppearance } from '@/lib/queries/appearance'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const FILENAME_RE = /^bg-[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$/

export async function GET(req: Request) {
  let appearance
  try {
    appearance = await getAppAppearance()
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const filename = appearance?.background_image_path
  if (!filename) {
    return new NextResponse(null, { status: 404 })
  }

  if (!FILENAME_RE.test(filename)) {
    return new NextResponse(null, { status: 404 })
  }

  const fullPath = path.join(env.UPLOAD_DIR, filename)
  let bytes: Buffer
  let st
  try {
    st = await stat(fullPath)
    bytes = await readFile(fullPath)
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const etag = `"${createHash('sha1').update(`${filename}:${st.mtimeMs}:${st.size}`).digest('hex')}"`
  const ifNoneMatch = req.headers.get('if-none-match')
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  const ext = path.extname(filename).toLowerCase()
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=86400',
      'ETag': etag,
    },
  })
}
