import { describe, it, expect, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'

afterAll(() => closePool())

describe('test db helper', () => {
  it('can query the test database', async () => {
    await truncateAll()
    const r = await testPool.query('SELECT 1 as one')
    expect(r.rows[0].one).toBe(1)
  })
})
