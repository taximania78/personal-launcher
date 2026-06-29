import { NextResponse } from 'next/server'
import { requireAgent } from '@/lib/agent-auth'
import { getFocusTodo, listTodos, listTomorrowTodos } from '@/lib/queries/todos'
import { listHabits, getWeekChecks } from '@/lib/queries/habits'
import { parisToday } from '@/lib/week'

export async function GET(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied

  try {
    const [focus, today, tomorrow, habits, checks] = await Promise.all([
      getFocusTodo(),
      listTodos(),
      listTomorrowTodos(),
      listHabits(),
      getWeekChecks([parisToday()]),
    ])
    return NextResponse.json({
      focus: focus ? { id: focus.id, text: focus.text } : null,
      todos: {
        today: today.map(t => ({ id: t.id, text: t.text, done: t.done, overdue: t.overdue })),
        tomorrow: tomorrow.map(t => ({ id: t.id, text: t.text, done: t.done })),
      },
      habits: habits.map(h => ({ id: h.id, name: h.name, icon: h.icon })),
      checks_today: checks.map(c => c.habit_id),
    })
  } catch (err) {
    console.error('[api/agent/state GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
