import { describe, expect, it } from 'vitest'

import type { Correction } from '@/lib/exercise'
import type { SuperQuestion } from '@/types/content'
import { epreuveDe, resultatSuper, seuilDeReussite, superReussi } from './super'

function question(key: string, skill_id: string, points: number): SuperQuestion {
  return { key, skill_id, statement: 's', type: 'numerique', points }
}

function corrige(key: string, isCorrect: boolean): { key: string; correction: Correction } {
  return {
    key,
    correction: { isCorrect, expected: '', expectedKey: null, misconception: null, solutionSteps: [] },
  }
}

const sx = {
  questions: [question('q1', 'C012', 2), question('q2', 'B004', 3), question('q3', 'C012', 3), question('q4', 'D001', 2)],
}

describe('seuilDeReussite', () => {
  it('70 % des points, arrondi au-dessus', () => {
    expect(seuilDeReussite(10)).toBe(7)
    expect(seuilDeReussite(12)).toBe(9)
    expect(seuilDeReussite(7)).toBe(5)
  })
})

describe('resultatSuper', () => {
  it('compte les points des questions justes et liste les competences a retravailler', () => {
    const bilan = resultatSuper(sx, [corrige('q1', true), corrige('q2', true), corrige('q3', false), corrige('q4', false)])
    expect(bilan).toEqual({ score: 5, total: 10, seuil: 7, reussi: false, aRetravailler: ['C012', 'D001'] })
  })

  it('reussi a partir du seuil exactement', () => {
    const bilan = resultatSuper(sx, [corrige('q1', true), corrige('q2', true), corrige('q3', false), corrige('q4', true)])
    expect(bilan.score).toBe(7)
    expect(bilan.reussi).toBe(true)
  })

  it('une question sans resultat compte faux', () => {
    expect(resultatSuper(sx, [corrige('q1', true)]).score).toBe(2)
  })
})

describe('superReussi', () => {
  it('vrai si au moins un passage est reussi', () => {
    const passage = { id: '1', super_id: 'SX-C012-01', skill_id: 'C012', score: 7, total: 10, reussi: true, reponses: {}, duree_s: 0, created_at: '' }
    expect(superReussi('SX-C012-01', [{ ...passage, reussi: false }])).toBe(false)
    expect(superReussi('SX-C012-01', [{ ...passage, reussi: false }, passage])).toBe(true)
  })
})

describe('epreuveDe', () => {
  const p = (super_id: string, score: number, total: number, reussi: boolean) => ({
    id: super_id + score, super_id, skill_id: 'C012', score, total, reussi, reponses: {}, duree_s: 0, created_at: '',
  })
  it('sans super exercice : rien n existe', () => {
    expect(epreuveDe([], [p('SX-C012-01', 10, 10, true)])).toEqual({ existe: false, reussie: false, sansFaute: false })
  })
  it('reussi, puis sans faute, seulement pour ses propres super exercices', () => {
    expect(epreuveDe(['SX-C012-01'], [p('SX-C012-01', 5, 10, false)])).toEqual({ existe: true, reussie: false, sansFaute: false })
    expect(epreuveDe(['SX-C012-01'], [p('SX-C012-01', 8, 10, true)]).sansFaute).toBe(false)
    expect(epreuveDe(['SX-C012-01'], [p('SX-C012-01', 8, 10, true), p('SX-C012-01', 10, 10, true)]).sansFaute).toBe(true)
    expect(epreuveDe(['SX-C012-01'], [p('SX-C013-01', 10, 10, true)]).reussie).toBe(false)
  })
})
