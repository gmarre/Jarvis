import { createContext, useContext } from 'react'

import type { Catalog, ProfileCompletion, Session, SignUpInput } from '@/data'
import type { ProgressMap } from '@/lib/dag'
import type { Correction } from '@/lib/exercise'
import type { Flashcard, PublicExercise } from '@/types/content'
import type {
  CourseOffer,
  AccordPublic,
  ChampModifiable,
  ModificationEnAttente,
  PlacementResult,
  Profile,
  SuperAttempt,
} from '@/types/domain'

// Contrat de la session et hooks d'acces. Separe du provider pour que ce
// fichier n'exporte aucun composant : c'est ce qui garde le rechargement a
// chaud fonctionnel cote Vite.

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AnswerResult extends Correction {
  justMastered: boolean
  /** Cette reponse etait un controle d'une competence acquise. */
  controle: 'reussi' | 'rate' | null
  /** Niveau de maitrise apres la reponse (0 a 5). */
  niveau: number
  /** Date du prochain controle apres la reponse, null si aucun. */
  prochainControle: string | null
  /** Exercices faits : le super exercice de la competence reste a reussir. */
  attendEpreuve: boolean
  /** L'eleve echoue de facon repetee : on lui reproposera les prerequis. */
  shouldDescend: boolean
  descendTo: string[]
}

/** Ce que le passage d'un super exercice a change pour sa competence. */
export interface EffetSuper {
  niveauAvant: number
  niveauApres: number
  /** La competence vient d'etre acquise (niveau 4) grace a ce passage. */
  justMastered: boolean
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
  /** Renvoie le lien de confirmation d'une inscription par email. */
  resendConfirmation: (email: string) => Promise<void>
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
  /** Carte defi retournee : l'eleve dit s'il savait (lib/defis.ts). */
  reviserDefi: (carte: Flashcard, savait: boolean) => void
  /**
   * Super exercice rendu : enregistre le passage (score, reponses) et applique
   * la regle de maitrise a sa competence porteuse (niveau 4 s'il est reussi).
   */
  enregistrerSuper: (attempt: SuperAttempt) => EffetSuper
  /** Cloture le test de positionnement. */
  completePlacement: (result: PlacementResult, progress: ProgressMap) => void
  bookSlot: (slotId: string, skillId: string | null) => void
  cancelBooking: (bookingId: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  /**
   * Comme updateProfile, mais attend le serveur et reprend le profil qu'il
   * rend : la base peut avoir remis le consentement a zero (migration 0011).
   * Rejette en cas d'echec, pour que le formulaire l'affiche.
   */
  modifierProfil: (patch: Partial<Profile>) => Promise<Profile>

  // --- Compte et accord parental -----------------------------------------

  aUnMotDePasse: () => Promise<boolean>
  changerMotDePasse: (ancien: string, nouveau: string) => Promise<void>
  changerEmail: (nouvelEmail: string) => Promise<void>
  demanderConsentement: () => Promise<{ envoye_a: string }>
  demanderModification: (champ: ChampModifiable, valeur: string) => Promise<{ envoye_a: string }>
  getModificationsEnAttente: () => Promise<ModificationEnAttente[]>
  lireAccord: (jeton: string) => Promise<AccordPublic>
  repondreAccord: (jeton: string, reponse: 'confirmer' | 'refuser') => Promise<AccordPublic['etat']>
  /**
   * Ouverture de creneaux par un professeur (ecran 7, vue prof). `starts` en
   * minutes depuis minuit, au quart d'heure : 555 vaut 9h15.
   */
  /**
   * Ouvre des creneaux ce jour-la, aux debuts donnes (minutes depuis minuit).
   * Avec une offre : duree, places et prix sont les siens (trigger de 0018).
   */
  openSlots: (dayIso: string, starts: number[], domaines: string[], offre?: CourseOffer, reserve?: boolean) => void
  /** Relit le catalogue (offres, creneaux) apres une modification du professeur. */
  rechargerCatalogue: () => Promise<void>
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
