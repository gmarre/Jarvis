// Point d'entree unique du contenu pedagogique.
//
// Les 3 fichiers JSON sont la copie exacte de ceux produits par Marius dans
// `Specifications DAG, Exos, Mindcards/content/`. Ils sont importes ici une
// seule fois et indexes, pour que le reste de l'application n'ait jamais a
// parcourir les tableaux a la main.
//
// A terme ces memes JSON seront charges en base (tables `content_*`) par un
// script de seed. L'interface exposee ci-dessous ne changera pas : seul le
// contenu de ce fichier sera remplace par un appel Supabase.

import type {
  Exercise,
  ExercisesBank,
  Mindmap,
  MindmapsBank,
  SchoolLevel,
  Skill,
  SkillsDag,
} from '@/types/content'
import { SCHOOL_LEVELS } from '@/types/content'

import exercisesJson from './exercises.json'
import mindmapsJson from './mindmaps.json'
import skillsJson from './skills_dag.json'

const dag = skillsJson as unknown as SkillsDag
const bank = exercisesJson as unknown as ExercisesBank
const maps = mindmapsJson as unknown as MindmapsBank

export const dagMetadata = dag.metadata
export const skills: Skill[] = dag.skills
export const exercises: Exercise[] = bank.exercises
export const mindmaps: Mindmap[] = maps.mindmaps

const skillById = new Map(skills.map((s) => [s.id, s]))
const exerciseById = new Map(exercises.map((e) => [e.id, e]))
const mindmapById = new Map(mindmaps.map((m) => [m.id, m]))

/** Competences qui dependent d'une competence donnee (arcs sortants du DAG). */
const dependentsBySkill = new Map<string, string[]>()
for (const skill of skills) {
  for (const prereq of skill.prerequisites) {
    const list = dependentsBySkill.get(prereq)
    if (list) list.push(skill.id)
    else dependentsBySkill.set(prereq, [skill.id])
  }
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

export interface Domain {
  id: string
  name: string
  skills: Skill[]
}

/** Domaines reellement presents dans le contenu, dans l'ordre alphabetique. */
export const domains: Domain[] = dagMetadata.domains
  .map((d) => ({ id: d.id, name: d.name, skills: skills.filter((s) => s.domain === d.id) }))
  .filter((d) => d.skills.length > 0)

export function getDomain(id: string): Domain | undefined {
  return domains.find((d) => d.id === id)
}

/** Position d'un niveau scolaire dans le cursus, pour trier et comparer. */
export function levelRank(level: SchoolLevel): number {
  const index = SCHOOL_LEVELS.indexOf(level)
  return index === -1 ? SCHOOL_LEVELS.length : index
}
