// Chemins proposes selon la classe (sprint 2, point 6).
//
// Avant, /parcours montrait un seul chemin, vers l'objectif fixe par le test
// de positionnement, et cachait le reste derriere « Le graphe ». L'eleve n'avait
// aucun choix. Ici, le DAG propose un chemin par domaine : tout ce qui reste a
// acquerir dans ce domaine jusqu'a sa classe, avec les prerequis manquants des
// autres domaines (un chemin traverse les domaines). Rien n'est ecrit a la
// main : les chemins sont recalcules depuis la progression a chaque affichage.

import { domains, getSkill, levelRank, requireSkill } from '@/content'
import {
  ancestorsOf,
  byCursus,
  findPrimaryRootGap,
  findRootGaps,
  isCleared,
  isExercisable,
  statusOf,
  topologicalOrder,
  type PathStep,
  type ProgressMap,
} from './dag'
import type { SchoolLevel } from '@/types/content'

export interface Chemin {
  /** Identifiant stable : la lettre du domaine. */
  id: string
  titre: string
  description: string
  /** Competences du domaine visees en bout de chemin (les plus avancees). */
  objectifs: string[]
  /** Ce qui reste a faire, dans l'ordre du graphe. */
  etapes: PathStep[]
  /** Competences des classes precedentes a reparer d'abord. */
  lacunesAnterieures: number
  /** Competence a travailler maintenant sur ce chemin, ou null si aucune n'a d'exercice. */
  priorite: string | null
}

/**
 * Les chemins proposes a un eleve de cette classe, les plus urgents d'abord :
 * ceux qui reparent le plus de lacunes des classes precedentes, puis les plus
 * courts. Un domaine deja acquis jusqu'a la classe ne propose rien.
 */
export function proposerChemins(progress: ProgressMap, classe: SchoolLevel): Chemin[] {
  const rang = levelRank(classe)
  const chemins: Chemin[] = []

  for (const domaine of domains) {
    const visees = domaine.skills
      .filter((s) => levelRank(s.school_level) <= rang)
      .map((s) => s.id)
      .filter((id) => isExercisable(id) && !isCleared(progress, id))
    if (visees.length === 0) continue

    // Objectifs : les visees qui ne sont prerequis d'aucune autre visee.
    const ancetres = new Set(visees.flatMap((id) => ancestorsOf(id)))
    const objectifs = visees.filter((id) => !ancetres.has(id))

    const manquantes = new Set<string>()
    const racines = new Set<string>()
    for (const objectif of objectifs) {
      for (const id of [objectif, ...ancestorsOf(objectif)]) {
        if (!isCleared(progress, id) && isExercisable(id)) manquantes.add(id)
      }
      for (const id of findRootGaps(progress, objectif)) racines.add(id)
    }

    const ordre = topologicalOrder([...manquantes])
    const objectifsSet = new Set(objectifs)
    const etapes: PathStep[] = ordre.map((id) => ({
      skill: requireSkill(id),
      status: statusOf(progress, id),
      isRootGap: racines.has(id),
      isTarget: objectifsSet.has(id),
    }))

    const lacunesAnterieures = ordre.filter(
      (id) => levelRank(requireSkill(id).school_level) < rang,
    ).length
    const priorites = objectifs
      .map((id) => findPrimaryRootGap(progress, id))
      .filter((id): id is string => id !== null)
      .sort(byCursus)

    chemins.push({
      id: domaine.id,
      titre: lacunesAnterieures > 0 ? `Consolider : ${domaine.name}` : `${domaine.name} de ${classe}`,
      description:
        lacunesAnterieures > 0
          ? `${ordre.length} compétence${ordre.length > 1 ? 's' : ''} à travailler, dont ${lacunesAnterieures} des classes précédentes`
          : `${ordre.length} compétence${ordre.length > 1 ? 's' : ''} de ta classe à travailler`,
      objectifs,
      etapes,
      lacunesAnterieures,
      priorite: priorites[0] ?? null,
    })
  }

  return chemins.sort(
    (a, b) => b.lacunesAnterieures - a.lacunesAnterieures || a.etapes.length - b.etapes.length,
  )
}

/**
 * Priorite du jour parmi les chemins choisis par l'eleve : la lacune la plus
 * ancienne dans le cursus. Null si aucun chemin choisi n'a de priorite.
 */
export function prioriteDesChemins(chemins: Chemin[], choisis: string[]): string | null {
  const candidates = chemins
    .filter((c) => choisis.includes(c.id))
    .map((c) => c.priorite)
    .filter((id): id is string => id !== null && Boolean(getSkill(id)))
  return candidates.sort(byCursus)[0] ?? null
}
