import { describe, expect, it } from 'vitest'

import { getExercisesForSkill, skills } from '@/content'
import {
  REVIEW_INTERVALS_DAYS,
  applyAttempt,
  emptyProgress,
  findPrimaryRootGap,
  findRootGaps,
  isExercisable,
  nextReviewDate,
  statusOf,
  type ProgressMap,
} from './dag'

// Le moteur de progression est la brique differenciante du produit. Trois
// regles, et ces tests les verrouillent : deblocage par les prerequis, seuil de
// maitrise sur fenetre glissante, redescente en cas d'echec repete.

function masteredMap(ids: string[]): ProgressMap {
  const progress: ProgressMap = {}
  for (const id of ids) {
    progress[id] = { ...emptyProgress(id), status: 'mastered' }
  }
  return progress
}

/** Une competence qui a des prerequis et des exercices : le cas utile a tester. */
function skillWithPrerequisites() {
  const found = skills.find(
    (skill) => skill.prerequisites.length > 0 && getExercisesForSkill(skill.id).length > 0,
  )
  if (!found) throw new Error('Le contenu ne contient aucune competence testable a prerequis')
  return found
}

describe('statusOf', () => {
  it('verrouille tant qu un prerequis manque', () => {
    const skill = skillWithPrerequisites()
    expect(statusOf({}, skill.id)).toBe('locked')
  })

  it('ouvre quand tous les prerequis sont acquis', () => {
    const skill = skillWithPrerequisites()
    expect(statusOf(masteredMap(skill.prerequisites), skill.id)).toBe('available')
  })

  it('deduit le verrouillage au lieu de le stocker', () => {
    const skill = skillWithPrerequisites()
    // Un statut perime en base ne doit pas survivre a une correction du DAG.
    const stale: ProgressMap = { [skill.id]: { ...emptyProgress(skill.id), status: 'available' } }
    expect(statusOf(stale, skill.id)).toBe('locked')
  })
})

describe('applyAttempt', () => {
  const skill = skillWithPrerequisites()
  const base = masteredMap(skill.prerequisites)
  const { required, out_of: outOf } = skill.mastery_threshold

  it('atteint la maitrise au seuil et ouvre la revision espacee', () => {
    let progress = base
    let mastered = false

    for (let i = 0; i < required; i += 1) {
      const applied = applyAttempt(progress, skill.id, true)
      progress = { ...progress, [skill.id]: applied.progress }
      mastered = mastered || applied.justMastered
    }

    expect(mastered).toBe(true)
    expect(progress[skill.id].status).toBe('mastered')
    expect(progress[skill.id].review_box).toBe(1)
    expect(progress[skill.id].next_review_at).not.toBeNull()
  })

  it('valide sur une fenetre reellement glissante', () => {
    // Juste, faux, juste doit valider un seuil de 2 sur 3 : c'est le sens de la
    // fenetre glissante, et c'est ce qu'un eleve comprend de son propre score.
    if (required !== 2 || outOf !== 3) return

    let progress = base
    let mastered = false
    for (const correct of [true, false, true]) {
      const applied = applyAttempt(progress, skill.id, correct)
      progress = { ...progress, [skill.id]: applied.progress }
      mastered = mastered || applied.justMastered
    }

    expect(mastered).toBe(true)
  })

  it('ne demaitrise pas une competence acquise sur un exercice de revision', () => {
    const progress = masteredMap([skill.id])
    const applied = applyAttempt(progress, skill.id, false)

    expect(applied.progress.status).toBe('mastered')
    expect(applied.shouldDescend).toBe(false)
  })

  it('propose de redescendre apres une fenetre pleine sans aucune reussite', () => {
    let progress: ProgressMap = {}
    let outcome = applyAttempt(progress, skill.id, false)

    for (let i = 1; i < outOf; i += 1) {
      progress = { ...progress, [skill.id]: outcome.progress }
      outcome = applyAttempt(progress, skill.id, false)
    }

    expect(outcome.shouldDescend).toBe(true)
    expect(outcome.descendTo.length).toBeGreaterThan(0)
  })

  it('ne propose pas de redescendre quand tous les prerequis sont acquis', () => {
    // Il n'y a nulle part ou aller : la competence est juste difficile.
    let progress = base
    let outcome = applyAttempt(progress, skill.id, false)

    for (let i = 1; i < outOf; i += 1) {
      progress = { ...progress, [skill.id]: outcome.progress }
      outcome = applyAttempt(progress, skill.id, false)
    }

    expect(outcome.shouldDescend).toBe(false)
    expect(outcome.descendTo).toHaveLength(0)
  })
})

describe('nextReviewDate', () => {
  it('suit le rythme de Leitner J+1, J+3, J+7, J+21', () => {
    const from = new Date('2026-09-27T10:00:00.000Z')

    REVIEW_INTERVALS_DAYS.forEach((days, index) => {
      const date = nextReviewDate(index + 1, from)
      const ecart = Math.round((date.getTime() - from.getTime()) / 86400000)
      expect(ecart).toBeGreaterThanOrEqual(days - 1)
      expect(ecart).toBeLessThanOrEqual(days)
    })
  })

  it('borne les rangs hors plage au lieu de produire une date invalide', () => {
    expect(Number.isNaN(nextReviewDate(0).getTime())).toBe(false)
    expect(Number.isNaN(nextReviewDate(99).getTime())).toBe(false)
  })
})

describe('findPrimaryRootGap', () => {
  it('ne rend jamais une competence sans exercice', () => {
    // Regression : la priorite du jour pouvait annoncer "0 exercices" puis
    // ouvrir un ecran vide.
    for (const skill of skills) {
      const priority = findPrimaryRootGap({}, skill.id)
      if (priority) expect(isExercisable(priority)).toBe(true)
    }
  })

  it('rend null plutot qu une lacune inexercable', () => {
    const sansExercice = skills.find((skill) => !isExercisable(skill.id))
    if (!sansExercice) return

    const gaps = findRootGaps({}, sansExercice.id)
    if (!gaps.some(isExercisable)) {
      expect(findPrimaryRootGap({}, sansExercice.id)).toBeNull()
    }
  })

  it('ne rend rien quand tout est maitrise', () => {
    const progress = masteredMap(skills.map((skill) => skill.id))
    for (const skill of skills) {
      expect(findPrimaryRootGap(progress, skill.id)).toBeNull()
    }
  })
})
