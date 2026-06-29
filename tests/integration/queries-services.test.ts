// Pools already point at test DB via tests/setup.ts env remap (see Task 12)
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { testPool, truncateAll, closePool } from './helpers/test-db'
import { getServicesHealth } from '@/lib/queries/services'

afterAll(() => closePool())

describe('services queries', () => {
  beforeEach(() => truncateAll())

  it('returns up/total ratio', async () => {
    await testPool.query(`
      INSERT INTO services (name, status) VALUES
        ('Proxmox', 'up'),
        ('Portainer', 'up'),
        ('Nextcloud', 'down'),
        ('n8n', 'unknown');
    `)
    const h = await getServicesHealth()
    expect(h.total).toBe(4)
    expect(h.up).toBe(2)
  })

  it('returns 0/0 when no services', async () => {
    const h = await getServicesHealth()
    expect(h.total).toBe(0)
    expect(h.up).toBe(0)
  })
})
