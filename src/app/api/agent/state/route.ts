import { NextResponse } from 'next/server'
import { requireAgent } from '@/lib/agent-auth'
import {
  getFocusTodo, listTodos, listTomorrowTodos, listTriageTodos, listUpcomingTodos,
} from '@/lib/queries/todos'
import { getDayJournal } from '@/lib/queries/journal'
import { listWeekPriorities } from '@/lib/queries/week-priorities'
import { listHabits, getWeekChecks, getHabitCheckCounts } from '@/lib/queries/habits'
import { parisToday, parisTomorrow, parisMonday } from '@/lib/week'

export async function GET(req: Request) {
  const denied = await requireAgent(req)
  if (denied) return denied

  try {
    const [
      focus, focusTomorrow, today, tomorrow, upcoming, triage,
      journal, journalTomorrow, priorities, habits, checkCounts, checks,
    ] = await Promise.all([
      getFocusTodo(),
      getFocusTodo(parisTomorrow()),
      listTodos(),
      listTomorrowTodos(),
      listUpcomingTodos(7),
      listTriageTodos(),
      getDayJournal(parisToday()),
      getDayJournal(parisTomorrow()),
      listWeekPriorities(parisMonday()),
      listHabits(),
      getHabitCheckCounts(7),
      getWeekChecks([parisToday()]),
    ])
    return NextResponse.json({
      focus: focus
        ? { id: focus.id, text: focus.text, done: focus.done, why: journal?.why ?? null }
        : null,
      focus_tomorrow: focusTomorrow
        ? { id: focusTomorrow.id, text: focusTomorrow.text, why: journalTomorrow?.why ?? null }
        : null,
      todos: {
        today: today.map((t) => ({
          id: t.id, text: t.text, done: t.done, overdue: t.overdue, days_overdue: t.days_overdue,
          postponed_count: t.postponed_count,
        })),
        tomorrow: tomorrow.map((t) => ({
          id: t.id, text: t.text, done: t.done, postponed_count: t.postponed_count,
        })),
        upcoming: upcoming.map((t) => ({
          id: t.id, text: t.text, scheduled_for: t.scheduled_for, postponed_count: t.postponed_count,
        })),
      },
      triage: triage.map((t) => ({
        id: t.id, text: t.text, postponed_count: t.postponed_count, days_overdue: t.days_overdue,
      })),
      journal,
      week_priorities: priorities.map((p) => ({ id: p.id, text: p.text, done: p.done })),
      habits: habits.map((h) => ({
        id: h.id, name: h.name, icon: h.icon,
        checks_last_7: checkCounts.find((c) => c.habit_id === h.id)?.checks ?? 0,
      })),
      checks_today: checks.map((c) => c.habit_id),
    })
  } catch (err) {
    console.error('[api/agent/state GET]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
