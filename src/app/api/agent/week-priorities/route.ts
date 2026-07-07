import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgent } from '@/lib/agent-auth'
import { listWeekPriorities, createWeekPriority } from '@/lib/queries/week-priorities'
import { parisMonday } from '@/lib/week'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Un week_start doit être un lundi (contrainte SQL ISODOW=1) — validé ici pour
// renvoyer un 400 propre plutôt qu'une violation de CHECK.
function isMonday(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 1
}

const postSchema = z.object({
  text: z.string().min(1).max(120),
  week_start: z.string().regex(DATE_RE).optional(),
})

export async function GET(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const weekStart = new URL(req.url).searchParams.get('week_start') ?? parisMonday()
  if (!DATE_RE.test(weekStart)) {
    return NextResponse.json({ error: 'invalid week_start' }, { status: 400 })
  }
  try {
    return NextResponse.json(await listWeekPriorities(weekStart))
  } catch (err) {
    console.error('[api/agent/week-priorities GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied
  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  const weekStart = parsed.data.week_start ?? parisMonday()
  if (!isMonday(weekStart)) {
    return NextResponse.json({ error: 'week_start doit être un lundi' }, { status: 400 })
  }
  try {
    return NextResponse.json(await createWeekPriority(weekStart, parsed.data.text))
  } catch (err) {
    if ((err as Error).message?.includes('limit')) {
      return NextResponse.json({ error: 'limit' }, { status: 409 })
    }
    console.error('[api/agent/week-priorities POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
