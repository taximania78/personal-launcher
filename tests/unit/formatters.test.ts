import { describe, it, expect } from 'vitest'
import { formatCountdown, formatRelative, formatVisitors, formatDaysAgo } from '@/lib/formatters'

describe('formatCountdown', () => {
  // +30 s de marge : formatCountdown relit Date.now() puis tronque (Math.floor).
  // Sans marge, la cible est pile sur la frontière de minute et le moindre délai
  // (≥1 ms, fréquent en CI) fait retomber le floor une minute en dessous → flaky.
  it('formats hours and minutes', () => {
    const target = new Date(Date.now() + (5 * 3600 + 48 * 60 + 30) * 1000)
    expect(formatCountdown(target)).toBe('5h48')
  })
  it('formats minutes only when under 1h', () => {
    const target = new Date(Date.now() + (23 * 60 + 30) * 1000)
    expect(formatCountdown(target)).toBe('23 min')
  })
  it('returns null for past dates', () => {
    expect(formatCountdown(new Date(Date.now() - 1000))).toBeNull()
  })
})

describe('formatRelative', () => {
  it('formats hours ago', () => {
    const past = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatRelative(past)).toBe('il y a 2h')
  })
  it('formats minutes ago', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelative(past)).toBe('il y a 5 min')
  })
  it('formats days ago beyond 24h', () => {
    const past = new Date(Date.now() - 3 * 86400 * 1000)
    expect(formatRelative(past)).toBe('il y a 3j')
  })
})

describe('formatVisitors', () => {
  it('rounds to nearest', () => {
    expect(formatVisitors(847)).toBe('847')
    expect(formatVisitors(1234)).toBe('1.2k')
    expect(formatVisitors(0)).toBe('0')
  })
})

describe('formatDaysAgo', () => {
  it('returns days since date', () => {
    const past = new Date(Date.now() - 5 * 86400 * 1000)
    expect(formatDaysAgo(past)).toBe(5)
  })
})
