import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createLauncherTile } from '@/lib/queries/launcher'
import { isSafeHref, SAFE_HREF_MESSAGE } from '@/lib/validation/url'

const createSchema = z.object({
  name: z.string().min(1).max(32),
  icon: z.string().min(1),
  href: z.string().min(1).refine(isSafeHref, SAFE_HREF_MESSAGE),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const tile = await createLauncherTile(parsed.data.name, parsed.data.icon, parsed.data.href)
    return NextResponse.json(tile)
  } catch (err) {
    console.error('[api/launcher POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
