import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { createTodo } from '@/lib/queries/todos'
import { parisTomorrow } from '@/lib/week'
import { pushTodoSync } from '@/lib/n8n'

const createSchema = z.object({
  text: z.string().min(1).max(280),
  when: z.enum(['today', 'tomorrow']).optional().default('today'),
})

export async function POST(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied

  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const todo = parsed.data.when === 'tomorrow'
      ? await createTodo(parsed.data.text, false, parisTomorrow())
      : await createTodo(parsed.data.text, false)
    pushTodoSync('created', todo)
    return NextResponse.json(todo)
  } catch (err) {
    console.error('[api/agent/todos POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
