import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { createFocusTodo, setFocus, clearFocus } from '@/lib/queries/todos'
import { upsertDayJournal } from '@/lib/queries/journal'
import { parisToday, parisTomorrow } from '@/lib/week'
import { pushTodoSync } from '@/lib/n8n'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const putSchema = z
  .object({
    text: z.string().min(1).max(280).optional(),
    todo_id: z.coerce.number().int().positive().optional(),
    when: z.union([z.enum(['today', 'tomorrow']), z.string().regex(DATE_RE)]).default('today'),
    why: z.string().max(280).optional(),
  })
  .refine((d) => (d.text !== undefined) !== (d.todo_id !== undefined), {
    message: 'fournir exactement un de text | todo_id',
  })

function resolveDate(when: string): string {
  if (when === 'today') return parisToday()
  if (when === 'tomorrow') return parisTomorrow()
  return when
}

export async function PUT(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied

  const json = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  const { text, todo_id, when, why } = parsed.data
  const date = resolveDate(when)
  try {
    const todo =
      text !== undefined
        ? await createFocusTodo(text, date)
        : await setFocus(todo_id!, date)
    await upsertDayJournal(date, {
      focus_todo_id: todo.id,
      focus_text: todo.text,
      ...(why !== undefined ? { why } : {}),
    })
    pushTodoSync(text !== undefined ? 'created' : 'updated', todo)
    return NextResponse.json({ id: todo.id, text: todo.text, date })
  } catch (err) {
    if ((err as Error).message?.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/focus PUT]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const date = new URL(req.url).searchParams.get('date') ?? parisToday()
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 })
  }
  try {
    await clearFocus(date)
    await upsertDayJournal(date, {
      focus_todo_id: null,
      focus_text: null,
      why: null,
      focus_outcome: 'not_set',
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[api/agent/focus DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
