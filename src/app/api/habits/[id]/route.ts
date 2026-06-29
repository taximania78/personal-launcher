import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateHabit, deleteHabit } from '@/lib/queries/habits'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().min(1).max(60).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, { message: 'empty patch' })

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })

  try {
    const habit = await updateHabit(id, parsed.data)
    return NextResponse.json(habit)
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/habits PATCH]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  try {
    await deleteHabit(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/habits DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
