// Super exercices (sprint 2, point 7) : bareme et verdict d'un passage.
//
// Chaque question a ses points (1 a 4). L'epreuve est reussie a partir de
// 70 % des points, arrondi a l'entier superieur : 7 sur 10, 9 sur 12. Le
// seuil est le meme pour toutes les classes, pour que l'eleve sache d'avance
// ce qu'on attend de lui. Module pur.

import type { Correction } from '@/lib/exercise'
import type { SuperExercise } from '@/types/content'
import type { SuperAttempt } from '@/types/domain'

export const SEUIL_REUSSITE = 0.7

export interface ResultatQuestion {
  key: string
  /** Reponse brute de l'eleve (cle de proposition pour un QCM). */
  reponse: string
  /** Reponse telle qu'affichee a l'eleve (texte de la proposition). */
  affichee: string
  correction: Correction
}

export interface BilanSuper {
  score: number
  total: number
  /** Points necessaires pour reussir. */
  seuil: number
  reussi: boolean
  /** Competences des questions ratees, sans doublon, dans l'ordre des questions. */
  aRetravailler: string[]
}

export function seuilDeReussite(total: number): number {
  return Math.ceil(SEUIL_REUSSITE * total - 1e-9)
}

export function resultatSuper(
  sx: Pick<SuperExercise, 'questions'>,
  resultats: Pick<ResultatQuestion, 'key' | 'correction'>[],
): BilanSuper {
  const parCle = new Map(resultats.map((r) => [r.key, r.correction.isCorrect]))
  let score = 0
  let total = 0
  const aRetravailler: string[] = []
  for (const q of sx.questions) {
    total += q.points
    if (parCle.get(q.key)) score += q.points
    else if (!aRetravailler.includes(q.skill_id)) aRetravailler.push(q.skill_id)
  }
  const seuil = seuilDeReussite(total)
  return { score, total, seuil, reussi: score >= seuil, aRetravailler }
}

/** Le super exercice a-t-il deja ete reussi par l'eleve ? */
export function superReussi(superId: string, passages: SuperAttempt[]): boolean {
  return passages.some((p) => p.super_id === superId && p.reussi)
}
