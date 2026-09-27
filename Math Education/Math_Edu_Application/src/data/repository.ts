// Couche d'acces aux donnees.
//
// Tout l'etat eleve passe par cette interface, et uniquement par elle. Deux
// implementations la respectent : `supabaseRepository` (la vraie) et
// `mockRepository` (demonstration hors ligne et tests). Le choix se fait dans
// `data/index.ts`, aucun ecran n'a a savoir laquelle tourne.
//
// CHANGEMENT DE MODELE (sprint 2a). L'ancienne interface exposait
// `save(session)` : le provider reecrivait la session entiere a chaque
// changement d'etat. Acceptable contre localStorage, intenable contre Postgres,
// ou une seule reponse d'exercice aurait reecrit les 38 lignes de progression et
// tout l'historique des tentatives.
//
// L'interface expose donc maintenant une mutation par intention. Chacune ecrit
// le minimum et rend ce que le serveur a reellement enregistre.

import type { ProgressMap } from '@/lib/dag'
import type {
  AvailabilitySlot,
  Booking,
  ExerciseAttempt,
  PlacementResult,
  Profile,
  SkillProgress,
  Teacher,
  UserRole,
} from '@/types/domain'
import type { SchoolLevel } from '@/types/content'

/** Session complete d'un utilisateur connecte. */
export interface Session {
  profile: Profile
  progress: ProgressMap
  /** Competence visee, definie par le test de positionnement. */
  objectifSkillId: string | null
  placement: PlacementResult | null
  bookings: Booking[]
  attempts: ExerciseAttempt[]
}

export interface SignUpInput {
  role: UserRole
  prenom: string
  nom: string
  email: string
  motDePasse: string
  niveau_scolaire: SchoolLevel | null
  date_naissance: string | null
  email_parent: string | null
  consentement_parental: boolean
}

/** Champs que l'ecran /bienvenue complete apres une connexion Google. */
export interface ProfileCompletion {
  role: UserRole
  prenom: string
  nom: string
  niveau_scolaire: SchoolLevel | null
  date_naissance: string | null
  email_parent: string | null
}

export interface Catalog {
  teachers: Teacher[]
  slots: AvailabilitySlot[]
}

/** Creneau a ouvrir, avant que le serveur ne lui attribue son identifiant. */
export type NewSlot = Omit<AvailabilitySlot, 'id' | 'places_prises'>

/**
 * Un profil est incomplet tant qu'il manque de quoi construire un parcours.
 * Google ne fournit ni niveau scolaire, ni date de naissance, ni email parent :
 * sans ce controle, impossible d'appliquer la regle des 15 ans a un compte
 * cree par OAuth.
 */
export function isProfileComplete(profile: Profile): boolean {
  if (!profile.prenom.trim()) return false
  if (profile.role !== 'eleve') return true
  return Boolean(profile.niveau_scolaire) && Boolean(profile.date_naissance)
}

export interface DataRepository {
  // --- Authentification ---------------------------------------------------

  /** Session courante, ou null si personne n'est connecte. */
  getSession(): Promise<Session | null>
  /**
   * Notifie les changements d'authentification (connexion, deconnexion,
   * rafraichissement de jeton, retour de redirection OAuth). Rend la fonction
   * de desabonnement.
   */
  onAuthChange(handler: (session: Session | null) => void): () => void
  /** Redirige vers Google. Le retour repasse par `onAuthChange`. */
  signInWithGoogle(): Promise<void>
  signInWithPassword(email: string, motDePasse: string): Promise<Session>
  signUp(input: SignUpInput): Promise<Session>
  signOut(): Promise<void>
  /** Complete un profil cree par OAuth (ecran /bienvenue). */
  completeProfile(completion: ProfileCompletion): Promise<Profile>

  // --- Mutations, une par intention --------------------------------------

  updateProfile(patch: Partial<Profile>): Promise<Profile>
  /** Une reponse d'exercice : une progression mise a jour, une tentative ajoutee. */
  saveAttempt(attempt: ExerciseAttempt, progress: SkillProgress): Promise<void>
  /** Carte mentale revue : avance l'echeance de revision espacee. */
  saveProgress(progress: SkillProgress): Promise<void>
  /** Cloture du positionnement : le resultat, et la progression initiale en lot. */
  savePlacement(result: PlacementResult, progress: SkillProgress[]): Promise<void>
  createBooking(slotId: string, skillId: string | null): Promise<Booking>
  deleteBooking(bookingId: string): Promise<void>
  createSlots(slots: NewSlot[]): Promise<AvailabilitySlot[]>

  // --- Lectures -----------------------------------------------------------

  getCatalog(): Promise<Catalog>
}

/**
 * Erreur d'ecriture remontee aux ecrans.
 *
 * L'etat local avance avant la confirmation du serveur. Si une ecriture echoue,
 * l'eleve doit l'apprendre : il a peut-etre travaille pour rien. On ne corrige
 * jamais silencieusement.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
