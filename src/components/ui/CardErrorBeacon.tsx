'use client'
import { useLayoutEffect } from 'react'
import { cardErrorEnter, cardErrorLeave } from '@/lib/card-error-signal'

// Signale la présence d'une carte en erreur au chip de mise à jour. Effet de
// layout, pas passif : dans le commit d'un refresh, il doit avoir incrémenté le
// compteur avant que le chip (plus haut dans l'arbre, effets passifs) ne
// décide si la mise à jour a réussi.
export function CardErrorBeacon() {
  useLayoutEffect(() => {
    cardErrorEnter()
    return cardErrorLeave
  }, [])
  return null
}
