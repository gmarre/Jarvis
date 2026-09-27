// Test de positionnement adaptatif.
//
// Le principe (CLAUDE.md, Jalon 4) : une dizaine de questions qui descendent le
// DAG plutot qu'un questionnaire lineaire. Bonne reponse, on monte ; mauvaise
// reponse, on redescend sur un prerequis. On s'arrete quand la frontiere de
// maitrise est localisee.
//
// Hypothese assumee : une competence reussie vaut validation de ses prerequis.
// C'est ce qui permet de couvrir 26 competences en 10 questions au lieu de 26.

import { getDependents, getExercisesForSkill, getSkill, levelRank, skills } from '@/content'
import type { Exercise, SchoolLevel, Skill } from '@/types/content'

export interface PlacementState {
  /** Competence en cours d'evaluation. */
  current: string | null
  /** Competences deduites maitrisees. */
  mastered: string[]
  /** Competences echouees, donc non maitrisees. */
  failed: string[]
  /** Competences deja posees, pour ne jamais reposer la meme. */
  asked: string[]
  questionIndex: number
  maxQuestions: number
  done: boolean
}

/** Nombre de questions au-dela duquel on arrete, meme sans frontiere nette. */
const MAX_QUESTIONS = 12

function byCursusAsc(a: Skill, b: Skill): number {
  const rank = levelRank(a.school_level) - levelRank(b.school_level)
  if (rank !== 0) return rank
  const difficulty = a.difficulty - b.difficulty
  if (difficulty !== 0) return difficulty
  return a.id.localeCompare(b.id)
}

/**
 * Une competence n'est interrogeable que si elle possede au moins un exercice.
 *
 * Le contenu pilote ne couvre pas encore tout le DAG. Sans ce garde-fou, le test
 * tombait sur une competence sans exercice et s'arretait sur un ecran sans issue,
 * pour la plupart des niveaux des la premiere bonne reponse.
 */
export function isTestable(skillId: string): boolean {
  return getExercisesForSkill(skillId).length > 0
}

/** Voisins d'une competence : vers le haut ce qu'elle debloque, vers le bas ses prerequis. */
function neighbours(skillId: string, direction: 'up' | 'down'): string[] {
  return direction === 'up' ? getDependents(skillId) : (getSkill(skillId)?.prerequisites ?? [])
}

/**
 * Competences interrogeables les plus proches d'une competence donnee, dans un
 * sens ou dans l'autre, en ignorant celles deja evaluees.
 *
 * On traverse les competences sans exercice au lieu de s'y arreter : le
 * diagnostic continue sa descente ou sa montee, il saute juste les trous du
 * contenu. Rendues triees dans l'ordre du cursus.
 */
function nearestTestable(
  from: string,
  direction: 'up' | 'down',
  isTested: (id: string) => boolean,
): Skill[] {
  const seen = new Set<string>([from])
  const found: Skill[] = []
  const queue = [...neighbours(from, direction)]

  while (queue.length > 0) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    seen.add(id)

    const skill = getSkill(id)
    if (skill && !isTested(id) && isTestable(id)) {
      // Frontiere atteinte de ce cote : on n'explore pas au-dela.
      found.push(skill)
      continue
    }
    queue.push(...neighbours(id, direction))
  }

  return found.sort(byCursusAsc)
}

/**
 * Premiere question : une competence du niveau de l'eleve, ou la plus proche
 * en dessous. On commence par ce qu'il est cense savoir faire, pas par le CP.
 */
export function startPlacement(level: SchoolLevel | null): PlacementState {
  const sorted = [...skills].filter((s) => isTestable(s.id)).sort(byCursusAsc)
  const target = level ? levelRank(level) : Math.floor(sorted.length / 2)

  const atOrBelow = sorted.filter((s) => levelRank(s.school_level) <= target)
  const first = (atOrBelow.length > 0 ? atOrBelow[atOrBelow.length - 1] : sorted[0]) ?? null

  return {
    current: first?.id ?? null,
    mastered: [],
    failed: [],
    asked: first ? [first.id] : [],
    questionIndex: 1,
    maxQuestions: MAX_QUESTIONS,
    done: !first,
  }
}

/** Tous les prerequis, directs et indirects, d'une competence. */
function ancestors(skillId: string): string[] {
  const seen = new Set<string>()
  const queue = [...(getSkill(skillId)?.prerequisites ?? [])]
  while (queue.length > 0) {
    const id = queue.shift() as string
    if (seen.has(id)) continue
    seen.add(id)
    queue.push(...(getSkill(id)?.prerequisites ?? []))
  }
  return [...seen]
}

/**
 * Applique une reponse et choisit la question suivante.
 *
 * Reussite : la competence et tous ses prerequis passent maitrises, on monte
 * vers ce qu'elle debloque. Echec : on redescend sur un prerequis non encore
 * evalue. Quand tous les prerequis d'une competence echouee sont acquis, cette
 * competence est une lacune racine et la branche est close.
 */
export function answerPlacement(state: PlacementState, isCorrect: boolean): PlacementState {
  if (!state.current || state.done) return state

  const mastered = new Set(state.mastered)
  const failed = new Set(state.failed)
  const asked = new Set(state.asked)

  if (isCorrect) {
    mastered.add(state.current)
    for (const id of ancestors(state.current)) {
      mastered.add(id)
      failed.delete(id)
    }
  } else {
    failed.add(state.current)
  }

  const isTested = (id: string) => mastered.has(id) || failed.has(id) || asked.has(id)
  const prerequisitesReady = (id: string) =>
    (getSkill(id)?.prerequisites ?? []).every((p) => mastered.has(p))

  let next: string | null = null

  if (isCorrect) {
    // On monte : la competence debloquee la plus proche, non encore evaluee.
    next = nearestTestable(state.current, 'up', isTested)[0]?.id ?? null
  } else {
    // On descend : un prerequis non encore evalue, le plus avance d'abord.
    const below = nearestTestable(state.current, 'down', isTested)
    next = below[below.length - 1]?.id ?? null
  }

  // Branche close : on repart sur la frontiere, c'est-a-dire une competence
  // encore inconnue dont tous les prerequis sont deja acquis.
  if (!next) {
    const frontier = skills
      .filter((s) => !isTested(s.id) && isTestable(s.id) && prerequisitesReady(s.id))
      .sort(byCursusAsc)
    next = frontier[0]?.id ?? null
  }

  const questionIndex = next ? state.questionIndex + 1 : state.questionIndex
  const done = !next || questionIndex > state.maxQuestions

  if (next) asked.add(next)

  return {
    current: done ? null : next,
    mastered: [...mastered],
    failed: [...failed],
    asked: [...asked],
    questionIndex: done ? state.questionIndex : questionIndex,
    maxQuestions: state.maxQuestions,
    done,
  }
}

/** Exercice servant de question : niveau entrainement de preference. */
export function placementExercise(skillId: string): Exercise | null {
  const list = getExercisesForSkill(skillId)
  return list.find((e) => e.level === 'entrainement') ?? list[0] ?? null
}

/**
 * Competence visee a l'issue du test : la plus exigeante du niveau de l'eleve
 * qui ne soit pas acquise. C'est ce sur quoi il est evalue en classe.
 */
export function pickObjectif(mastered: string[], level: SchoolLevel | null): string | null {
  const masteredSet = new Set(mastered)
  const remaining = skills.filter((s) => !masteredSet.has(s.id))
  // On vise en priorite une competence exercable : c'est sur l'objectif que
  // l'eleve va reellement travailler. On ne retombe sur les autres que si le
  // contenu ne couvre encore rien a son niveau.
  const exercisable = remaining.filter((s) => isTestable(s.id))
  const candidates = (exercisable.length > 0 ? exercisable : remaining).sort(byCursusAsc)
  if (candidates.length === 0) return null

  if (level) {
    const rank = levelRank(level)
    const atLevel = candidates.filter((s) => levelRank(s.school_level) <= rank)
    if (atLevel.length > 0) return atLevel[atLevel.length - 1].id
  }

  return candidates[candidates.length - 1].id
}

/** Estimation de duree, a raison d'un quart d'heure par jour. */
export function estimateWeeks(remainingSkills: number): number {
  // Une competence demande en moyenne deux seances de 15 minutes.
  const sessions = remainingSkills * 2
  return Math.max(1, Math.round(sessions / 7))
}
