// Super exercices (sprint 2, point 7) : bareme et verdict d'un passage.
//
// Le bareme vit dans supabase/functions/_shared/maitrise.ts : la fonction
// serveur `rendre-super` compte les points (sprint 6), l'application reprend
// le meme calcul en demonstration et pour l'affichage. Module pur.

import type { Correction } from '@/lib/exercise'
import type { SuperExercise } from '@/types/content'
import type { SuperAttempt } from '@/types/domain'
import { bilanSuper, type BilanSuper } from './maitrise'

export { SEUIL_REUSSITE, seuilDeReussite, epreuveDe, type BilanSuper } from './maitrise'

export interface ResultatQuestion {
  key: string
  /** Reponse brute de l'eleve (cle de proposition pour un QCM). */
  reponse: string
  /** Reponse telle qu'affichee a l'eleve (texte de la proposition). */
  affichee: string
  correction: Correction
}

export function resultatSuper(
  sx: Pick<SuperExercise, 'questions'>,
  resultats: Pick<ResultatQuestion, 'key' | 'correction'>[],
): BilanSuper {
  const parCle = new Map(resultats.map((r) => [r.key, r.correction.isCorrect]))
  return bilanSuper(sx.questions, (key) => parCle.get(key) === true)
}

/** Le super exercice a-t-il deja ete reussi par l'eleve ? */
export function superReussi(superId: string, passages: SuperAttempt[]): boolean {
  return passages.some((p) => p.super_id === superId && p.reussi)
}
