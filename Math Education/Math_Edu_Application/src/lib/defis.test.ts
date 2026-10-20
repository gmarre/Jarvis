import { describe, expect, it } from 'vitest'

import type { Flashcard } from '@/types/content'
import {
  BOITE_MAX,
  apresDefi,
  cartesDeLaSeance,
  defiDu,
  defisDusParCompetence,
  nombreDeNouvelles,
  type DefiProgressMap,
} from './defis'

// L'horloge est passee en parametre et avancee a la main, comme pour la
// maitrise : on prouve le calendrier sans attendre des semaines.

const JOUR = 24 * 3600 * 1000
const T0 = new Date(2026, 9, 21, 18, 0)
const plus = (jours: number, depuis = T0) => new Date(depuis.getTime() + jours * JOUR)

function carte(id: string, skill_id = 'C012'): Flashcard {
  return { id, skill_id, recto: 'r', verso: 'v', review_status: 'relu_agent' }
}

describe('apresDefi', () => {
  it('une premiere carte sue va en boite 1, a revoir demain matin', () => {
    const p = apresDefi(undefined, carte('FC-C012-01'), true, T0)
    expect(p.box).toBe(1)
    expect(defiDu(p, plus(0.4))).toBe(false)
    expect(defiDu(p, plus(1))).toBe(true)
  })

  it('je savais fait monter d une boite, jusqu a la cinquieme', () => {
    let p = apresDefi(undefined, carte('FC-C012-01'), true, T0)
    for (let i = 0; i < 10; i++) p = apresDefi(p, carte('FC-C012-01'), true, T0)
    expect(p.box).toBe(BOITE_MAX)
    expect(p.reviews).toBe(11)
  })

  it('calendrier J+1, J+3, J+7, J+14, J+30', () => {
    const c = carte('FC-C012-01')
    let quand = T0
    let p = apresDefi(undefined, c, true, quand)
    for (const attendu of [3, 7, 14, 30]) {
      quand = new Date(p.next_review_at)
      p = apresDefi(p, c, true, quand)
      // Controle en fin de matinee : un passage a l'heure d'hiver dans
      // l'intervalle decale l'echeance de 6 h d'une heure, pas plus.
      expect(defiDu(p, plus(attendu - 1 + 0.25, quand))).toBe(false)
      expect(defiDu(p, plus(attendu + 0.25, quand))).toBe(true)
    }
  })

  it('je ne savais pas renvoie en boite 1, quelle que soit la boite', () => {
    let p = apresDefi(undefined, carte('FC-C012-01'), true, T0)
    p = apresDefi(p, carte('FC-C012-01'), true, T0)
    p = apresDefi(p, carte('FC-C012-01'), false, T0)
    expect(p.box).toBe(1)
    expect(p.last_knew).toBe(false)
  })
})

describe('cartesDeLaSeance', () => {
  const cartes = [carte('FC-C012-01'), carte('FC-C012-02'), carte('FC-C012-03')]

  it('premiere seance : toutes les cartes, dans l ordre du contenu', () => {
    expect(cartesDeLaSeance(cartes, {}, T0).map((c) => c.id)).toEqual([
      'FC-C012-01',
      'FC-C012-02',
      'FC-C012-03',
    ])
  })

  it('les cartes dues passent avant les nouvelles, celles qui tiennent sont ecartees', () => {
    const progression: DefiProgressMap = {
      'FC-C012-01': apresDefi(undefined, cartes[0], true, plus(-5)),
      'FC-C012-02': apresDefi(undefined, cartes[1], true, T0),
    }
    // 01 due depuis 4 jours, 02 pas encore due, 03 jamais vue.
    expect(cartesDeLaSeance(cartes, progression, T0).map((c) => c.id)).toEqual(['FC-C012-01', 'FC-C012-03'])
  })
})

describe('defisDusParCompetence et nombreDeNouvelles', () => {
  it('compte les cartes dues par competence, sans les cartes jamais vues', () => {
    const progression: DefiProgressMap = {
      'FC-C012-01': apresDefi(undefined, carte('FC-C012-01'), true, plus(-3)),
      'FC-C012-02': apresDefi(undefined, carte('FC-C012-02'), false, plus(-2)),
      'FC-A001-01': apresDefi(undefined, carte('FC-A001-01', 'A001'), true, T0),
    }
    const dues = defisDusParCompetence(progression, T0)
    expect(dues.get('C012')).toBe(2)
    expect(dues.has('A001')).toBe(false)
    expect(nombreDeNouvelles([carte('FC-C012-01'), carte('FC-C012-05')], progression)).toBe(1)
  })
})
