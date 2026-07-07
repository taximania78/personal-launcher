import { NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertDayJournal } from '@/lib/queries/journal'
import { findDeepWorkHabit, setHabitCheck } from '@/lib/queries/habits'
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
    const today = parisToday()
    const journal = await upsertDayJournal(today, { deep_work: parsed.data.deep_work })
    // Sync bidirectionnelle : si une habitude « Deep work » existe, sa coche
    // du jour suit le toggle de la bannière.
    const habit = await findDeepWorkHabit()
    if (habit) await setHabitCheck(habit.id, today, parsed.data.deep_work)
    return NextResponse.json(journal)
  } catch (err) {
    console.error('[api/journal/today PUT]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
