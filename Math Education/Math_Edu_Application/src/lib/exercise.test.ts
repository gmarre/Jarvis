import { describe, expect, it } from 'vitest'

import { exercises } from '@/content'
import { checkAnswer, formatExpected } from './exercise'
import type { Exercise } from '@/types/content'

// La regle produit posee en tete de lib/exercise.ts : compter faux une reponse
// juste ecrite autrement casse la confiance de l'eleve plus surement qu'un bug.
// Ces tests verrouillent la normalisation.

function byType(type: Exercise['type']): Exercise {
  const found = exercises.find((exercise) => exercise.type === type)
  if (!found) throw new Error(`Aucun exercice de type ${type} dans le contenu`)
  return found
}

describe('checkAnswer, exercices numeriques', () => {
  const exercise = byType('numerique')
  const expected = String(exercise.answer.value)

  it('accepte la reponse exacte', () => {
    expect(checkAnswer(exercise, expected).isCorrect).toBe(true)
  })

  it('accepte les espaces autour de la reponse', () => {
    expect(checkAnswer(exercise, `  ${expected}  `).isCorrect).toBe(true)
  })

  it('refuse une reponse vide', () => {
    expect(checkAnswer(exercise, '').isCorrect).toBe(false)
    expect(checkAnswer(exercise, '   ').isCorrect).toBe(false)
  })

  it('refuse une autre valeur', () => {
    expect(checkAnswer(exercise, String(Number(expected) + 1)).isCorrect).toBe(false)
  })
})

describe('checkAnswer, normalisation des ecritures', () => {
  const fraction: Exercise = {
    ...byType('numerique'),
    type: 'numerique',
    answer: { value: 0.75 },
  }

  it('accepte une fraction pour un decimal', () => {
    expect(checkAnswer(fraction, '3/4').isCorrect).toBe(true)
  })

  it('accepte la virgule decimale francaise', () => {
    expect(checkAnswer(fraction, '0,75').isCorrect).toBe(true)
  })

  it('accepte un zero de fin', () => {
    expect(checkAnswer(fraction, '0,750').isCorrect).toBe(true)
  })

  it('refuse une valeur arrondie : la tolerance pedagogique est une decision de contenu', () => {
    expect(checkAnswer(fraction, '0,7').isCorrect).toBe(false)
  })

  it('absorbe le bruit des flottants', () => {
    const bruite: Exercise = { ...fraction, answer: { value: 0.1 + 0.2 } }
    expect(checkAnswer(bruite, '0,3').isCorrect).toBe(true)
  })

  it('honore une tolerance explicite du contenu', () => {
    const tolerant: Exercise = { ...fraction, answer: { value: 3.14159, tolerance: 0.01 } }
    expect(checkAnswer(tolerant, '3,14').isCorrect).toBe(true)
    expect(checkAnswer(tolerant, '3,1').isCorrect).toBe(false)
  })

  it('accepte les ecritures listees dans answer.accepted', () => {
    const alternatives: Exercise = {
      ...fraction,
      type: 'texte',
      answer: { value: 'trois quarts', accepted: ['3/4', '0,75'] },
    }
    expect(checkAnswer(alternatives, '3/4').isCorrect).toBe(true)
    expect(checkAnswer(alternatives, 'Trois Quarts').isCorrect).toBe(true)
  })
})

describe('checkAnswer, vrai ou faux', () => {
  const exercise = byType('vrai_faux')

  it('compare des booleens, pas des chaines', () => {
    const attendu = Boolean(exercise.answer.value)
    expect(checkAnswer(exercise, String(attendu)).isCorrect).toBe(true)
    expect(checkAnswer(exercise, String(!attendu)).isCorrect).toBe(false)
  })
})

describe('checkAnswer, QCM', () => {
  const exercise = byType('qcm')

  it('valide la bonne cle', () => {
    expect(checkAnswer(exercise, String(exercise.answer.value)).isCorrect).toBe(true)
  })

  it('remonte l erreur de raisonnement du distracteur choisi', () => {
    const distracteur = exercise.choices?.find(
      (choice) => choice.key !== String(exercise.answer.value) && choice.misconception,
    )
    if (!distracteur) return

    const correction = checkAnswer(exercise, distracteur.key)
    expect(correction.isCorrect).toBe(false)
    expect(correction.misconception).toBe(distracteur.misconception)
  })
})

describe('formatExpected', () => {
  it('rend un libelle lisible pour chaque exercice du contenu', () => {
    for (const exercise of exercises) {
      const rendu = formatExpected(exercise)
      expect(rendu.length).toBeGreaterThan(0)
      expect(rendu).not.toContain('undefined')
    }
  })
})
