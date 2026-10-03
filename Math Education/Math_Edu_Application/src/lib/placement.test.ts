import { describe, expect, it } from 'vitest'

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

// Ces tests couvrent la regression qui rendait le produit inutilisable : le test
// de positionnement choisissait la competence suivante sans verifier qu'elle
// possede un exercice. Resultat : cul-de-sac des la premiere bonne reponse, et
// donc aucun eleve ne pouvait creer son parcours.
//
// La regle a tenir : tant que le test n'est pas termine, la competence courante
// a toujours une question a poser.
//
// Ce fichier tourne sur le contenu reel. Depuis le 3 octobre 2026, toutes ses
// competences ont des exercices : le contournement des competences vides est
// donc teste a part, sur un contenu troue expres (placement.trous.test.ts).

type Strategy = 'toujours juste' | 'toujours faux' | 'alterne'

function respond(strategy: Strategy, questionNumber: number): boolean {
  if (strategy === 'toujours juste') return true
  if (strategy === 'toujours faux') return false
  return questionNumber % 2 === 0
}

interface RunResult {
  state: PlacementState
  questions: number
  /** Competence sur laquelle le test s'est retrouve sans question a poser. */
  deadEnd: string | null
}

/** Deroule un test de positionnement complet et signale tout cul-de-sac. */
function runPlacement(level: SchoolLevel | null, strategy: Strategy): RunResult {
  let state = startPlacement(level)
  let questions = 0

  while (!state.done && state.current) {
    if (!placementExercise(state.current)) {
      return { state, questions, deadEnd: state.current }
    }
    state = answerPlacement(state, respond(strategy, questions))
    questions += 1
    // Garde-fou du test lui-meme : le moteur doit s'arreter seul.
    expect(questions).toBeLessThanOrEqual(state.maxQuestions + 1)
  }

  return { state, questions, deadEnd: null }
}

const STRATEGIES: Strategy[] = ['toujours juste', 'toujours faux', 'alterne']

describe('startPlacement', () => {
  it.each(SCHOOL_LEVELS)('pose une premiere question interrogeable en %s', (level) => {
    const state = startPlacement(level)
    expect(state.current).not.toBeNull()
    expect(state.done).toBe(false)
    expect(placementExercise(state.current as string)).not.toBeNull()
  })

  it('pose une premiere question meme sans niveau scolaire renseigne', () => {
    const state = startPlacement(null)
    expect(state.current).not.toBeNull()
    expect(placementExercise(state.current as string)).not.toBeNull()
  })
})

describe('answerPlacement', () => {
  const cases = SCHOOL_LEVELS.flatMap((level) =>
    STRATEGIES.map((strategy) => ({ level, strategy })),
  )

  it.each(cases)('termine sans cul-de-sac en $level, strategie $strategy', ({ level, strategy }) => {
    const { state, questions, deadEnd } = runPlacement(level, strategy)

    expect(deadEnd).toBeNull()
    expect(state.done).toBe(true)
    expect(questions).toBeGreaterThan(0)
  })

  it('ne pose jamais deux fois la meme competence', () => {
    for (const level of SCHOOL_LEVELS) {
      for (const strategy of STRATEGIES) {
        const { state } = runPlacement(level, strategy)
        expect(new Set(state.asked).size).toBe(state.asked.length)
      }
    }
  })

  it('ne depasse jamais le plafond de questions', () => {
    for (const level of SCHOOL_LEVELS) {
      for (const strategy of STRATEGIES) {
        const { state } = runPlacement(level, strategy)
        expect(state.questionIndex).toBeLessThanOrEqual(state.maxQuestions)
      }
    }
  })

  it('valide les prerequis d une competence reussie', () => {
    const state = startPlacement('4e')
    const current = state.current as string
    const prerequisites = skills.find((s) => s.id === current)?.prerequisites ?? []

    const next = answerPlacement(state, true)

    expect(next.mastered).toContain(current)
    for (const prerequisite of prerequisites) {
      expect(next.mastered).toContain(prerequisite)
    }
  })

  it('ne valide rien sur une reponse fausse', () => {
    const state = startPlacement('4e')
    const next = answerPlacement(state, false)

    expect(next.mastered).toHaveLength(0)
    expect(next.failed).toContain(state.current as string)
  })
})

describe('pickObjectif', () => {
  it.each(SCHOOL_LEVELS)('propose un objectif exercable en %s', (level) => {
    const { state } = runPlacement(level, 'alterne')
    const objectif = pickObjectif(state.mastered, level)

    expect(objectif).not.toBeNull()
    expect(isTestable(objectif as string)).toBe(true)
  })

  it('ne propose jamais une competence deja maitrisee', () => {
    const mastered = skills.slice(0, 5).map((skill) => skill.id)
    const objectif = pickObjectif(mastered, '4e')

    expect(mastered).not.toContain(objectif)
  })
})
