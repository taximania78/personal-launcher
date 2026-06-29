// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { getSignals } from '@/lib/queries/signals'

afterAll(() => closePool())

describe('signals query', () => {
  beforeEach(() => truncateAll())

  it('returns null when no row', async () => {
    const s = await getSignals()
    expect(s).toBeNull()
  })

  it('returns the row', async () => {
    await testPool.query(`
      INSERT INTO signals (id, last_commit_at, last_commit_message,
        last_commit_repo, backups_status, backups_last_run_at)
      VALUES (1, NOW(), 'feat: x', 'launcher', 'ok', NOW())
    `)
    const s = await getSignals()
    expect(s?.last_commit_message).toBe('feat: x')
    expect(s?.backups_status).toBe('ok')
  })
})
