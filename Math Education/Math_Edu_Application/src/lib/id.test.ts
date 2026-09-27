import { afterEach, describe, expect, it, vi } from 'vitest'

import { newId } from './id'

// Le repli de newId() n'est pas theorique : servir l'application sur une IP de
// reseau local en http, ce qui est la facon de tester sur un vrai telephone,
// prive le navigateur de crypto.randomUUID. Sans repli, l'app planterait a la
// premiere reponse d'exercice, et seulement sur mobile.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('newId', () => {
  it('produit un UUID v4 valide', () => {
    expect(newId()).toMatch(UUID_V4)
  })

  it('ne produit pas deux fois le meme', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId()))
    expect(ids.size).toBe(2000)
  })

  it('fonctionne sans randomUUID, par getRandomValues', () => {
    // Cas d'un contexte non securise : getRandomValues reste disponible.
    vi.stubGlobal('crypto', {
      getRandomValues: (a: Uint8Array) => {
        for (let i = 0; i < a.length; i += 1) a[i] = (i * 17 + 3) % 256
        return a
      },
    })

    expect(newId()).toMatch(UUID_V4)
  })

  it('fonctionne sans crypto du tout', () => {
    vi.stubGlobal('crypto', undefined)

    expect(newId()).toMatch(UUID_V4)
    expect(newId()).not.toBe(newId())
  })
})
