import { describe, expect, it } from 'vitest'

import { MINIMUM_AGE_WITHOUT_CONSENT, ageFrom, needsParentalConsent } from './age'

// Regle juridique, pas regle d'affichage : en dessous de 15 ans l'accord d'un
// parent est obligatoire. Ces tests existent parce que la logique est desormais
// partagee par l'inscription et par l'ecran de complementation apres connexion
// Google, et qu'une divergence entre les deux serait un manquement RGPD.

const MAINTENANT = new Date('2026-09-27T12:00:00.000Z')

describe('ageFrom', () => {
  it('calcule l age revolu', () => {
    expect(ageFrom('2012-03-14', MAINTENANT)).toBe(14)
    expect(ageFrom('2010-01-01', MAINTENANT)).toBe(16)
  })

  it('ne compte pas l anniversaire pas encore passe', () => {
    // Anniversaire le 28 septembre, on est le 27 : encore 14 ans.
    expect(ageFrom('2011-09-28', MAINTENANT)).toBe(14)
    // Anniversaire le 27 septembre, c'est aujourd'hui : 15 ans.
    expect(ageFrom('2011-09-27', MAINTENANT)).toBe(15)
    // Anniversaire le 26, c'etait hier.
    expect(ageFrom('2011-09-26', MAINTENANT)).toBe(15)
  })

  it('rend null sur une date absente ou invalide', () => {
    expect(ageFrom('', MAINTENANT)).toBeNull()
    expect(ageFrom('pas une date', MAINTENANT)).toBeNull()
    expect(ageFrom('2011-13-45', MAINTENANT)).toBeNull()
  })

  it('rend null sur une date de naissance future', () => {
    // Une saisie erronee ne doit pas produire un age negatif qui passerait
    // silencieusement sous le seuil.
    expect(ageFrom('2030-01-01', MAINTENANT)).toBeNull()
  })
})

describe('needsParentalConsent', () => {
  it('exige le consentement en dessous de 15 ans', () => {
    expect(needsParentalConsent('eleve', '2012-03-14', MAINTENANT)).toBe(true)
    expect(needsParentalConsent('eleve', '2016-01-01', MAINTENANT)).toBe(true)
  })

  it('ne l exige plus a partir de 15 ans', () => {
    expect(needsParentalConsent('eleve', '2011-09-27', MAINTENANT)).toBe(false)
    expect(needsParentalConsent('eleve', '2005-01-01', MAINTENANT)).toBe(false)
  })

  it('l exige par defaut tant que la date est inconnue', () => {
    // Mieux vaut demander a tort que d'oublier : c'est le cas d'un retour de
    // connexion Google, qui ne fournit pas la date de naissance.
    expect(needsParentalConsent('eleve', '', MAINTENANT)).toBe(true)
  })

  it('ne concerne ni les professeurs ni les parents', () => {
    expect(needsParentalConsent('prof', '', MAINTENANT)).toBe(false)
    expect(needsParentalConsent('parent', '2012-03-14', MAINTENANT)).toBe(false)
  })

  it('applique bien le seuil legal francais', () => {
    expect(MINIMUM_AGE_WITHOUT_CONSENT).toBe(15)
  })
})
