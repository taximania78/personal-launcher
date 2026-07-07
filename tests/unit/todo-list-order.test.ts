import { describe, it, expect } from 'vitest'
import { splitActiveCompleted } from '@/components/cockpit/todo-list-order'

describe('splitActiveCompleted', () => {
  it('sépare actives et terminées en préservant l’ordre d’entrée', () => {
    const list = [
      { id: 1, done: false },
      { id: 2, done: true },
      { id: 3, done: false },
      { id: 4, done: true },
    ]
    const { active, completed } = splitActiveCompleted(list)
    expect(active.map(t => t.id)).toEqual([1, 3])
    expect(completed.map(t => t.id)).toEqual([2, 4])
  })

  it('liste vide → deux groupes vides', () => {
    expect(splitActiveCompleted([])).toEqual({ active: [], completed: [] })
  })

  it('tout actif → completed vide', () => {
    const { active, completed } = splitActiveCompleted([{ done: false }, { done: false }])
    expect(active).toHaveLength(2)
    expect(completed).toHaveLength(0)
  })

  it('tout terminé → active vide', () => {
    const { active, completed } = splitActiveCompleted([{ done: true }, { done: true }])
    expect(active).toHaveLength(0)
    expect(completed).toHaveLength(2)
  })
})
