import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  toggleTodo, updateTodoText, rescheduleTodo, deleteTodo,
  type Todo,
} from '@/lib/queries/todos'
import { withWriterTx } from '@/lib/db'
import { pushTodoSync, type TodoAction } from '@/lib/n8n'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  text: z.string().min(1).max(280).optional(),
  done: z.boolean().optional(),
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  position: z.number().int().nonnegative().optional(),
}).refine(
  (d) => d.text !== undefined || d.done !== undefined
      || d.scheduled_for !== undefined || d.position !== undefined,
  { message: 'au moins un champ requis (text, done, scheduled_for, position)' },
)

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })

  // 'toggled' si seul `done` change, sinon 'updated' (parité webhook existante)
  const keys = Object.keys(parsed.data)
  const action: TodoAction = keys.length === 1 && keys[0] === 'done' ? 'toggled' : 'updated'

  try {
    let result: Todo | null = null

    if (parsed.data.scheduled_for !== undefined) {
      result = await rescheduleTodo(id, parsed.data.scheduled_for)
    }

    if (parsed.data.done !== undefined) {
      // toggleTodo (idempotence gérée par l'UI optimiste), comportement existant conservé
      result = await toggleTodo(id)
    }

    if (parsed.data.text !== undefined) {
      result = await updateTodoText(id, parsed.data.text)
    }

    if (parsed.data.position !== undefined) {
      result = await withWriterTx(async (c) => {
        const r = await c.query<Todo>(`
          UPDATE todos SET position = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING id, text, done, position, is_focus, created_at, updated_at, postponed_count
        `, [id, parsed.data.position])
        if (r.rowCount === 0) throw new Error('not_found')
        return r.rows[0]
      })
    }

    pushTodoSync(action, result!)
    return NextResponse.json(result)
  } catch (err) {
    if ((err as Error).message?.includes('not_found') || (err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/todo PATCH]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
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
    console.error('[api/todo DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
