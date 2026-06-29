import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  toggleTodo, updateTodoText, setFocus, clearFocus, deleteTodo,
  type Todo,
} from '@/lib/queries/todos'
import { withWriterTx } from '@/lib/db'
import { pushTodoSync, type TodoAction } from '@/lib/n8n'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  text: z.string().min(1).max(280).optional(),
  done: z.boolean().optional(),
  is_focus: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
})

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })

  // Determine action: 'toggled' if only `done` changed, else 'updated'
  const keys = Object.keys(parsed.data)
  const action: TodoAction = keys.length === 1 && keys[0] === 'done' ? 'toggled' : 'updated'

  try {
    let result: Todo | null = null

    if (parsed.data.is_focus === true) {
      result = await setFocus(id)
    } else if (parsed.data.is_focus === false) {
      await clearFocus()
      result = await withWriterTx(async (c) => {
        const r = await c.query<Todo>(`SELECT id, text, done, position, is_focus, created_at, updated_at FROM todos WHERE id = $1`, [id])
        if (r.rowCount === 0) throw new Error('not_found')
        return r.rows[0]
      })
    }

    if (parsed.data.done !== undefined) {
      // Use toggleTodo (idempotent NOT done); the client-supplied boolean
      // is informational only — optimistic UI handles state tracking.
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
          RETURNING id, text, done, position, is_focus, created_at, updated_at
        `, [id, parsed.data.position])
        if (r.rowCount === 0) throw new Error('not_found')
        return r.rows[0]
      })
    }

    if (!result) {
      result = await withWriterTx(async (c) => {
        const r = await c.query<Todo>(`SELECT id, text, done, position, is_focus, created_at, updated_at FROM todos WHERE id = $1`, [id])
        if (r.rowCount === 0) throw new Error('not_found')
        return r.rows[0]
      })
    }

    pushTodoSync(action, result)
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
