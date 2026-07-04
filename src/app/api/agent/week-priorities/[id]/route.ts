import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { updateWeekPriority, deleteWeekPriority } from '@/lib/queries/week-priorities'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  text: z.string().min(1).max(120).optional(),
  done: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
}).refine(
  (d) => d.text !== undefined || d.done !== undefined || d.position !== undefined,
  { message: 'au moins un champ requis (text, done, position)' },
)

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    return NextResponse.json(await updateWeekPriority(id, parsed.data))
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/week-priorities PATCH]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  try {
    await deleteWeekPriority(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/week-priorities DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
