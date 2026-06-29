import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { getAppConfig, updateAppConfig } from '@/lib/queries/config'

afterAll(() => closePool())

describe('app_config queries', () => {
  beforeEach(() => truncateAll())

  it('returns null fields by default (row seeded by migration)', async () => {
    const c = await getAppConfig()
    expect(c).not.toBeNull()
    expect(c?.whoogle_url).toBeNull()
    expect(c?.focus_default).toBeNull()
  })

  it('updates whoogle_url only, leaves focus_default unchanged', async () => {
    await updateAppConfig({ focus_default: 'préset' })
    const updated = await updateAppConfig({ whoogle_url: 'https://w.example.com' })
    expect(updated.whoogle_url).toBe('https://w.example.com')
    expect(updated.focus_default).toBe('préset')
  })

  it('treats empty string as null', async () => {
    await updateAppConfig({ whoogle_url: 'https://x' })
    const updated = await updateAppConfig({ whoogle_url: '' })
    expect(updated.whoogle_url).toBeNull()
  })

  it('updates both fields atomically', async () => {
    const r = await updateAppConfig({ whoogle_url: 'https://w', focus_default: 'd' })
    expect(r.whoogle_url).toBe('https://w')
    expect(r.focus_default).toBe('d')
  })
})
