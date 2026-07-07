import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { TodoList, type TodoRow, type UpcomingGroup } from './TodoList'
import { listTodos, listTomorrowTodos, listUpcomingTodos } from '@/lib/queries/todos'
import { parisToday, parisTomorrow } from '@/lib/week'

export async function TodoCard() {
  let today: TodoRow[]
  let tomorrow: TodoRow[]
  let upcoming: UpcomingGroup[]
  try {
    const [todayRows, tomorrowRows, upcomingRows] = await Promise.all([
      listTodos(), listTomorrowTodos(), listUpcomingTodos(7),
    ])
    today = todayRows.map(t => ({
      id: t.id, text: t.text, done: t.done, is_focus: t.is_focus, overdue: t.overdue,
      postponed_count: t.postponed_count,
    }))
    tomorrow = tomorrowRows.map(t => ({
      id: t.id, text: t.text, done: t.done, is_focus: t.is_focus, overdue: false,
      postponed_count: t.postponed_count,
    }))
    // Labels calculés côté serveur : même rendu SSR/client, pas de mismatch d'hydratation.
    const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    const groups = new Map<string, UpcomingGroup>()
    for (const t of upcomingRows) {
      const g = groups.get(t.scheduled_for)
        ?? { date: t.scheduled_for, label: fmt.format(new Date(`${t.scheduled_for}T12:00:00Z`)), todos: [] }
      g.todos.push({ id: t.id, text: t.text, postponed_count: t.postponed_count })
      groups.set(t.scheduled_for, g)
    }
    upcoming = [...groups.values()]
  } catch {
    return <CardError title="Todo du jour" />
  }
  return (
    <Card title="Todo du jour">
      <TodoList
        today={today}
        tomorrow={tomorrow}
        upcoming={upcoming}
        todayIso={parisToday()}
        tomorrowIso={parisTomorrow()}
      />
    </Card>
  )
}
