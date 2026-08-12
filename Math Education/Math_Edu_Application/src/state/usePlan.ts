import { useMemo } from 'react'

import { domains, getExercisesForSkill, getMindmap, getSkill, requireSkill } from '@/content'
import {
  buildPathToTarget,
  domainProgress,
  findPrimaryRootGap,
  findRootGaps,
  overallProgress,
  reviewLabel,
  statusOf,
  unlockCount,
  type PathStep,
  type ProgressMap,
} from '@/lib/dag'
import { startOfDay } from '@/lib/format'
import { useSession } from './session'
import type { Mindmap, Skill } from '@/types/content'
import type { SkillProgress } from '@/types/domain'

export interface ReviewItem {
  skill: Skill
  mindmap: Mindmap | undefined
  progress: SkillProgress
  /** "J+3" : ou en est la carte dans le rythme de revision espacee. */
  label: string
  /** En retard sur son echeance : a traiter en premier. */
  overdue: boolean
}

export interface DailyPlan {
  /** Competence a travailler aujourd'hui : la lacune racine la plus ancienne. */
  priority: Skill | null
  priorityExerciseCount: number
  priorityDurationS: number
  /** Nombre de competences que la priorite debloque en cascade. */
  priorityUnlocks: number
  reviews: ReviewItem[]
  objectif: Skill | null
  path: PathStep[]
  rootGaps: Skill[]
  overall: ReturnType<typeof overallProgress>
  perDomain: ReturnType<typeof domainProgress>[]
  /** Vrai quand il n'y a ni exercice ni carte a faire aujourd'hui. */
  isDayDone: boolean
  /** Vrai tant que le test de positionnement n'a pas ete passe. */
  needsPlacement: boolean
  totalMinutes: number
}

function collectReviews(progress: ProgressMap, now: Date): ReviewItem[] {
  const today = startOfDay(now).getTime()

  return Object.values(progress)
    .filter((entry) => entry.status === 'mastered' && entry.next_review_at)
    .filter((entry) => startOfDay(new Date(entry.next_review_at as string)).getTime() <= today)
    .map((entry) => {
      const skill = getSkill(entry.skill_id)
      if (!skill) return null
      return {
        skill,
        mindmap: getMindmap(skill.mindmap_id),
        progress: entry,
        label: reviewLabel(entry.review_box),
        overdue:
          startOfDay(new Date(entry.next_review_at as string)).getTime() < today,
      }
    })
    .filter((item): item is ReviewItem => item !== null)
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      return a.progress.review_box - b.progress.review_box
    })
}

/**
 * Le plan du jour : ce que l'application decide de faire travailler a l'eleve.
 * Tout part du DAG et des echeances de revision, jamais d'une liste figee.
 */
export function useDailyPlan(): DailyPlan {
  const { session } = useSession()

  return useMemo<DailyPlan>(() => {
    const empty: DailyPlan = {
      priority: null,
      priorityExerciseCount: 0,
      priorityDurationS: 0,
      priorityUnlocks: 0,
      reviews: [],
      objectif: null,
      path: [],
      rootGaps: [],
      overall: overallProgress({}, []),
      perDomain: [],
      isDayDone: false,
      needsPlacement: true,
      totalMinutes: 0,
    }

    if (!session) return empty

    const { progress, objectifSkillId } = session
    const now = new Date()
    const reviews = collectReviews(progress, now)
    const domainIds = domains.map((d) => d.id)
    const overall = overallProgress(progress, domainIds)
    const perDomain = domainIds
      .map((id) => domainProgress(progress, id))
      .sort((a, b) => a.ratio - b.ratio)

    const needsPlacement = !session.placement || !objectifSkillId

    if (needsPlacement) {
      return { ...empty, overall, perDomain, reviews, needsPlacement: true }
    }

    const objectifId = objectifSkillId as string
    const priorityId = findPrimaryRootGap(progress, objectifId)
    const priority = priorityId ? requireSkill(priorityId) : null
    const priorityExercises = priorityId ? getExercisesForSkill(priorityId) : []
    const priorityDurationS = priorityExercises.reduce(
      (sum, exercise) => sum + exercise.estimated_duration_s,
      0,
    )

    // Une carte mentale se relit en 2 minutes environ : suffisant pour annoncer
    // une duree honnete a l'eleve sans sur-promettre.
    const reviewSeconds = reviews.length * 120

    return {
      priority,
      priorityExerciseCount: priorityExercises.length,
      priorityDurationS,
      priorityUnlocks: priorityId ? unlockCount(priorityId) : 0,
      reviews,
      objectif: getSkill(objectifId) ?? null,
      path: buildPathToTarget(progress, objectifId),
      rootGaps: findRootGaps(progress, objectifId)
        .map((id) => getSkill(id))
        .filter((s): s is Skill => Boolean(s)),
      overall,
      perDomain,
      isDayDone: reviews.length === 0 && priority === null,
      needsPlacement: false,
      totalMinutes: Math.max(1, Math.round((priorityDurationS + reviewSeconds) / 60)),
    }
  }, [session])
}

/** Statut effectif d'une competence pour l'eleve connecte. */
export function useSkillStatus(skillId: string) {
  const { session } = useSession()
  return useMemo(
    () => (session ? statusOf(session.progress, skillId) : 'locked'),
    [session, skillId],
  )
}
