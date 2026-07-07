import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import {
  listWeekPriorities, createWeekPriority, updateWeekPriority, deleteWeekPriority,
} from '@/lib/queries/week-priorities'
import { parisMonday, parisWeekDays } from '@/lib/week'

afterAll(() => closePool())

// Lundi de la semaine suivante (toujours un ISODOW=1 valide pour la contrainte SQL).
function nextMonday(): string {
  const [y, m, d] = parisMonday().split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  anchor.setUTCDate(anchor.getUTCDate() + 7)
  return anchor.toISOString().slice(0, 10)
}

describe('queries week_priorities', () => {
  beforeEach(() => truncateAll())

  it('parisMonday renvoie le premier jour de parisWeekDays', () => {
    expect(parisMonday()).toBe(parisWeekDays()[0])
  })

  it('crée et liste dans l\'ordre, semaine par semaine', async () => {
    const monday = parisMonday()
    await createWeekPriority(monday, 'Prio A')
    await createWeekPriority(monday, 'Prio B')
    await createWeekPriority(nextMonday(), 'Semaine prochaine')
    const current = await listWeekPriorities(monday)
    expect(current.map(p => p.text)).toEqual(['Prio A', 'Prio B'])
    expect(current[0].week_start).toBe(monday)
    expect(current[0].done).toBe(false)
    expect((await listWeekPriorities(nextMonday())).map(p => p.text)).toEqual(['Semaine prochaine'])
  })

  it('refuse une 4e priorité sur la même semaine', async () => {
    const monday = parisMonday()
    await createWeekPriority(monday, 'Un')
    await createWeekPriority(monday, 'Deux')
    await createWeekPriority(monday, 'Trois')
    await expect(createWeekPriority(monday, 'Quatre')).rejects.toThrow('limit')
    // La limite est par semaine : la semaine suivante reste ouverte.
    await expect(createWeekPriority(nextMonday(), 'OK ailleurs')).resolves.toBeTruthy()
  })

  it('update partiel : done seul, puis text seul', async () => {
    const p = await createWeekPriority(parisMonday(), 'À faire')
    const done = await updateWeekPriority(p.id, { done: true })
    expect(done.done).toBe(true)
    expect(done.text).toBe('À faire')
    const renamed = await updateWeekPriority(p.id, { text: 'Renommée' })
    expect(renamed.text).toBe('Renommée')
    expect(renamed.done).toBe(true)
  })

  it('delete, et erreurs sur id inconnu', async () => {
    const p = await createWeekPriority(parisMonday(), 'Éphémère')
    await deleteWeekPriority(p.id)
    expect(await listWeekPriorities(parisMonday())).toHaveLength(0)
    await expect(deleteWeekPriority(999999)).rejects.toThrow()
    await expect(updateWeekPriority(999999, { done: true })).rejects.toThrow()
  })
})
