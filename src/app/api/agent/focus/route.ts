import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { createFocusTodo, clearFocus } from '@/lib/queries/todos'
import { pushTodoSync } from '@/lib/n8n'

const putSchema = z.object({ text: z.string().min(1).max(280) })

export async function PUT(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied

  const json = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const todo = await createFocusTodo(parsed.data.text)
    pushTodoSync('created', todo)
    return NextResponse.json({ id: todo.id, text: todo.text })
  } catch (err) {
    console.error('[api/agent/focus PUT]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied
  try {
    await clearFocus()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[api/agent/focus DELETE]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
