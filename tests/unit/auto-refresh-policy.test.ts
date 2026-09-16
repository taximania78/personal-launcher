import { describe, it, expect } from 'vitest'
import {
  shouldRefresh, RETURN_DEBOUNCE_MS, VISIBLE_STALE_MS,
} from '@/components/socle/auto-refresh-policy'

const T0 = 1_700_000_000_000

describe('shouldRefresh', () => {
  describe('trigger « return » (retour sur la fenêtre / l’onglet)', () => {
    it('rafraîchit si le dernier refresh est plus vieux que l’anti-rebond', () => {
      expect(shouldRefresh('return', {
        now: T0 + RETURN_DEBOUNCE_MS, lastRefreshAt: T0, visible: true,
      })).toBe(true)
    })

    it('ne rafraîchit pas si le dernier refresh est trop récent (double focus/visibilitychange)', () => {
      expect(shouldRefresh('return', {
        now: T0 + RETURN_DEBOUNCE_MS - 1, lastRefreshAt: T0, visible: true,
      })).toBe(false)
    })

    it('ne rafraîchit jamais un onglet caché', () => {
      expect(shouldRefresh('return', {
        now: T0 + VISIBLE_STALE_MS, lastRefreshAt: T0, visible: false,
      })).toBe(false)
    })
  })

  describe('trigger « timer » (onglet resté visible)', () => {
    it('rafraîchit après le délai de péremption', () => {
      expect(shouldRefresh('timer', {
        now: T0 + VISIBLE_STALE_MS, lastRefreshAt: T0, visible: true,
      })).toBe(true)
    })

    it('ne rafraîchit pas si un refresh a eu lieu entre-temps', () => {
      expect(shouldRefresh('timer', {
        now: T0 + VISIBLE_STALE_MS - 1, lastRefreshAt: T0, visible: true,
      })).toBe(false)
    })

    it('ne rafraîchit jamais un onglet caché', () => {
      expect(shouldRefresh('timer', {
        now: T0 + VISIBLE_STALE_MS, lastRefreshAt: T0, visible: false,
      })).toBe(false)
    })
  })

  it('l’anti-rebond « return » est bien plus court que la péremption « timer »', () => {
    expect(RETURN_DEBOUNCE_MS).toBeLessThan(VISIBLE_STALE_MS)
  })
})
