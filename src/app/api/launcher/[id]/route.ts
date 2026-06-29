import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateLauncherTile, deleteLauncherTile } from '@/lib/queries/launcher'
import { isSafeHref, SAFE_HREF_MESSAGE } from '@/lib/validation/url'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  icon: z.string().min(1).optional(),
  href: z.string().min(1).refine(isSafeHref, SAFE_HREF_MESSAGE).optional(),
})

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })

  try {
    const tile = await updateLauncherTile(id, parsed.data)
    return NextResponse.json(tile)
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/launcher PATCH]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  try {
    await deleteLauncherTile(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/launcher DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
