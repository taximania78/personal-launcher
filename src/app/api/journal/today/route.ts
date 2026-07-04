import { NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertDayJournal } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'

// Route UI (LAN, sans auth — convention du repo). N'expose QUE deep_work :
// le reste du journal (outcome, raisons, shutdown) est réservé à l'agent.
const putSchema = z.object({ deep_work: z.boolean() })

export async function PUT(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  try {
    const journal = await upsertDayJournal(parisToday(), { deep_work: parsed.data.deep_work })
    return NextResponse.json(journal)
  } catch (err) {
    console.error('[api/journal/today PUT]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
