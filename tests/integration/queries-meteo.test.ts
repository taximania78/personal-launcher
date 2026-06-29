// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { getMeteo } from '@/lib/queries/meteo'

afterAll(() => closePool())

describe('getMeteo', () => {
  beforeEach(() => truncateAll())

  it('returns null when table is empty', async () => {
    const m = await getMeteo()
    expect(m).toBeNull()
  })

  it('returns the row when present', async () => {
    await testPool.query(`
      INSERT INTO meteo (id, location, temperature_c, icon, condition)
      VALUES (1, 'Paris', 17.3, 'cloud', 'Nuageux')
    `)
    const m = await getMeteo()
    expect(m?.location).toBe('Paris')
    expect(Number(m?.temperature_c)).toBe(17.3)
    expect(m?.icon).toBe('cloud')
  })
})
