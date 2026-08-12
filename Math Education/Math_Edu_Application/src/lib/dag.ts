// Moteur de progression sur le DAG.
//
// C'est la brique differenciante du produit (CLAUDE.md, Jalon 4) : on ne se
// contente pas de dire "c'est faux", on remonte au prerequis fautif.
//
// Trois regles, et rien d'autre :
//  1. une competence est proposable si tous ses prerequis sont maitrises ;
//  2. elle est maitrisee quand son `mastery_threshold` est atteint ;
//  3. en cas d'echec repete, on redescend sur ses prerequis.

import {
  countUnlockedBy,
  getSkill,
  levelRank,
  requireSkill,
  skills,
} from '@/content'
import type { Skill } from '@/types/content'
import type { SkillProgress, SkillStatus } from '@/types/domain'

/** Etat de progression de l'eleve, indexe par competence. */
export type ProgressMap = Record<string, SkillProgress>

export function isMastered(progress: ProgressMap, skillId: string): boolean {
  return progress[skillId]?.status === 'mastered'
}

/**
 * Statut effectif d'une competence. Le verrouillage n'est jamais stocke : il se
 * deduit des prerequis, sinon la moindre correction du DAG laisserait des
 * statuts perimes en base.
 */
export function statusOf(progress: ProgressMap, skillId: string): SkillStatus {
  const stored = progress[skillId]
  if (stored?.status === 'mastered') return 'mastered'

  const skill = getSkill(skillId)
  if (!skill) return 'locked'

  const prerequisitesReady = skill.prerequisites.every((id) => isMastered(progress, id))
  if (!prerequisitesReady) return 'locked'
  if (stored && stored.attempts > 0) return 'in_progress'
  return 'available'
}

/** Ligne de progression par defaut d'une competence jamais travaillee. */
export function emptyProgress(skillId: string): SkillProgress {
  return {
    skill_id: skillId,
    status: 'locked',
    recent: [],
    score: 0,
    attempts: 0,
    next_review_at: null,
    review_box: 0,
    updated_at: null,
  }
}

/** Tous les prerequis, directs et indirects, d'une competence. */
export function ancestorsOf(skillId: string): string[] {
  const seen = new Set<string>()
  const queue = [...(getSkill(skillId)?.prerequisites ?? [])]
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (seen.has(current)) continue
    seen.add(current)
    queue.push(...(getSkill(current)?.prerequisites ?? []))
  }
  return [...seen]
}

/**
 * Tri topologique d'un ensemble de competences : un prerequis apparait toujours
 * avant ce qu'il debloque. A egalite, on suit l'ordre du cursus scolaire.
 */
function topologicalOrder(ids: string[]): string[] {
  const inSet = new Set(ids)
  const visited = new Set<string>()
  const ordered: string[] = []

  const visit = (id: string) => {
    if (visited.has(id) || !inSet.has(id)) return
    visited.add(id)
    const prerequisites = (getSkill(id)?.prerequisites ?? [])
      .filter((p) => inSet.has(p))
      .sort(byCursus)
    for (const prereq of prerequisites) visit(prereq)
    ordered.push(id)
  }

  for (const id of [...ids].sort(byCursus)) visit(id)
  return ordered
}

function byCursus(a: string, b: string): number {
  const skillA = getSkill(a)
  const skillB = getSkill(b)
  if (!skillA || !skillB) return 0
  const rank = levelRank(skillA.school_level) - levelRank(skillB.school_level)
  if (rank !== 0) return rank
  const difficulty = skillA.difficulty - skillB.difficulty
  if (difficulty !== 0) return difficulty
  return skillA.id.localeCompare(skillB.id)
}

/**
 * Les lacunes racines qui bloquent un objectif : les competences non maitrisees
 * dont, elles, tous les prerequis sont acquis. Ce sont les seules sur
 * lesquelles l'eleve peut travailler utilement maintenant.
 *
 * Rendues de la plus ancienne a la plus recente : c'est l'ordre de reparation.
 */
export function findRootGaps(progress: ProgressMap, targetSkillId: string): string[] {
  const missing = [targetSkillId, ...ancestorsOf(targetSkillId)].filter(
    (id) => !isMastered(progress, id),
  )
  return missing
    .filter((id) => (getSkill(id)?.prerequisites ?? []).every((p) => isMastered(progress, p)))
    .sort(byCursus)
}

/**
 * Lacune racine unique servant de "priorite du jour". On prend la plus
 * ancienne dans le cursus : c'est elle qui bloque tout le reste.
 */
export function findPrimaryRootGap(
  progress: ProgressMap,
  targetSkillId: string,
): string | null {
  return findRootGaps(progress, targetSkillId)[0] ?? null
}

export interface PathStep {
  skill: Skill
  status: SkillStatus
  /** Vrai pour la competence sur laquelle l'eleve doit travailler maintenant. */
  isRootGap: boolean
  /** Vrai pour la competence visee en bout de chaine. */
  isTarget: boolean
}

/**
 * Le chemin "ce qui manque, dans l'ordre" jusqu'a un objectif : c'est la
 * lecture lineaire du DAG (variante B des maquettes).
 *
 * On y ajoute en tete le dernier prerequis deja acquis, pour que l'eleve voie
 * d'ou il part et pas seulement ce qui lui reste.
 */
export function buildPathToTarget(
  progress: ProgressMap,
  targetSkillId: string,
  options: { includeAcquiredAnchor?: boolean } = {},
): PathStep[] {
  const { includeAcquiredAnchor = true } = options
  const target = getSkill(targetSkillId)
  if (!target) return []

  const missing = topologicalOrder(
    ancestorsOf(targetSkillId).filter((id) => !isMastered(progress, id)),
  )
  const rootGaps = new Set(findRootGaps(progress, targetSkillId))

  const chain: string[] = []
  if (includeAcquiredAnchor) {
    const anchor = pickAcquiredAnchor(progress, missing[0] ?? targetSkillId)
    if (anchor) chain.push(anchor)
  }
  chain.push(...missing, targetSkillId)

  return chain.map((id) => ({
    skill: requireSkill(id),
    status: statusOf(progress, id),
    isRootGap: rootGaps.has(id),
    isTarget: id === targetSkillId,
  }))
}

/** Le prerequis acquis le plus avance en amont d'une competence. */
function pickAcquiredAnchor(progress: ProgressMap, skillId: string): string | null {
  const acquired = (getSkill(skillId)?.prerequisites ?? []).filter((id) =>
    isMastered(progress, id),
  )
  if (acquired.length === 0) return null
  return [...acquired].sort(byCursus).reverse()[0]
}

export interface AttemptOutcome {
  progress: SkillProgress
  /** La competence vient d'etre maitrisee par cette tentative. */
  justMastered: boolean
  /**
   * L'eleve echoue de facon repetee : l'application doit lui reproposer les
   * prerequis plutot que s'acharner. C'est la regle 3 du moteur.
   */
  shouldDescend: boolean
  /** Prerequis a retravailler quand `shouldDescend` est vrai. */
  descendTo: string[]
}

/**
 * Applique une tentative d'exercice a la progression d'une competence.
 *
 * Modele de maitrise : une fenetre reellement glissante sur les `out_of`
 * dernieres tentatives. Des que `required` reussites y figurent, la competence
 * est maitrisee.
 *
 * Le glissement compte : avec une fenetre fixe remise a zero, un eleve qui
 * repond juste, faux, juste sur un seuil de 2 sur 3 ne validerait pas, alors
 * qu'il a bien 2 reussites sur ses 3 derniers essais. C'est incomprehensible
 * pour lui comme pour le professeur.
 */
export function applyAttempt(
  progress: ProgressMap,
  skillId: string,
  isCorrect: boolean,
  now: Date = new Date(),
): AttemptOutcome {
  const skill = requireSkill(skillId)
  const { required, out_of: outOf } = skill.mastery_threshold
  const base = progress[skillId] ?? emptyProgress(skillId)

  if (base.status === 'mastered') {
    // Une competence deja maitrisee ne se "demaitrise" pas sur un exercice de
    // revision : on garde l'etat, la revision espacee s'en charge.
    return { progress: base, justMastered: false, shouldDescend: false, descendTo: [] }
  }

  const recent = [...base.recent, isCorrect].slice(-outOf)
  const score = recent.filter(Boolean).length
  const attempts = recent.length
  const updated_at = now.toISOString()

  if (score >= required) {
    return {
      progress: {
        ...base,
        status: 'mastered',
        recent,
        score,
        attempts,
        review_box: 1,
        next_review_at: nextReviewDate(1, now).toISOString(),
        updated_at,
      },
      justMastered: true,
      shouldDescend: false,
      descendTo: [],
    }
  }

  // Fenetre pleine sans la moindre reussite : s'acharner n'apporte rien, le
  // blocage est en amont.
  const noSuccessAtAll = attempts >= outOf && score === 0
  const unmasteredPrerequisites = skill.prerequisites.filter((id) => !isMastered(progress, id))

  // On ne propose de redescendre que s'il existe reellement un prerequis a
  // retravailler. Quand tous sont acquis, il n'y a nulle part ou aller : la
  // competence est simplement difficile, on la repropose telle quelle.
  const canDescend = noSuccessAtAll && unmasteredPrerequisites.length > 0

  return {
    progress: {
      ...base,
      status: 'in_progress',
      recent,
      score,
      attempts,
      updated_at,
    },
    justMastered: false,
    shouldDescend: canDescend,
    descendTo: canDescend ? unmasteredPrerequisites : [],
  }
}

/** Echeances de revision espacee, methode de Leitner : J+1, J+3, J+7, J+21. */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21] as const

export function nextReviewDate(box: number, from: Date = new Date()): Date {
  const index = Math.min(Math.max(box, 1), REVIEW_INTERVALS_DAYS.length) - 1
  const date = new Date(from)
  date.setDate(date.getDate() + REVIEW_INTERVALS_DAYS[index])
  date.setHours(6, 0, 0, 0)
  return date
}

/** Libelle d'une echeance : "J+3". */
export function reviewLabel(box: number): string {
  const index = Math.min(Math.max(box, 1), REVIEW_INTERVALS_DAYS.length) - 1
  return `J+${REVIEW_INTERVALS_DAYS[index]}`
}

export interface DomainProgress {
  id: string
  name: string
  total: number
  mastered: number
  inProgress: number
  locked: number
  ratio: number
}

export function domainProgress(progress: ProgressMap, domainId: string): DomainProgress {
  const list = skills.filter((s) => s.domain === domainId)
  let mastered = 0
  let inProgress = 0
  for (const skill of list) {
    const status = statusOf(progress, skill.id)
    if (status === 'mastered') mastered += 1
    else if (status === 'in_progress') inProgress += 1
  }
  return {
    id: domainId,
    name: list[0]?.domain_name ?? domainId,
    total: list.length,
    mastered,
    inProgress,
    locked: list.length - mastered - inProgress,
    ratio: list.length === 0 ? 0 : mastered / list.length,
  }
}

export interface OverallProgress {
  total: number
  mastered: number
  inProgress: number
  upcoming: number
  ratio: number
  /** Domaine ou l'eleve a le plus de retard, hors domaines vierges. */
  weakestDomain: DomainProgress | null
}

export function overallProgress(progress: ProgressMap, domainIds: string[]): OverallProgress {
  const perDomain = domainIds.map((id) => domainProgress(progress, id))
  const total = perDomain.reduce((sum, d) => sum + d.total, 0)
  const mastered = perDomain.reduce((sum, d) => sum + d.mastered, 0)
  const inProgress = perDomain.reduce((sum, d) => sum + d.inProgress, 0)
  const started = perDomain.filter((d) => d.mastered + d.inProgress > 0)
  const weakestDomain =
    started.length > 0
      ? started.reduce((worst, d) => (d.ratio < worst.ratio ? d : worst))
      : null

  return {
    total,
    mastered,
    inProgress,
    upcoming: total - mastered - inProgress,
    ratio: total === 0 ? 0 : mastered / total,
    weakestDomain,
  }
}

/** Combien de competences se debloquent si celle-ci est reparee. */
export function unlockCount(skillId: string): number {
  return countUnlockedBy(skillId)
}
