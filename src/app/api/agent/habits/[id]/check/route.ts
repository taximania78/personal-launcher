import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { findDeepWorkHabit, setHabitCheck } from '@/lib/queries/habits'
import { upsertDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'

type Ctx = { params: Promise<{ id: string }> }

const checkSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checked: z.boolean().optional().default(true),
})

export async function POST(req: Request, ctx: Ctx) {
  const denied = await requireAgent(req)
  if (denied) return denied

  const { id: idStr } = await ctx.params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const json = await req.json().catch(() => null)
  const parsed = checkSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  const day = parsed.data.day ?? parisToday()
  try {
    const result = await setHabitCheck(id, day, parsed.data.checked)
    // Sync bidirectionnelle : idem que la route UI, côté agent.
    const habit = await findDeepWorkHabit()
    if (habit && habit.id === id) await upsertDayJournal(day, { deep_work: result.checked })
    return NextResponse.json(result)
  } catch (err) {
    if ((err as { code?: string }).code === '23503') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/agent/habits check POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
