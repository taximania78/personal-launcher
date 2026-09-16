import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  cardErrorEnter, cardErrorLeave, getCardErrorCount, subscribeCardErrors, _resetCardErrors,
} from '@/lib/card-error-signal'

describe('card-error-signal', () => {
  beforeEach(() => _resetCardErrors())

  it('compte les cartes en erreur montées', () => {
    expect(getCardErrorCount()).toBe(0)
    cardErrorEnter()
    cardErrorEnter()
    expect(getCardErrorCount()).toBe(2)
    cardErrorLeave()
    expect(getCardErrorCount()).toBe(1)
  })

  it('ne descend jamais sous zéro', () => {
    cardErrorLeave()
    expect(getCardErrorCount()).toBe(0)
  })

  it('notifie les abonnés à chaque changement, plus après désabonnement', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeCardErrors(listener)
    cardErrorEnter()
    cardErrorLeave()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    cardErrorEnter()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
