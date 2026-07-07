import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createTodo } from '@/lib/queries/todos'
import { parisToday, parisTomorrow } from '@/lib/week'
import { pushTodoSync } from '@/lib/n8n'

// Le focus est agent-only (spec §2.2) : is_focus n'existe plus côté routes UI.
const createSchema = z.object({
  text: z.string().min(1).max(280),
  when: z.enum(['today', 'tomorrow']).optional().default('today'),
  scheduled_for: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const date = parsed.data.scheduled_for
      ?? (parsed.data.when === 'tomorrow' ? parisTomorrow() : parisToday())
    const todo = await createTodo(parsed.data.text, false, date)
    pushTodoSync('created', todo)
    return NextResponse.json(todo)
  } catch (err) {
    console.error('[api/todo POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
