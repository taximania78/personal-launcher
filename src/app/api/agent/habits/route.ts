import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { createHabit } from '@/lib/queries/habits'

const createSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(60).nullable().optional(),
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
    const habit = await createHabit(parsed.data.name, parsed.data.icon ?? null)
    return NextResponse.json(habit)
  } catch (err) {
    console.error('[api/agent/habits POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
