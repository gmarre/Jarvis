import { createContext, useContext } from 'react'

import type { ContentReview, NewContentReview, ReviewItemType } from '@/types/domain'

// Contrat de la recette du contenu et hook d'acces. Separe du provider pour la
// meme raison que session.ts : garder le rechargement a chaud de Vite.

export interface RecetteValue {
  /** Le compte connecte est relecteur : les panneaux de recette s'affichent. */
  relecteur: boolean
  /** Faux tant que la reponse n'est pas arrivee : ne pas conclure trop tot. */
  chargee: boolean
  /** Verdict deja rendu sur un element, s'il y en a un. */
  verdictDe: (type: ReviewItemType, id: string) => ContentReview | undefined
  /** Tous les verdicts du relecteur, pour la page de suivi. */
  reviews: ContentReview[]
  /** Enregistre un verdict. Rejette si la base le refuse : l'ecran le dit. */
  rendreVerdict: (review: NewContentReview) => Promise<void>
}

export const RecetteContext = createContext<RecetteValue | null>(null)

export function useRecette(): RecetteValue {
  const value = useContext(RecetteContext)
  if (!value) throw new Error('useRecette doit être utilisé dans un RecetteProvider')
  return value
}
