import { Flag } from 'lucide-react'
import { Card } from '../ui/Card'
import { CardError } from '../ui/CardError'
import { WeekPriorities, type WeekRow } from './WeekPriorities'
import { listWeekPriorities } from '@/lib/queries/week-priorities'
import { parisMonday } from '@/lib/week'

export async function WeekCard() {
  let rows: WeekRow[]
  try {
    const priorities = await listWeekPriorities(parisMonday())
    rows = priorities.map(p => ({ id: p.id, text: p.text, done: p.done }))
  } catch {
    return <CardError title="Semaine" />
  }
  return (
    <Card icon={<Flag size={16} />} title="Semaine">
      <WeekPriorities initial={rows} />
    </Card>
  )
}
