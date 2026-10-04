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
import type { Correction } from '@/lib/exercise'
import type {
  AvailabilitySlot,
  Booking,
  ContentReview,
  ExerciseAttempt,
  NewContentReview,
  PlacementResult,
  Profile,
  Recette,
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

/**
 * Inscription par email : l'identite seulement.
 *
 * Niveau scolaire, date de naissance et email parent ne sont PAS demandes ici.
 * Quand la confirmation d'email est active, `auth.signUp` cree le compte sans
 * ouvrir de session : toute ecriture dans `profiles` partirait alors sans JWT,
 * filtree par le RLS. Ces champs sont donc completes sur /bienvenue, une fois
 * connecte, exactement comme pour un compte Google. Une seule implementation de
 * la regle des 15 ans, et aucune date de naissance de mineur dans les
 * metadonnees d'authentification, que Supabase recopie dans le JWT.
 */
export interface SignUpInput {
  role: UserRole
  prenom: string
  email: string
  motDePasse: string
}

/** Champs que l'ecran /bienvenue complete apres la premiere connexion. */
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
  /**
   * Cree le compte. Rend la session ouverte, ou `null` quand le compte attend la
   * confirmation de son adresse : aucune session n'existe alors, et l'ecran doit
   * le dire au lieu de faire comme si l'utilisateur etait connecte.
   */
  signUp(input: SignUpInput): Promise<Session | null>
  signOut(): Promise<void>
  /** Complete un profil cree par OAuth ou par email (ecran /bienvenue). */
  completeProfile(completion: ProfileCompletion): Promise<Profile>

  // --- Correction ---------------------------------------------------------

  /**
   * Corrige une reponse. En production c'est le serveur qui corrige (Edge
   * Function `corriger`) : l'application n'a pas les reponses. Ne fait que
   * corriger, sans rien enregistrer : la tentative suit par saveAttempt.
   */
  corriger(exerciseId: string, reponse: string): Promise<Correction>

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

  // --- Recette du contenu ------------------------------------------------

  /** Le compte est-il relecteur, et ses verdicts deja rendus. */
  getRecette(): Promise<Recette>
  /**
   * Rend (ou change) un verdict. Un seul par relecteur et par element : le
   * nouveau remplace l'ancien, et redevient a reporter par scripts/recette.py.
   */
  saveReview(review: NewContentReview): Promise<ContentReview>
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
    /**
     * Vrai quand la base a refuse au nom d'une regle (creneau complet, deja
     * reserve), et non a cause d'une panne. L'ecran ne doit pas alors renvoyer
     * l'eleve verifier sa connexion : il n'y a rien a reparer de son cote.
     */
    readonly refus = false,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
