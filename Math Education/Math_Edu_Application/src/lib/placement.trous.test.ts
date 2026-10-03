import { describe, expect, it, vi } from 'vitest'

// Le positionnement doit contourner les competences sans exercice. Le contenu
// reel n'en a plus aucune depuis le 3 octobre 2026, mais il en aura de nouveau
// des que le DAG s'etendra vers ses 414 competences. Ce fichier remet donc a
// vide, expres, les 15 competences qui l'etaient au sprint 1 : c'est sur elles
// que le test de positionnement tombait en cul-de-sac.
const COMPETENCES_VIDES = new Set([
  'B001', 'B005', 'B006',
  'C026', 'C027', 'C029', 'C030', 'C031', 'C032',
  'A012', 'A013', 'A014', 'A026', 'A027', 'A028',
])

vi.mock('@/content', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/content')>()
  return {
    ...reel,
    getExercisesForSkill: (skillId: string) =>
      COMPETENCES_VIDES.has(skillId) ? [] : reel.getExercisesForSkill(skillId),
  }
})

import { skills } from '@/content'
import {
  answerPlacement,
  isTestable,
  pickObjectif,
  placementExercise,
  startPlacement,
  type PlacementState,
} from './placement'
import { SCHOOL_LEVELS, type SchoolLevel } from '@/types/content'

type Strategy = 'toujours juste' | 'toujours faux' | 'alterne'
const STRATEGIES: Strategy[] = ['toujours juste', 'toujours faux', 'alterne']

function respond(strategy: Strategy, questionNumber: number): boolean {
  if (strategy === 'toujours juste') return true
  if (strategy === 'toujours faux') return false
  return questionNumber % 2 === 0
}

/** Deroule un test complet et rend la competence ou il s'est bloque, s'il y en a une. */
function runPlacement(level: SchoolLevel, strategy: Strategy) {
  let state: PlacementState = startPlacement(level)
  let questions = 0

  while (!state.done && state.current) {
    if (!placementExercise(state.current)) return { state, deadEnd: state.current }
    state = answerPlacement(state, respond(strategy, questions))
    questions += 1
    expect(questions).toBeLessThanOrEqual(state.maxQuestions + 1)
  }
  return { state, deadEnd: null }
}

describe('positionnement sur un contenu troue', () => {
  it('le contenu simule a bien des trous', () => {
    const vides = skills.filter((skill) => !isTestable(skill.id)).map((skill) => skill.id)
    expect(new Set(vides)).toEqual(COMPETENCES_VIDES)
  })

  const cases = SCHOOL_LEVELS.flatMap((level) =>
    STRATEGIES.map((strategy) => ({ level, strategy })),
  )

  it.each(cases)('termine sans cul-de-sac en $level, strategie $strategy', ({ level, strategy }) => {
    const { state, deadEnd } = runPlacement(level, strategy)

    expect(deadEnd).toBeNull()
    expect(state.done).toBe(true)
    // Aucune question n'a porte sur une competence sans exercice.
    expect(state.asked.filter((id) => COMPETENCES_VIDES.has(id))).toEqual([])
  })

  it.each(SCHOOL_LEVELS)('propose un objectif exercable en %s', (level) => {
    const { state } = runPlacement(level, 'alterne')
    const objectif = pickObjectif(state.mastered, level)

    expect(objectif).not.toBeNull()
    expect(COMPETENCES_VIDES.has(objectif as string)).toBe(false)
  })
})
