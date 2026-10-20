import { describe, expect, it } from 'vitest'

import { installerContenu } from '@/content'
import { applyAttempt, buildPathToTarget, emptyProgress, findRootGaps, statusOf, type ProgressMap } from './dag'
import type { PublicExercise, Skill } from '@/types/content'

// Une competence sans exercice ne bloque pas ses dependantes (isCleared).
// Cas reel : etape 4a, cinq competences de mesure attendent leurs figures
// (regle, horloge, quadrillage), et l'aire en depend. Ce fichier installe un
// petit DAG a lui : X1 -> X2 (vide) -> X3. Vitest isole chaque fichier de test,
// le contenu reel des autres tests n'est pas touche.

function competence(id: string, prerequisites: string[]): Skill {
  return {
    id,
    domain: 'P',
    domain_name: 'Grandeurs et mesures',
    label: id,
    description: id,
    prerequisites,
    difficulty: 1,
    school_level: 'CE1',
    validation_test: id,
    mastery_threshold: { required: 1, out_of: 1 },
    exercise_ids: [],
    mindmap_id: null,
  }
}

function exercice(skillId: string): PublicExercise {
  return {
    id: `EX-${skillId}-D-01`,
    skill_id: skillId,
    level: 'decouverte',
    type: 'numerique',
    statement: '1 + 1 ?',
    image: null,
    hint: null,
    answer_unit: null,
    estimated_duration_s: 30,
    review_status: 'relu_agent',
    programme_ref: null,
  }
}

installerContenu({
  skills: [competence('X1', []), competence('X2', ['X1']), competence('X3', ['X2'])],
  exercises: [exercice('X1'), exercice('X3')],
  mindmaps: [],
  flashcards: [],
  superExercises: [],
})

function progression(maitrisees: string[]): ProgressMap {
  const carte: ProgressMap = {}
  for (const id of ['X1', 'X2', 'X3']) {
    carte[id] = maitrisees.includes(id) ? { ...emptyProgress(id), status: 'mastered' } : emptyProgress(id)
  }
  return carte
}

describe('competence sans exercice', () => {
  it('ne verrouille pas sa dependante une fois ses propres prerequis acquis', () => {
    expect(statusOf(progression(['X1']), 'X3')).toBe('available')
  })

  it('laisse la dependante verrouillee tant que le prerequis en amont manque', () => {
    expect(statusOf(progression([]), 'X3')).toBe('locked')
  })

  it("n'est jamais une lacune racine ni une etape du chemin", () => {
    expect(findRootGaps(progression([]), 'X3')).toEqual(['X1'])
    expect(findRootGaps(progression(['X1']), 'X3')).toEqual(['X3'])
    const etapes = buildPathToTarget(progression([]), 'X3', { includeAcquiredAnchor: false })
    expect(etapes.map((e) => e.skill.id)).toEqual(['X1', 'X3'])
  })

  it("ne sert pas de point de chute quand l'eleve echoue", () => {
    // X3 echouee : son seul prerequis direct est vide, il n'y a nulle part ou redescendre.
    const resultat = applyAttempt(progression(['X1']), 'X3', 'EX-X3-D-01', false)
    expect(resultat.descendTo).not.toContain('X2')
  })
})
