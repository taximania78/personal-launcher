import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { setTodoDone, updateTodoText, deleteTodo, rescheduleTodo, type Todo } from '@/lib/queries/todos'
import { pushTodoSync } from '@/lib/n8n'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().min(1).max(280).optional(),
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (d) => d.done !== undefined || d.text !== undefined || d.scheduled_for !== undefined,
  { message: 'au moins un champ requis (done, text, scheduled_for)' },
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
    let result: Todo | null = null
    if (parsed.data.scheduled_for !== undefined) result = await rescheduleTodo(id, parsed.data.scheduled_for)
    if (parsed.data.done !== undefined) result = await setTodoDone(id, parsed.data.done)
    if (parsed.data.text !== undefined) result = await updateTodoText(id, parsed.data.text)
    pushTodoSync('updated', result!)
    return NextResponse.json(result)
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/todos PATCH]', err)
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
    await deleteTodo(id)
    pushTodoSync('deleted', { id, text: '', done: false, is_focus: false, position: 0 })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/todos DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
