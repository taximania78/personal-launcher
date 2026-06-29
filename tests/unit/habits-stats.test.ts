import { describe, it, expect } from 'vitest'
import { addDays, weeklyBuckets, currentStreak, bestStreak, monthlyTrend } from '@/lib/habits-stats'

describe('addDays', () => {
  it('ajoute et retire des jours sans dérive DST', () => {
    expect(addDays('2026-06-13', 1)).toBe('2026-06-14')
    expect(addDays('2026-06-13', -1)).toBe('2026-06-12')
    expect(addDays('2026-03-29', -7)).toBe('2026-03-22') // semaine du DST
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('weeklyBuckets', () => {
  const today = '2026-06-13' // samedi → lundi de la semaine = 2026-06-08

  it('renvoie 53 buckets, du plus ancien au plus récent', () => {
    const b = weeklyBuckets(new Set(), today, '2020-01-01')
    expect(b).toHaveLength(53)
  })

  it('niveau 4 quand les 7 jours de la dernière semaine sont cochés', () => {
    const week = ['2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13','2026-06-14']
    const b = weeklyBuckets(new Set(week), today, '2020-01-01')
    expect(b[52].level).toBe(4)
    expect(b[52].inRange).toBe(true)
  })

  it('niveau 2 pour 3 jours cochés dans la semaine', () => {
    const b = weeklyBuckets(new Set(['2026-06-08','2026-06-09','2026-06-10']), today, '2020-01-01')
    expect(b[52].level).toBe(2)
  })

  it('niveau 0 quand aucun jour coché', () => {
    const b = weeklyBuckets(new Set(), today, '2020-01-01')
    expect(b[52].level).toBe(0)
  })

  it('inRange=false pour les semaines entièrement avant created_at', () => {
    const b = weeklyBuckets(new Set(), today, '2026-06-01')
    expect(b[0].inRange).toBe(false)   // semaine la plus ancienne (~juin 2025)
    expect(b[52].inRange).toBe(true)   // semaine courante
  })
})

describe('currentStreak', () => {
  const today = '2026-06-13'

  it('compte aujourd\'hui + jours consécutifs précédents', () => {
    expect(currentStreak(new Set(['2026-06-13','2026-06-12','2026-06-11']), today)).toBe(3)
  })

  it('aujourd\'hui non coché ne casse pas la série (ancre = hier)', () => {
    expect(currentStreak(new Set(['2026-06-12','2026-06-11']), today)).toBe(2)
  })

  it('renvoie 0 si ni aujourd\'hui ni hier ne sont cochés', () => {
    expect(currentStreak(new Set(['2026-06-10']), today)).toBe(0)
  })

  it('renvoie 0 sur un ensemble vide', () => {
    expect(currentStreak(new Set(), today)).toBe(0)
  })
})

describe('bestStreak', () => {
  it('trouve la plus longue série consécutive', () => {
    expect(bestStreak(new Set(['2026-01-01','2026-01-02','2026-01-03','2026-03-01']))).toBe(3)
  })

  it('une série interrompue compte 1', () => {
    expect(bestStreak(new Set(['2026-01-01','2026-01-03']))).toBe(1)
  })

  it('renvoie 0 sur un ensemble vide', () => {
    expect(bestStreak(new Set())).toBe(0)
  })
})

describe('monthlyTrend', () => {
  const today = '2026-06-13' // 13 juin → 13 jours écoulés ce mois

  it('renvoie 12 points, du plus ancien au mois courant', () => {
    const t = monthlyTrend([], 2, today)
    expect(t).toHaveLength(12)
    expect(t[0].key).toBe('2025-07')
    expect(t[11].key).toBe('2026-06')
    expect(t[11].label).toBe('J') // juin
  })

  it('normalise le mois courant sur les jours écoulés', () => {
    const checks = [
      { habit_id: 1, day: '2026-06-02' },
      { habit_id: 2, day: '2026-06-03' },
    ]
    const t = monthlyTrend(checks, 2, today)
    // 2 coches / (2 habitudes * 13 jours écoulés) = 0.0769…
    expect(t[11].rate).toBeCloseTo(2 / 26, 5)
  })

  it('normalise un mois passé complet sur sa longueur', () => {
    // mai 2026 = 31 jours ; 31 coches, 1 habitude → taux plafonné à 1
    const checks = Array.from({ length: 31 }, (_, i) => ({
      habit_id: 1, day: `2026-05-${String(i + 1).padStart(2, '0')}`,
    }))
    const t = monthlyTrend(checks, 1, today)
    const may = t.find(p => p.key === '2026-05')!
    expect(may.rate).toBe(1)
  })

  it('renvoie des taux à 0 quand aucune habitude active', () => {
    const checks = [{ habit_id: 1, day: '2026-06-02' }]
    const t = monthlyTrend(checks, 0, today)
    expect(t.every(p => p.rate === 0)).toBe(true)
  })
})
