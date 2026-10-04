import { createContext, useContext } from 'react'

import type { Catalog, ProfileCompletion, Session, SignUpInput } from '@/data'
import type { ProgressMap } from '@/lib/dag'
import type { Correction } from '@/lib/exercise'
import type { PublicExercise } from '@/types/content'
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

export interface SyncError {
  message: string
  /**
   * La base a refuse au nom d'une regle, rien n'est en panne. Le bandeau ne
   * conseille alors pas de verifier la connexion.
   */
  refus: boolean
}

/** Issue d'une inscription : connecte tout de suite, ou en attente du lien. */
export type SignUpOutcome = 'connecte' | 'confirmation_requise'

export interface SessionValue {
  status: SessionStatus
  session: Session | null
  catalog: Catalog
  /**
   * Derniere ecriture echouee, ou null.
   *
   * L'etat local avance avant la confirmation du serveur. Si une ecriture
   * echoue, l'eleve doit l'apprendre : il a peut-etre travaille pour rien. On
   * ne corrige jamais silencieusement.
   */
  syncError: SyncError | null
  dismissSyncError: () => void

  // --- Authentification ---------------------------------------------------

  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, motDePasse: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<SignUpOutcome>
  signOut: () => Promise<void>
  /** Complete un profil cree par OAuth ou par email (ecran /bienvenue). */
  completeProfile: (completion: ProfileCompletion) => Promise<void>
  /** Vrai quand l'application tourne sur donnees factices. */
  isDemo: boolean

  // --- Mutations ----------------------------------------------------------

  /**
   * Fait corriger une reponse (par le serveur en production), puis enregistre
   * la tentative et fait progresser le DAG. Rejette si la correction echoue :
   * rien n'est alors enregistre, l'eleve peut valider a nouveau.
   */
  answerExercise: (
    exercise: PublicExercise,
    raw: string,
    durationS: number,
  ) => Promise<AnswerResult>
  /** Correction seule, sans rien enregistrer : sert au test de positionnement. */
  corriger: (exerciseId: string, raw: string) => Promise<Correction>
  /** Marque une carte mentale comme revue : passe a l'echeance Leitner suivante. */
  reviewSkill: (skillId: string) => void
  /** Cloture le test de positionnement. */
  completePlacement: (result: PlacementResult, progress: ProgressMap) => void
  bookSlot: (slotId: string, skillId: string | null) => void
  cancelBooking: (bookingId: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  /**
   * Ouverture de creneaux par un professeur (ecran 7, vue prof). `starts` en
   * minutes depuis minuit, au quart d'heure : 555 vaut 9h15.
   */
  openSlots: (dayIso: string, starts: number[], domaines: string[]) => void
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
