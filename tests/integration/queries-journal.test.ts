import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { getDayJournal, upsertDayJournal, listJournals } from '@/lib/queries/journal'
import { parisToday } from '@/lib/week'

afterAll(() => closePool())

describe('queries day_journal', () => {
  beforeEach(() => truncateAll())

  it('getDayJournal renvoie null quand rien n\'est écrit', async () => {
    expect(await getDayJournal(parisToday())).toBeNull()
  })

  it('upsertDayJournal crée puis fusionne partiellement (préserve le reste)', async () => {
    const day = parisToday()
    await upsertDayJournal(day, { why: 'Ça compte', focus_text: 'Livrer X' })
    const merged = await upsertDayJournal(day, { deep_work: true })
    expect(merged.day).toBe(day)
    expect(merged.why).toBe('Ça compte')
    expect(merged.focus_text).toBe('Livrer X')
    expect(merged.deep_work).toBe(true)
    expect(merged.focus_outcome).toBe('not_set')
  })

  it('écrit les enums, dont expired (clôture dégradée)', async () => {
    const day = parisToday()
    const j = await upsertDayJournal(day, {
      focus_outcome: 'expired',
      shutdown_mode: 'degrade',
    })
    expect(j.focus_outcome).toBe('expired')
    expect(j.shutdown_mode).toBe('degrade')
    const j2 = await upsertDayJournal(day, {
      focus_outcome: 'reported',
      report_reason: 'imprevu',
      report_comment: 'Réunion surprise',
    })
    expect(j2.focus_outcome).toBe('reported')
    expect(j2.report_reason).toBe('imprevu')
    expect(j2.report_comment).toBe('Réunion surprise')
  })

  it('listJournals : fenêtre respectée, tri du plus récent au plus ancien', async () => {
    const today = parisToday()
    await upsertDayJournal(today, { why: 'Aujourd\'hui' })
    await upsertDayJournal('2000-01-01', { why: 'Trop vieux' })
    const rows = await listJournals(14)
    expect(rows.map(r => r.day)).toContain(today)
    expect(rows.map(r => r.day)).not.toContain('2000-01-01')
  })
})
