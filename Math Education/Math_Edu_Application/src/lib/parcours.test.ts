import { describe, expect, it } from 'vitest'

import { getExercisesForSkill, skills } from '@/content'
import { emptyProgress, findPrimaryRootGap, isExercisable, type ProgressMap } from './dag'
import {
  answerPlacement,
  pickObjectif,
  placementExercise,
  startPlacement,
  type PlacementState,
} from './placement'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'

// Test d'integration de la chaine qui etait cassee de bout en bout :
//
//   inscription -> test de positionnement -> objectif -> priorite du jour -> exercices
//
// Chaque maillon a ses tests unitaires, mais c'est leur enchainement qui decide
// si un eleve peut utiliser le produit. Le critere a tenir : apres son test de
// positionnement, un eleve de n'importe quel niveau obtient une priorite du jour
// qui a de vrais exercices a lui proposer.

/** Reproduit le calcul de progression fait par l'ecran de positionnement. */
function progressFromPlacement(state: PlacementState): ProgressMap {
  const progress: ProgressMap = {}
  for (const skill of skills) {
    progress[skill.id] = state.mastered.includes(skill.id)
      ? {
          ...emptyProgress(skill.id),
          status: 'mastered',
          score: skill.mastery_threshold.required,
          attempts: skill.mastery_threshold.out_of,
          review_box: 1,
          updated_at: new Date().toISOString(),
        }
      : emptyProgress(skill.id)
  }
  return progress
}

type Strategy = 'toujours juste' | 'toujours faux' | 'alterne'

interface Journey {
  questionsPosees: number
  objectif: string | null
  priority: string | null
  priorityExerciseCount: number
}

/** Deroule inscription puis positionnement, et rend ce que l'espace de travail affichera. */
function journey(level: SchoolLevel, strategy: Strategy): Journey {
  let state = startPlacement(level)
  let asked = 0

  while (!state.done && state.current) {
    const exercise = placementExercise(state.current)
    // Le test ne doit jamais tomber sur une competence sans question.
    expect(exercise, `cul-de-sac en ${level} sur ${state.current}`).not.toBeNull()

    const correct =
      strategy === 'toujours juste' ? true : strategy === 'toujours faux' ? false : asked % 2 === 0
    state = answerPlacement(state, correct)
    asked += 1
    expect(asked).toBeLessThanOrEqual(state.maxQuestions + 1)
  }

  const progress = progressFromPlacement(state)
  const objectif = pickObjectif(state.mastered, level)
  const priority = objectif ? findPrimaryRootGap(progress, objectif) : null

  return {
    questionsPosees: asked,
    objectif,
    priority,
    priorityExerciseCount: priority ? getExercisesForSkill(priority).length : 0,
  }
}

const STRATEGIES: Strategy[] = ['toujours juste', 'toujours faux', 'alterne']
const CAS = SCHOOL_LEVELS.flatMap((level) => STRATEGIES.map((strategy) => ({ level, strategy })))

describe('parcours complet, de l inscription au premier exercice', () => {
  it.each(CAS)('aboutit a un exercice en $level, strategie $strategy', ({ level, strategy }) => {
    const { questionsPosees, objectif, priority, priorityExerciseCount } = journey(level, strategy)

    expect(questionsPosees).toBeGreaterThan(0)
    expect(objectif).not.toBeNull()

    // Une priorite nulle est acceptable uniquement si l'eleve a tout maitrise.
    // Sinon elle doit etre reellement travaillable, sinon l'espace de travail
    // annonce "0 exercices" puis ouvre un ecran vide.
    if (priority) {
      expect(isExercisable(priority)).toBe(true)
      expect(priorityExerciseCount).toBeGreaterThan(0)
    }
  })

  it('propose bien du travail a un eleve qui echoue partout', () => {
    // Le cas le plus important du produit : l'eleve en difficulte doit recevoir
    // une lacune racine exercable, c'est toute la promesse du DAG.
    for (const level of SCHOOL_LEVELS) {
      const { priority, priorityExerciseCount } = journey(level, 'toujours faux')

      expect(priority, `aucune priorite en ${level}`).not.toBeNull()
      expect(priorityExerciseCount).toBeGreaterThan(0)
    }
  })

  it('reste dans un budget de questions acceptable', () => {
    // Le produit promet une dizaine de questions, pas un questionnaire fleuve.
    for (const { level, strategy } of CAS) {
      expect(journey(level, strategy).questionsPosees).toBeLessThanOrEqual(13)
    }
  })
})
