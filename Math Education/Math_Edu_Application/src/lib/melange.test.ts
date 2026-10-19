import { describe, expect, it } from 'vitest'

import { melanger } from './melange'

describe('melanger', () => {
  it('garde exactement les memes elements, sans modifier la liste source', () => {
    const source = ['a', 'b', 'c', 'd']
    const resultat = melanger(source)
    expect([...resultat].sort()).toEqual(source)
    expect(source).toEqual(['a', 'b', 'c', 'd'])
  })

  it("change l'ordre selon le tirage", () => {
    // Tirage toujours a 0 : chaque element part en tete a son tour.
    expect(melanger(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a'])
  })

  it('finit par placer la bonne proposition a chaque position', () => {
    const positions = new Set<number>()
    for (let i = 0; i < 200; i++) positions.add(melanger(['a', 'b', 'c']).indexOf('a'))
    expect(positions).toEqual(new Set([0, 1, 2]))
  })
})
