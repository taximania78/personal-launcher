import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listWeekPriorities, createWeekPriority } from '@/lib/queries/week-priorities'
import { parisMonday } from '@/lib/week'

// Route UI (LAN, sans auth). La carte ne gère que la semaine courante ;
// pour une autre semaine, passer par /api/agent/week-priorities.
const postSchema = z.object({ text: z.string().min(1).max(120) })

export async function GET() {
  try {
    return NextResponse.json(await listWeekPriorities(parisMonday()))
  } catch (err) {
    console.error('[api/week-priorities GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    return NextResponse.json(await createWeekPriority(parisMonday(), parsed.data.text))
  } catch (err) {
    if ((err as Error).message?.includes('limit')) {
      return NextResponse.json({ error: 'limit' }, { status: 409 })
    }
    console.error('[api/week-priorities POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
