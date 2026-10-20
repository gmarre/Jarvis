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
import { prioriteDesChemins, proposerChemins, type Chemin } from '@/lib/chemins'
import { useSession } from './session'
import type { Mindmap, Skill } from '@/types/content'
import type { SkillProgress } from '@/types/domain'

export interface ReviewItem {
  /**
   * « controle » : un exercice de la competence acquise est du (niveau sur 5,
   * lib/maitrise.ts) ; « carte » : la carte mentale est a relire (Leitner).
   */
  kind: 'controle' | 'carte'
  skill: Skill
  mindmap: Mindmap | undefined
  progress: SkillProgress
  /** "J+3" pour une carte, "Contrôle" pour un exercice. */
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
  /**
   * Vrai quand l'eleve a bien des lacunes a reparer, mais qu'aucune n'a encore
   * d'exercice dans le contenu. On ne lui dit alors pas que tout est a jour :
   * c'est le contenu qui manque, pas son travail.
   */
  blockedOnMissingContent: boolean
  /** Vrai tant que le test de positionnement n'a pas ete passe. */
  needsPlacement: boolean
  totalMinutes: number
  /** Chemins proposes pour la classe de l'eleve (lib/chemins.ts). */
  chemins: Chemin[]
  /**
   * Chemin choisi qui porte la priorite du jour, ou null : sans choix, la
   * priorite vient de l'objectif du test de positionnement.
   */
  cheminActif: Chemin | null
}

function collectReviews(progress: ProgressMap, now: Date): ReviewItem[] {
  const today = startOfDay(now).getTime()
  const du = (iso: string | null) => iso !== null && startOfDay(new Date(iso)).getTime() <= today
  const enRetard = (iso: string) => startOfDay(new Date(iso)).getTime() < today
  const items: ReviewItem[] = []

  for (const entry of Object.values(progress)) {
    const skill = getSkill(entry.skill_id)
    if (!skill) continue
    const mindmap = getMindmap(skill.mindmap_id)
    // Controle d'une competence acquise : un exercice, jamais une simple lecture.
    if (entry.niveau === 4 && du(entry.prochain_controle)) {
      items.push({
        kind: 'controle',
        skill,
        mindmap,
        progress: entry,
        label: 'Contrôle',
        overdue: enRetard(entry.prochain_controle as string),
      })
    }
    if (entry.status === 'mastered' && du(entry.next_review_at)) {
      items.push({
        kind: 'carte',
        skill,
        mindmap,
        progress: entry,
        label: reviewLabel(entry.review_box),
        overdue: enRetard(entry.next_review_at as string),
      })
    }
  }

  // Les controles d'abord (ils peuvent rouvrir une competence), puis les
  // retards, puis les cartes les moins avancees.
  return items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'controle' ? -1 : 1
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
      blockedOnMissingContent: false,
      needsPlacement: true,
      totalMinutes: 0,
      chemins: [],
      cheminActif: null,
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

    // Chemins proposes pour la classe declaree ; a defaut, celle de l'objectif.
    const classe = session.profile.niveau_scolaire ?? getSkill(objectifSkillId as string)?.school_level
    const chemins = classe ? proposerChemins(progress, classe) : []
    const choisis = session.profile.chemins_choisis ?? []
    const prioriteChemin = prioriteDesChemins(chemins, choisis)
    const cheminActif = prioriteChemin
      ? chemins.find((c) => choisis.includes(c.id) && c.priorite === prioriteChemin) ?? null
      : null

    // L'objectif devient le bout du chemin actif, s'il y en a un.
    const objectifId = cheminActif
      ? cheminActif.etapes[cheminActif.etapes.length - 1].skill.id
      : (objectifSkillId as string)
    const priorityId = prioriteChemin ?? findPrimaryRootGap(progress, objectifId)
    const priority = priorityId ? requireSkill(priorityId) : null
    const allRootGaps = findRootGaps(progress, objectifId)
    const priorityExercises = priorityId ? getExercisesForSkill(priorityId) : []
    const priorityDurationS = priorityExercises.reduce(
      (sum, exercise) => sum + exercise.estimated_duration_s,
      0,
    )

    // Une carte mentale se relit en 2 minutes environ, un controle se fait en 2
    // a 3 minutes : de quoi annoncer une duree honnete sans sur-promettre.
    const reviewSeconds = reviews.reduce((t, r) => t + (r.kind === 'controle' ? 150 : 120), 0)

    return {
      priority,
      priorityExerciseCount: priorityExercises.length,
      priorityDurationS,
      priorityUnlocks: priorityId ? unlockCount(priorityId) : 0,
      reviews,
      objectif: getSkill(objectifId) ?? null,
      path: cheminActif ? cheminActif.etapes : buildPathToTarget(progress, objectifId),
      rootGaps: allRootGaps.map((id) => getSkill(id)).filter((s): s is Skill => Boolean(s)),
      overall,
      perDomain,
      isDayDone: reviews.length === 0 && priority === null,
      blockedOnMissingContent: priority === null && allRootGaps.length > 0,
      needsPlacement: false,
      totalMinutes: Math.max(1, Math.round((priorityDurationS + reviewSeconds) / 60)),
      chemins,
      cheminActif,
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
