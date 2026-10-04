// Point d'entree unique du contenu pedagogique.
//
// Depuis la phase 2 de la migration (octobre 2026), le contenu n'est plus
// importe dans le bundle : il est charge une fois, avant la premiere session,
// depuis la base Supabase (ou depuis les JSON locaux en mode demonstration),
// puis installe ici par `installerContenu`. Voir `chargement.ts`.
//
// L'interface exposee n'a pas change : le moteur, le positionnement et les
// ecrans lisent toujours `skills`, `getSkill`, `getExercisesForSkill`... Les
// tableaux exportes sont des conteneurs remplis sur place, pour que les
// modules qui les ont importes voient le contenu une fois installe.
//
// Regle qui en decoule : aucun module ne doit lire le contenu au chargement
// (au niveau du fichier). Seulement dans une fonction, appelee une fois la
// session ouverte. Le repository garantit que le contenu est installe avant de
// rendre une session.

import type { Exercise, Mindmap, SchoolLevel, Skill } from '@/types/content'
import { SCHOOL_LEVELS } from '@/types/content'

export interface ContenuPedagogique {
  skills: Skill[]
  exercises: Exercise[]
  mindmaps: Mindmap[]
}

export interface Domain {
  id: string
  name: string
  skills: Skill[]
}

export const skills: Skill[] = []
export const exercises: Exercise[] = []
export const mindmaps: Mindmap[] = []
/** Domaines reellement presents dans le contenu, dans l'ordre alphabetique. */
export const domains: Domain[] = []

const skillById = new Map<string, Skill>()
const exerciseById = new Map<string, Exercise>()
const mindmapById = new Map<string, Mindmap>()
/** Competences qui dependent d'une competence donnee (arcs sortants du DAG). */
const dependentsBySkill = new Map<string, string[]>()

let installe = false

// Une boucle plutot que splice(0, n, ...source) : l'etalement d'un tableau de
// plusieurs dizaines de milliers d'elements depasse la pile d'appels.
function remplacer<T>(cible: T[], source: T[]) {
  const copie = source.slice()
  cible.length = 0
  for (const element of copie) cible.push(element)
}

/**
 * Installe le contenu et recalcule les index. Rejouable : une nouvelle
 * publication remplace entierement la precedente.
 */
export function installerContenu(contenu: ContenuPedagogique) {
  // Copie avant tri : l'appelant peut passer les tableaux d'un JSON importe.
  remplacer(skills, [...contenu.skills].sort((a, b) => a.id.localeCompare(b.id)))
  remplacer(exercises, contenu.exercises)
  remplacer(mindmaps, contenu.mindmaps)

  skillById.clear()
  for (const skill of skills) skillById.set(skill.id, skill)
  exerciseById.clear()
  for (const exercise of exercises) exerciseById.set(exercise.id, exercise)
  mindmapById.clear()
  for (const mindmap of mindmaps) mindmapById.set(mindmap.id, mindmap)

  dependentsBySkill.clear()
  for (const skill of skills) {
    for (const prereq of skill.prerequisites) {
      const list = dependentsBySkill.get(prereq)
      if (list) list.push(skill.id)
      else dependentsBySkill.set(prereq, [skill.id])
    }
  }

  const parDomaine = new Map<string, Domain>()
  for (const skill of skills) {
    const domaine = parDomaine.get(skill.domain)
    if (domaine) domaine.skills.push(skill)
    else parDomaine.set(skill.domain, { id: skill.domain, name: skill.domain_name, skills: [skill] })
  }
  remplacer(
    domains,
    [...parDomaine.values()].sort((a, b) => a.id.localeCompare(b.id)),
  )

  installe = true
}

/** Vrai une fois le contenu installe. */
export function contenuInstalle(): boolean {
  return installe
}

export function getSkill(id: string): Skill | undefined {
  return skillById.get(id)
}

/** Leve si la competence est absente : utile pour les ecrans qui en dependent. */
export function requireSkill(id: string): Skill {
  const skill = skillById.get(id)
  if (!skill) throw new Error(`Competence inconnue dans le DAG : ${id}`)
  return skill
}

export function getExercise(id: string): Exercise | undefined {
  return exerciseById.get(id)
}

export function getMindmap(id: string | null | undefined): Mindmap | undefined {
  return id ? mindmapById.get(id) : undefined
}

/** Exercices d'une competence, du plus simple au plus exigeant. */
export function getExercisesForSkill(skillId: string): Exercise[] {
  const order = { decouverte: 0, entrainement: 1, maitrise: 2 }
  const skill = skillById.get(skillId)
  const ids = skill?.exercise_ids ?? []
  const fromDag = ids.map((id) => exerciseById.get(id)).filter((e): e is Exercise => Boolean(e))
  // Filet de securite : si le DAG ne reference pas encore ses exercices, on
  // retombe sur le lien inverse porte par l'exercice lui-meme.
  const list = fromDag.length > 0 ? fromDag : exercises.filter((e) => e.skill_id === skillId)
  return [...list].sort((a, b) => order[a.level] - order[b.level])
}

/** Competences directement debloquees par celle-ci. */
export function getDependents(skillId: string): string[] {
  return dependentsBySkill.get(skillId) ?? []
}

/**
 * Nombre total de competences debloquees, en cascade, si celle-ci etait
 * maitrisee. C'est le chiffre affiche par "Debloque 7 competences".
 */
export function countUnlockedBy(skillId: string): number {
  const seen = new Set<string>()
  const queue = [...getDependents(skillId)]
  while (queue.length > 0) {
    const current = queue.shift() as string
    if (seen.has(current)) continue
    seen.add(current)
    queue.push(...getDependents(current))
  }
  return seen.size
}

export function getDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id)
}

/** Position d'un niveau scolaire dans le cursus, pour trier et comparer. */
export function levelRank(level: SchoolLevel): number {
  const index = SCHOOL_LEVELS.indexOf(level)
  return index === -1 ? SCHOOL_LEVELS.length : index
}
