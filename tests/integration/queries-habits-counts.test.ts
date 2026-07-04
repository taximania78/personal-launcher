import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { createHabit, setHabitCheck, getHabitCheckCounts } from '@/lib/queries/habits'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

function daysAgo(n: number): string {
  const [y, m, d] = parisToday().split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  anchor.setUTCDate(anchor.getUTCDate() - n)
  return anchor.toISOString().slice(0, 10)
}

describe('getHabitCheckCounts', () => {
  beforeEach(() => truncateAll())

  it('compte dans la fenêtre, exclut le plus ancien, garde le zéro, ignore les inactives', async () => {
    const sport = await createHabit('Sport', null)
    const lecture = await createHabit('Lecture', null)
    const { updateHabit } = await import('@/lib/queries/habits')
    const off = await createHabit('Désactivée', null)
    await updateHabit(off.id, { active: false })

    await setHabitCheck(sport.id, parisToday(), true)
    await setHabitCheck(sport.id, daysAgo(2), true)
    await setHabitCheck(sport.id, daysAgo(30), true)   // hors fenêtre 7 j

    const counts = await getHabitCheckCounts(7)
    expect(counts.find(c => c.name === 'Sport')?.checks).toBe(2)
    expect(counts.find(c => c.name === 'Lecture')?.checks).toBe(0)
    expect(counts.find(c => c.name === 'Désactivée')).toBeUndefined()
  })
})
