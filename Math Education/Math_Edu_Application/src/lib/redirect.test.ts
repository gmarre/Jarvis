import { describe, expect, it } from 'vitest'

import { safeRedirect } from './redirect'

// L'ecran de connexion renvoie l'utilisateur vers la page qu'il voulait ouvrir.
// Cette destination ne doit jamais pouvoir sortir de l'application : sinon un
// lien pieges du type https://app/\\evil.com fait atterrir l'eleve chez un tiers
// juste apres qu'il a saisi son mot de passe.

describe('safeRedirect', () => {
  it('conserve un chemin interne', () => {
    expect(safeRedirect('/travail')).toBe('/travail')
    expect(safeRedirect('/exercice/C003')).toBe('/exercice/C003')
  })

  it('retombe sur l accueil sans destination', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect('')).toBe('/')
  })

  it('refuse les adresses hors application', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('/\\evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('http://evil.com')).toBe('/')
    expect(safeRedirect('javascript:alert(1)')).toBe('/')
    expect(safeRedirect('evil.com')).toBe('/')
  })

  it('evite de renvoyer sur la connexion elle-meme', () => {
    expect(safeRedirect('/connexion')).toBe('/')
  })
})
