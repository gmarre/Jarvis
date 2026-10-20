import { describe, expect, it } from 'vitest'

import { basculerSigne, proposeLeSigne } from './saisie'

describe('basculerSigne', () => {
  it('ajoute puis retire le signe moins', () => {
    expect(basculerSigne('3,5')).toBe('-3,5')
    expect(basculerSigne('-3,5')).toBe('3,5')
    expect(basculerSigne('')).toBe('-')
    expect(basculerSigne('-')).toBe('')
  })

  it('retire aussi un moins typographique tape au clavier', () => {
    expect(basculerSigne(String.fromCharCode(0x2212) + '4')).toBe('4')
  })
})

describe('proposeLeSigne', () => {
  it('seulement a partir de la 5e', () => {
    expect(proposeLeSigne('B044')).toBe(true) // relatifs, 5e
    expect(proposeLeSigne('A001')).toBe(false) // CP
    expect(proposeLeSigne('INCONNU')).toBe(false)
  })
})
