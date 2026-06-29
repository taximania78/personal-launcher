import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { truncateAll, closePool } from './helpers/test-db'
import { getAppAppearance, updateAppAppearance } from '@/lib/queries/appearance'

afterAll(() => closePool())

describe('app_appearance queries', () => {
  beforeEach(() => truncateAll())

  it('returns default row (image null, dim 35)', async () => {
    const a = await getAppAppearance()
    expect(a).not.toBeNull()
    expect(a?.background_image_path).toBeNull()
    expect(a?.background_dim_pct).toBe(35)
  })

  it('updates background_image_path', async () => {
    const updated = await updateAppAppearance({ background_image_path: 'bg-abc.jpg' })
    expect(updated.background_image_path).toBe('bg-abc.jpg')
    expect(updated.background_dim_pct).toBe(35)
  })

  it('updates background_dim_pct', async () => {
    const updated = await updateAppAppearance({ background_dim_pct: 50 })
    expect(updated.background_dim_pct).toBe(50)
  })

  it('updates both fields atomically', async () => {
    const r = await updateAppAppearance({ background_image_path: 'bg-x.png', background_dim_pct: 20 })
    expect(r.background_image_path).toBe('bg-x.png')
    expect(r.background_dim_pct).toBe(20)
  })

  it('clears image to null', async () => {
    await updateAppAppearance({ background_image_path: 'bg-y.jpg' })
    const cleared = await updateAppAppearance({ background_image_path: null })
    expect(cleared.background_image_path).toBeNull()
  })

  it('rejects dim outside 0-60 via DB CHECK', async () => {
    await expect(updateAppAppearance({ background_dim_pct: 80 })).rejects.toThrow()
  })
})
