import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { TodoList, type TodoRow } from './TodoList'
import { listTodos, listTomorrowTodos } from '@/lib/queries/todos'

export async function TodoCard() {
  let today: TodoRow[]
  let tomorrow: TodoRow[]
  try {
    const [todayRows, tomorrowRows] = await Promise.all([listTodos(), listTomorrowTodos()])
    today = todayRows.map(t => ({
      id: t.id, text: t.text, done: t.done, is_focus: t.is_focus, overdue: t.overdue,
    }))
    tomorrow = tomorrowRows.map(t => ({
      id: t.id, text: t.text, done: t.done, is_focus: t.is_focus, overdue: false,
    }))
  } catch {
    return <CardError title="Todo du jour" />
  }
  return (
    <Card title="Todo du jour">
      <TodoList today={today} tomorrow={tomorrow} />
    </Card>
  )
}
