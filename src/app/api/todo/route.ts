import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createTodo, createFocusTodo } from '@/lib/queries/todos'
import { parisTomorrow } from '@/lib/week'
import { pushTodoSync } from '@/lib/n8n'

const createSchema = z.object({
  text: z.string().min(1).max(280),
  is_focus: z.boolean().optional().default(false),
  when: z.enum(['today', 'tomorrow']).optional().default('today'),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    let todo
    if (parsed.data.is_focus) {
      todo = await createFocusTodo(parsed.data.text)
    } else if (parsed.data.when === 'tomorrow') {
      todo = await createTodo(parsed.data.text, false, parisTomorrow())
    } else {
      todo = await createTodo(parsed.data.text, false)
    }
    pushTodoSync('created', todo)
    return NextResponse.json(todo)
  } catch (err) {
    console.error('[api/todo POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
