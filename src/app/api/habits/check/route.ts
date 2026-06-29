import { NextResponse } from 'next/server'
import { z } from 'zod'
import { toggleCheck } from '@/lib/queries/habits'
import { parisToday, parisWeekDays } from '@/lib/week'

const checkSchema = z.object({
  habit_id: z.number().int().positive(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = checkSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 })
  }
  const { habit_id, day } = parsed.data

  // Cochable : uniquement un jour de la semaine courante, non futur (Europe/Paris)
  if (!parisWeekDays().includes(day) || day > parisToday()) {
    return NextResponse.json({ error: 'day_out_of_range' }, { status: 400 })
  }

  try {
    const result = await toggleCheck(habit_id, day)
    return NextResponse.json(result)
  } catch (err) {
    // 23503 = violation FK → l'habitude n'existe pas
    if ((err as { code?: string }).code === '23503') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    console.error('[api/habits/check POST]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
