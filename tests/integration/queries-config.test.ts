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
  })

  it('treats empty string as null', async () => {
    await updateAppConfig({ whoogle_url: 'https://x' })
    const updated = await updateAppConfig({ whoogle_url: '' })
    expect(updated.whoogle_url).toBeNull()
  })
})
