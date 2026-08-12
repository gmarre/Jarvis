import { createContext, useContext } from 'react'

import type { Catalog, Session, SignUpInput } from '@/data'
import type { ProgressMap } from '@/lib/dag'
import type { Correction } from '@/lib/exercise'
import type { Exercise } from '@/types/content'
import type { PlacementResult, Profile } from '@/types/domain'

// Contrat de la session et hooks d'acces. Separe du provider pour que ce
// fichier n'exporte aucun composant : c'est ce qui garde le rechargement a
// chaud fonctionnel cote Vite.

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AnswerResult extends Correction {
  justMastered: boolean
  /** L'eleve echoue de facon repetee : on lui reproposera les prerequis. */
  shouldDescend: boolean
  descendTo: string[]
}

export interface SessionValue {
  status: SessionStatus
  session: Session | null
  catalog: Catalog
  signInDemo: () => Promise<void>
  signInTeacher: () => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
  /** Enregistre une tentative d'exercice et fait progresser le DAG. */
  answerExercise: (exercise: Exercise, raw: string, durationS: number) => AnswerResult
  /** Marque une carte mentale comme revue : passe a l'echeance Leitner suivante. */
  reviewSkill: (skillId: string) => void
  /** Cloture le test de positionnement. */
  completePlacement: (result: PlacementResult, progress: ProgressMap) => void
  bookSlot: (slotId: string, skillId: string | null) => void
  cancelBooking: (bookingId: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  /** Ouverture de creneaux par un professeur (ecran 7, vue prof). */
  openSlots: (dayIso: string, hours: number[], domaines: string[]) => void
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession doit être utilisé dans un SessionProvider')
  return value
}

/** Variante pour les ecrans proteges : la session y est garantie non nulle. */
export function useAuthenticatedSession(): SessionValue & { session: Session } {
  const value = useSession()
  if (!value.session) throw new Error('Session absente sur un écran protégé')
  return value as SessionValue & { session: Session }
}
