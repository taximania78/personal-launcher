import { describe, it, expect } from 'vitest'
import {
  shouldRefresh, refreshChipLabel, refreshChipTitle, RETURN_DEBOUNCE_MS, VISIBLE_STALE_MS,
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

describe('refreshChipLabel', () => {
  const at = new Date('2026-09-16T13:42:00Z') // 15:42 à Paris (CEST)

  it('pendant un refresh → « Mise à jour… », quel que soit l’âge', () => {
    expect(refreshChipLabel({ pending: true, lastUpdatedAt: at, now: at })).toBe('Mise à jour…')
  })

  it('avant le premier montage (pas de date) → null', () => {
    expect(refreshChipLabel({ pending: false, lastUpdatedAt: null, now: at })).toBeNull()
  })

  it('juste après un refresh → « Mis à jour à l’instant »', () => {
    const now = new Date(at.getTime() + 5_000)
    expect(refreshChipLabel({ pending: false, lastUpdatedAt: at, now })).toBe('Mis à jour à l\'instant')
  })

  it('quelques minutes plus tard → « Mis à jour il y a N min »', () => {
    const now = new Date(at.getTime() + 2 * 60_000)
    expect(refreshChipLabel({ pending: false, lastUpdatedAt: at, now })).toBe('Mis à jour il y a 2 min')
  })

  it('cartes en erreur → « Erreur lors de la mise à jour »', () => {
    expect(refreshChipLabel({ pending: false, lastUpdatedAt: at, now: at, failed: true }))
      .toBe('Erreur lors de la mise à jour')
  })

  it('pendant un refresh, l’erreur précédente s’efface au profit de « Mise à jour… »', () => {
    expect(refreshChipLabel({ pending: true, lastUpdatedAt: at, now: at, failed: true })).toBe('Mise à jour…')
  })
})

describe('refreshChipTitle', () => {
  const at = new Date('2026-09-16T13:42:00Z')

  it('date et heure complètes en français, fuseau Europe/Paris', () => {
    expect(refreshChipTitle(at)).toBe('Dernière mise à jour : mercredi 16 septembre à 15:42')
  })

  it('en erreur → la date est celle de la dernière réussie', () => {
    expect(refreshChipTitle(at, true)).toBe('Dernière mise à jour réussie : mercredi 16 septembre à 15:42')
  })
})
