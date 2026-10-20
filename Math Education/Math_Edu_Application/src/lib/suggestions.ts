// Suggestions pour un groupe (sprint 3, point 4) : ce que les eleves d'une
// meme seance ont a travailler en commun.
//
// Pour chaque eleve qui partage sa progression, on cherche ses lacunes racines
// vers les competences de la seance (celles de l'offre, ou la competence
// choisie a la reservation) : ce sont les seules qu'il peut travailler
// utilement maintenant (lib/dag.ts). Une lacune partagee par plusieurs eleves
// est la meilleure candidate pour un moment collectif. Module pur.

import { byCursus, findRootGaps, isExercisable, type ProgressMap } from './dag'

export interface Suggestion {
  skillId: string
  /** Eleves du groupe pour qui c'est une lacune racine. */
  eleves: number
}

/**
 * Lacunes racines communes, de la plus partagee a la moins partagee, puis dans
 * l'ordre du cursus. `progressions` : une par eleve qui partage sa progression.
 */
export function lacunesCommunes(progressions: ProgressMap[], cibles: string[], max = 5): Suggestion[] {
  const compte = new Map<string, number>()
  for (const progress of progressions) {
    const siennes = new Set<string>()
    for (const cible of cibles) {
      for (const id of findRootGaps(progress, cible)) if (isExercisable(id)) siennes.add(id)
    }
    for (const id of siennes) compte.set(id, (compte.get(id) ?? 0) + 1)
  }
  return [...compte.entries()]
    .sort(([a, na], [b, nb]) => nb - na || byCursus(a, b))
    .slice(0, max)
    .map(([skillId, eleves]) => ({ skillId, eleves }))
}
