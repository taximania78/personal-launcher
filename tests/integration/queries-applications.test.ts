// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { getJobKpis, getPendingFollowups, getNextApplicationEvent } from '@/lib/queries/applications'

afterAll(() => closePool())

async function seed(opts: {
  id: string, company: string, status: string,
  last_contact?: string | null, next_event?: Date | null,
}) {
  await testPool.query(`
    INSERT INTO applications (notion_id, company, status, last_contact, next_event)
    VALUES ($1, $2, $3, $4, $5)
  `, [opts.id, opts.company, opts.status, opts.last_contact ?? null, opts.next_event ?? null])
}

describe('applications queries', () => {
  beforeEach(() => truncateAll())

  it('counts by status', async () => {
    await seed({ id: '1', company: 'A', status: 'Applied' })
    await seed({ id: '2', company: 'B', status: 'Applied' })
    await seed({ id: '3', company: 'C', status: 'Evaluated' })
    await seed({ id: '4', company: 'D', status: 'Rejected' })
    const kpis = await getJobKpis()
    expect(kpis.Applied).toBe(2)
    expect(kpis.Evaluated).toBe(1)
    expect(kpis.Rejected).toBe(1)
  })

  it('finds pending follow-ups older than 7 days', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86400 * 1000).toISOString().split('T')[0]
    const oneDayAgo = new Date(Date.now() - 86400 * 1000).toISOString().split('T')[0]
    await seed({ id: '1', company: 'Mistral', status: 'Applied', last_contact: eightDaysAgo })
    await seed({ id: '2', company: 'Fresh', status: 'Applied', last_contact: oneDayAgo })
    await seed({ id: '3', company: 'Rejected', status: 'Rejected', last_contact: eightDaysAgo })
    const fo = await getPendingFollowups()
    expect(fo).toHaveLength(1)
    expect(fo[0].company).toBe('Mistral')
  })

  it('returns next application event', async () => {
    const inTwoDays = new Date(Date.now() + 2 * 86400 * 1000)
    const inFiveDays = new Date(Date.now() + 5 * 86400 * 1000)
    await seed({ id: '1', company: 'Sunday', status: 'Applied', next_event: inTwoDays })
    await seed({ id: '2', company: 'Other', status: 'Applied', next_event: inFiveDays })
    const next = await getNextApplicationEvent()
    expect(next?.company).toBe('Sunday')
  })
})
