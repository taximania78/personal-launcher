// Pools already point at test DB via tests/setup.ts env remap
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import {
  listHabits, createHabit, updateHabit, deleteHabit,
  moveHabitUp, moveHabitDown,
  getWeekChecks, toggleCheck, getChecksSince,
  setHabitCheck,
} from '@/lib/queries/habits'

afterAll(() => closePool())

describe('habits queries', () => {
  beforeEach(() => truncateAll())

  it('crée et liste dans l’ordre des positions', async () => {
    await createHabit('Deep work', 'brain')
    await createHabit('Yoga', null)
    const list = await listHabits()
    expect(list.map(h => h.name)).toEqual(['Deep work', 'Yoga'])
    expect(list[0].position).toBeLessThan(list[1].position)
  })

  it('listHabits exclut les inactives par défaut, les inclut sur demande', async () => {
    const a = await createHabit('Méditation', null)
    await updateHabit(a.id, { active: false })
    expect(await listHabits()).toHaveLength(0)
    expect(await listHabits(true)).toHaveLength(1)
  })

  it('met à jour nom, icône et position', async () => {
    const h = await createHabit('Yoga', null)
    const after = await updateHabit(h.id, { name: 'Yoga du soir', icon: 'flower', position: 5 })
    expect(after.name).toBe('Yoga du soir')
    expect(after.icon).toBe('flower')
    expect(after.position).toBe(5)
  })

  it('updateHabit jette sur id inconnu', async () => {
    await expect(updateHabit(999, { name: 'x' })).rejects.toThrow('not found')
  })

  it('supprime en cascade les coches', async () => {
    const h = await createHabit('Deep work', null)
    await toggleCheck(h.id, '2026-06-10')
    await deleteHabit(h.id)
    expect(await getWeekChecks(['2026-06-10'])).toHaveLength(0)
  })

  it('deleteHabit jette sur id inconnu', async () => {
    await expect(deleteHabit(999)).rejects.toThrow('not found')
  })

  it('moveHabitUp échange avec la précédente', async () => {
    await createHabit('A', null)
    const b = await createHabit('B', null)
    await moveHabitUp(b.id)
    expect((await listHabits()).map(h => h.name)).toEqual(['B', 'A'])
  })

  it('moveHabitUp est un no-op en tête de liste', async () => {
    const a = await createHabit('A', null)
    await createHabit('B', null)
    await moveHabitUp(a.id)
    expect((await listHabits()).map(h => h.name)).toEqual(['A', 'B'])
  })

  it('moveHabitDown échange avec la suivante', async () => {
    const a = await createHabit('A', null)
    await createHabit('B', null)
    await moveHabitDown(a.id)
    expect((await listHabits()).map(h => h.name)).toEqual(['B', 'A'])
  })

  it('moveHabitDown est un no-op en fin de liste', async () => {
    await createHabit('A', null)
    const b = await createHabit('B', null)
    await moveHabitDown(b.id)
    expect((await listHabits()).map(h => h.name)).toEqual(['A', 'B'])
  })

  it('moveHabitUp jette sur id inconnu', async () => {
    await expect(moveHabitUp(999)).rejects.toThrow('not found')
  })
})

describe('habit checks', () => {
  beforeEach(() => truncateAll())

  it('toggle coche puis décoche', async () => {
    const h = await createHabit('Méditation', null)
    expect(await toggleCheck(h.id, '2026-06-10')).toEqual({ checked: true })
    expect(await toggleCheck(h.id, '2026-06-10')).toEqual({ checked: false })
    expect(await getWeekChecks(['2026-06-10'])).toHaveLength(0)
  })

  it('getWeekChecks ne renvoie que les jours demandés', async () => {
    const h = await createHabit('Deep work', null)
    await toggleCheck(h.id, '2026-06-08')
    await toggleCheck(h.id, '2026-06-01')   // hors fenêtre
    const checks = await getWeekChecks(['2026-06-08', '2026-06-09'])
    expect(checks).toEqual([{ habit_id: h.id, day: '2026-06-08' }])
  })

  it('toggleCheck jette sur habitude inconnue (FK)', async () => {
    await expect(toggleCheck(999, '2026-06-10')).rejects.toThrow()
  })
})

describe('setHabitCheck', () => {
  beforeEach(() => truncateAll())

  it('affirme checked=true (idempotent) puis false', async () => {
    const h = await createHabit('Sport', null)
    const day = '2026-06-18'
    expect((await setHabitCheck(h.id, day, true)).checked).toBe(true)
    expect((await setHabitCheck(h.id, day, true)).checked).toBe(true)
    expect((await setHabitCheck(h.id, day, false)).checked).toBe(false)
  })
})

describe('created_at & getChecksSince', () => {
  beforeEach(() => truncateAll())

  it('listHabits expose created_at au format YYYY-MM-DD', async () => {
    await createHabit('Sport', null)
    const [h] = await listHabits()
    expect(h.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('getChecksSince ne renvoie que les coches >= startDay', async () => {
    const h = await createHabit('Sport', null)
    await toggleCheck(h.id, '2026-06-01')
    await toggleCheck(h.id, '2025-01-01')   // hors fenêtre
    const checks = await getChecksSince('2026-01-01')
    expect(checks).toEqual([{ habit_id: h.id, day: '2026-06-01' }])
  })

  it('getChecksSince renvoie un tableau vide sans coche', async () => {
    expect(await getChecksSince('2026-01-01')).toEqual([])
  })
})
