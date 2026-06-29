// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { getUpcomingEvents, getNextInterview } from '@/lib/queries/calendar'

afterAll(() => closePool())

async function seed(uid: string, title: string, deltaMs: number, isInterview: boolean) {
  const starts = new Date(Date.now() + deltaMs)
  const ends = new Date(starts.getTime() + 30 * 60 * 1000)
  await testPool.query(`
    INSERT INTO calendar (uid, title, starts_at, ends_at, is_interview)
    VALUES ($1, $2, $3, $4, $5)
  `, [uid, title, starts, ends, isInterview])
}

describe('calendar queries', () => {
  beforeEach(() => truncateAll())

  // getUpcomingEvents dépend de l'heure réelle (jour courant en Europe/Paris,
  // bascule sur demain à partir de 18h). On assert donc des invariants stables
  // quelle que soit l'heure d'exécution, pas un nombre de lignes figé.
  it('always includes the 3 nearest upcoming events, sorted, excluding past', async () => {
    await seed('a', 'Past', -3600 * 1000, false)
    await seed('b', 'Soon', 3600 * 1000, false)
    await seed('c', 'Later', 2 * 3600 * 1000, true)
    await seed('d', 'Even later', 3 * 3600 * 1000, false)
    await seed('e', 'Furthest', 4 * 3600 * 1000, false)
    const ev = await getUpcomingEvents()
    // Un événement déjà terminé n'est jamais affiché
    expect(ev.map(e => e.title)).not.toContain('Past')
    // Les 3 plus proches sont toujours présents et en tête, dans l'ordre
    expect(ev.length).toBeGreaterThanOrEqual(3)
    expect(ev.slice(0, 3).map(e => e.title)).toEqual(['Soon', 'Later', 'Even later'])
    // Tri ascendant global
    const ts = ev.map(e => new Date(e.starts_at).getTime())
    expect(ts).toEqual([...ts].sort((x, y) => x - y))
  })

  it('exposes the all_day flag from the row', async () => {
    const starts = new Date(Date.now() + 3600 * 1000)
    const ends = new Date(starts.getTime() + 24 * 3600 * 1000)
    await testPool.query(`
      INSERT INTO calendar (uid, title, starts_at, ends_at, is_interview, all_day)
      VALUES ('allday', 'Congés', $1, $2, FALSE, TRUE)
    `, [starts, ends])
    const ev = await getUpcomingEvents()
    expect(ev.find(e => e.uid === 'allday')?.all_day).toBe(true)
  })

  it('returns next interview', async () => {
    await seed('a', 'Réunion', 3600 * 1000, false)
    await seed('b', 'Entretien Sunday', 2 * 3600 * 1000, true)
    const next = await getNextInterview()
    expect(next?.title).toBe('Entretien Sunday')
  })

  it('returns null when no interview upcoming', async () => {
    await seed('a', 'Réunion', 3600 * 1000, false)
    const next = await getNextInterview()
    expect(next).toBeNull()
  })
})
