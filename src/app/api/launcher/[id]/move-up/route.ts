import { NextResponse } from 'next/server'
import { moveTileUp } from '@/lib/queries/launcher'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  try {
    await moveTileUp(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/launcher move-up]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
