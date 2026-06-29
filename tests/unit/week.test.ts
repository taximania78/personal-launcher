import { describe, it, expect } from 'vitest'
import { parisToday, parisTomorrow, parisWeekDays } from '@/lib/week'

describe('parisToday', () => {
  it('renvoie la date ISO en Europe/Paris', () => {
    // 2026-06-10T23:30:00Z = 2026-06-11 01:30 à Paris (UTC+2 en été)
    expect(parisToday(new Date('2026-06-10T23:30:00Z'))).toBe('2026-06-11')
  })

  it('reste sur le même jour avant minuit Paris', () => {
    // 2026-06-10T21:59:00Z = 23:59 à Paris
    expect(parisToday(new Date('2026-06-10T21:59:00Z'))).toBe('2026-06-10')
  })
})

describe('parisTomorrow', () => {
  it('renvoie le lendemain en Europe/Paris', () => {
    // 2026-06-10T21:59:00Z = 23:59 à Paris → demain 2026-06-11
    expect(parisTomorrow(new Date('2026-06-10T21:59:00Z'))).toBe('2026-06-11')
  })

  it('gère le passage juste après minuit Paris', () => {
    // 2026-06-10T23:30:00Z = 2026-06-11 01:30 à Paris → demain 2026-06-12
    expect(parisTomorrow(new Date('2026-06-10T23:30:00Z'))).toBe('2026-06-12')
  })

  it('gère le changement de mois et d’année', () => {
    // 2026-12-31 12:00 Paris → demain 2027-01-01
    expect(parisTomorrow(new Date('2026-12-31T12:00:00Z'))).toBe('2027-01-01')
  })
})

describe('parisWeekDays', () => {
  it('renvoie 7 jours, lundi → dimanche, contenant aujourd’hui', () => {
    // 2026-06-10 est un mercredi
    const days = parisWeekDays(new Date('2026-06-10T12:00:00Z'))
    expect(days).toEqual([
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11',
      '2026-06-12', '2026-06-13', '2026-06-14',
    ])
  })

  it('un dimanche appartient à la semaine qui le précède', () => {
    // 2026-06-14 est un dimanche
    const days = parisWeekDays(new Date('2026-06-14T12:00:00Z'))
    expect(days[0]).toBe('2026-06-08')
    expect(days[6]).toBe('2026-06-14')
  })

  it('gère le changement d’année', () => {
    // 2026-01-01 est un jeudi → semaine du lundi 2025-12-29
    const days = parisWeekDays(new Date('2026-01-01T12:00:00Z'))
    expect(days[0]).toBe('2025-12-29')
    expect(days[3]).toBe('2026-01-01')
  })

  it('gère le passage à l’heure d’été (DST)', () => {
    // 2026-03-29 (dimanche, jour du DST) → semaine du lundi 2026-03-23
    const days = parisWeekDays(new Date('2026-03-29T12:00:00Z'))
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-03-23')
    expect(days[6]).toBe('2026-03-29')
  })
})
