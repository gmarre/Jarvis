import { describe, expect, it } from 'vitest'

import { chargerContenuLocal } from '@/content/chargement'
import { checkAnswer, formatExpected } from './exercise'
import { versExerciceACorriger } from '../../supabase/functions/_shared/correction'
import { toPublicExercise, type Exercise } from '@/types/content'

// La banque complete, reponses comprises : celle que l'application installe
// n'en a plus depuis la phase 3.
const { exercises } = await chargerContenuLocal()

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

  it('affiche un nombre decimal avec une virgule, unite comprise', () => {
    const base = byType('numerique')
    const decimal: Exercise = { ...base, answer: { value: 3.5 } }
    const avecUnite: Exercise = { ...base, answer: { value: 12.75, unit: '€' } }

    expect(formatExpected(decimal)).toBe('3,5')
    expect(formatExpected(avecUnite)).toBe('12,75 €')
  })

  it('accepte la virgule a la saisie d une reponse decimale', () => {
    const base = byType('numerique')
    const decimal: Exercise = { ...base, answer: { value: 3.5 } }

    expect(checkAnswer(decimal, '3,5').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '3.5').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '3,50').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '35').isCorrect).toBe(false)
  })
})

describe('checkAnswer, ce que le serveur renvoie apres correction', () => {
  it('donne la bonne proposition d un QCM et le corrige', () => {
    const exercise = byType('qcm')
    const correction = checkAnswer(exercise, 'z')
    expect(correction.expectedKey).toBe(String(exercise.answer.value))
    expect(correction.solutionSteps).toEqual(exercise.solution_steps)
  })

  it('donne true ou false pour un vrai/faux, rien pour une saisie libre', () => {
    const vraiFaux = byType('vrai_faux')
    expect(checkAnswer(vraiFaux, 'true').expectedKey).toBe(String(Boolean(vraiFaux.answer.value)))
    expect(checkAnswer(byType('numerique'), '1').expectedKey).toBeNull()
  })
})

describe('separation de la reponse', () => {
  it('la version publique ne porte ni reponse, ni corrige, ni misconception', () => {
    for (const exercise of exercises) {
      const publique = toPublicExercise(exercise)
      const texte = JSON.stringify(publique)
      expect(publique).not.toHaveProperty('answer')
      expect(publique).not.toHaveProperty('solution_steps')
      expect(texte).not.toContain('misconception')
      expect(publique.answer_unit).toBe(exercise.answer.unit ?? null)
    }
  })

  it('le serveur recompose l exercice et corrige comme l application', () => {
    // Meme decoupage que publier_contenu() (migration 0005), puis la
    // recomposition de l'Edge Function : le verdict doit etre identique.
    for (const exercise of exercises) {
      const recompose = versExerciceACorriger({
        type: exercise.type,
        choices: exercise.choices?.map(({ key, text }) => ({ key, text })) ?? null,
        content_exercise_keys: {
          answer: exercise.answer,
          solution_steps: exercise.solution_steps,
          misconceptions: Object.fromEntries(
            (exercise.choices ?? []).map((c) => [c.key, c.misconception]),
          ),
        },
      })
      expect(recompose).not.toBeNull()
      const reponses = [String(exercise.answer.value), 'faux', ...(exercise.choices ?? []).map((c) => c.key)]
      for (const reponse of reponses) {
        expect(checkAnswer(recompose!, reponse)).toEqual(checkAnswer(exercise, reponse))
      }
    }
  })

  it('refuse de corriger un exercice sans cle', () => {
    expect(versExerciceACorriger({ type: 'qcm', choices: null, content_exercise_keys: null })).toBeNull()
  })
})

describe('checkAnswer, espaces des grands nombres', () => {
  it('accepte 1 024 ecrit avec une espace insecable, fine ou ordinaire', () => {
    const base = byType('numerique')
    const grand: Exercise = { ...base, answer: { value: 1024 } }
    // Construits par code : un caractere invisible colle dans la source se
    // perd ou se remplace sans qu'on le voie.
    for (const espace of [0x00a0, 0x202f, 0x2009, 0x20]) {
      expect(checkAnswer(grand, `1${String.fromCharCode(espace)}024`).isCorrect).toBe(true)
    }
  })
})
