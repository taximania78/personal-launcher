import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'

import { PUT as journalTodayPUT } from '@/app/api/journal/today/route'
import { POST as habitsCheckPOST } from '@/app/api/habits/check/route'
import { POST as agentHabitCheckPOST } from '@/app/api/agent/habits/[id]/check/route'
import { PUT as agentJournalPUT } from '@/app/api/agent/journal/[date]/route'

import { createHabit, getWeekChecks } from '@/lib/queries/habits'
import { getDayJournal } from '@/lib/queries/journal'
import { createAgentToken } from '@/lib/queries/agent-tokens'
import { parisToday, parisWeekDays } from '@/lib/week'

afterAll(() => closePool())

function jsonReq(url: string, method: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function bearer(): Promise<string> {
  const { plaintext } = await createAgentToken('test')
  return `Bearer ${plaintext}`
}

// Deux jours avant aujourd'hui, ancré à midi UTC (insensible DST) — même
// recette que tests/integration/queries-habits-counts.test.ts.
function daysAgo(n: number): string {
  const [y, m, d] = parisToday().split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12))
  anchor.setUTCDate(anchor.getUTCDate() - n)
  return anchor.toISOString().slice(0, 10)
}

describe('sync deep_work ↔ habitude « Deep work »', () => {
  beforeEach(() => truncateAll())

  describe('PUT /api/journal/today', () => {
    it('deep_work:true coche l’habitude Deep Work du jour, false la décoche', async () => {
      const habit = await createHabit('Deep Work', null)
      const today = parisToday()

      const resTrue = await journalTodayPUT(jsonReq('http://x/api/journal/today', 'PUT', { deep_work: true }))
      expect(resTrue.status).toBe(200)
      expect((await getWeekChecks([today])).map(c => c.habit_id)).toContain(habit.id)

      const resFalse = await journalTodayPUT(jsonReq('http://x/api/journal/today', 'PUT', { deep_work: false }))
      expect(resFalse.status).toBe(200)
      expect((await getWeekChecks([today])).map(c => c.habit_id)).not.toContain(habit.id)
    })

    it('sans habitude Deep work : 200, pas d’erreur', async () => {
      const res = await journalTodayPUT(jsonReq('http://x/api/journal/today', 'PUT', { deep_work: true }))
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/habits/check (UI)', () => {
    it('coche l’habitude Deep work → journal du jour à jour, re-toggle → false', async () => {
      const habit = await createHabit('Deep Work', null)
      const day = parisToday()

      const r1 = await habitsCheckPOST(jsonReq('http://x/api/habits/check', 'POST', { habit_id: habit.id, day }))
      expect(r1.status).toBe(200)
      expect((await getDayJournal(day))?.deep_work).toBe(true)

      const r2 = await habitsCheckPOST(jsonReq('http://x/api/habits/check', 'POST', { habit_id: habit.id, day }))
      expect(r2.status).toBe(200)
      expect((await getDayJournal(day))?.deep_work).toBe(false)
    })

    it('sur une autre habitude : journal intact', async () => {
      await createHabit('Deep Work', null)
      const other = await createHabit('Sport', null)
      const day = parisToday()

      await habitsCheckPOST(jsonReq('http://x/api/habits/check', 'POST', { habit_id: other.id, day }))
      expect((await getDayJournal(day))?.deep_work ?? null).toBeNull()
    })

    it('jour passé (rétro-coche) : journal de ce jour mis à jour, aujourd’hui intact', async () => {
      const habit = await createHabit('Deep Work', null)
      const past = daysAgo(2)
      const today = parisToday()

      // Le contrat de la route restreint aux jours de la semaine courante :
      // si le jour testé tombe hors semaine (lundi/mardi), le cas est sans objet.
      if (!parisWeekDays().includes(past)) return

      const res = await habitsCheckPOST(jsonReq('http://x/api/habits/check', 'POST', { habit_id: habit.id, day: past }))
      expect(res.status).toBe(200)
      expect((await getDayJournal(past))?.deep_work).toBe(true)
      expect((await getDayJournal(today))?.deep_work ?? null).toBeNull()
    })
  })

  describe('POST /api/agent/habits/[id]/check', () => {
    it('checked:false synchronise deep_work:false au journal du jour', async () => {
      const habit = await createHabit('Deep Work', null)
      const token = await bearer()

      const res = await agentHabitCheckPOST(
        jsonReq(`http://x/api/agent/habits/${habit.id}/check`, 'POST', { checked: false }, { Authorization: token }),
        { params: Promise.resolve({ id: String(habit.id) }) },
      )
      expect(res.status).toBe(200)
      expect((await getDayJournal(parisToday()))?.deep_work).toBe(false)
    })
  })

  describe('PUT /api/agent/journal/[date]', () => {
    it('deep_work:true coche l’habitude Deep work ce jour-là', async () => {
      const habit = await createHabit('Deep Work', null)
      const token = await bearer()
      const date = parisToday()

      const res = await agentJournalPUT(
        jsonReq(`http://x/api/agent/journal/${date}`, 'PUT', { deep_work: true }, { Authorization: token }),
        { params: Promise.resolve({ date }) },
      )
      expect(res.status).toBe(200)
      expect((await getWeekChecks([date])).map(c => c.habit_id)).toContain(habit.id)
    })
  })
})
