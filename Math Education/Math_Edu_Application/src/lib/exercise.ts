// Correction d'un exercice.
//
// Les regles vivent dans supabase/functions/_shared/correction.ts, partage avec
// l'Edge Function `corriger` : en production, c'est le serveur qui corrige
// (l'application n'a plus les reponses). Ce module les reexpose pour le mode
// demonstration et les tests.

import type { Exercise } from '@/types/content'

export {
  checkAnswer,
  formatExpected,
  type Correction,
} from '../../supabase/functions/_shared/correction'

const LEVEL_LABELS: Record<Exercise['level'], string> = {
  decouverte: 'Découverte',
  entrainement: 'Entraînement',
  maitrise: 'Maîtrise',
}

export function exerciseLevelLabel(level: Exercise['level']): string {
  return LEVEL_LABELS[level]
}
