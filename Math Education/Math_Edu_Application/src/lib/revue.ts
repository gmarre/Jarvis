import type { Correction } from '@/lib/exercise'
import type { PublicExercise } from '@/types/content'

// Donnees de la revue de fin de test (components/exercise/RevueTest.tsx).
// Separe du composant pour que le rechargement a chaud de Vite fonctionne.

export interface QuestionRevue {
  exercise: PublicExercise
  /** Reponse donnee, ou null si l'eleve a passe la question. */
  reponse: string | null
  /** Correction rendue par le serveur ; null tant qu'elle n'est pas arrivee. */
  correction: Correction | null
}

/** Ecriture lisible d'une reponse : le texte d'une proposition plutot que sa lettre. */
export function reponseLisible(exercise: PublicExercise, reponse: string): string {
  if (exercise.type === 'qcm') {
    return exercise.choices?.find((c) => c.key === reponse)?.text ?? reponse
  }
  if (exercise.type === 'vrai_faux') return reponse === 'true' ? 'Vrai' : 'Faux'
  return exercise.answer_unit ? `${reponse} ${exercise.answer_unit}` : reponse
}
