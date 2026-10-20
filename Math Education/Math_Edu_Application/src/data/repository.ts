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
import type { DefiProgressMap } from '@/lib/defis'
import type { Correction } from '@/lib/exercise'
import type {
  AvailabilitySlot,
  Booking,
  AccordPublic,
  ChampModifiable,
  ContentReview,
  ExerciseAttempt,
  FlashcardProgress,
  ModificationEnAttente,
  SuperAttempt,
  NewContentReview,
  PlacementResult,
  Profile,
  Rappel,
  RappelPublic,
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
  /** Revision espacee des cartes defi, par identifiant de carte (migration 0014). */
  defis: DefiProgressMap
  /** Passages des super exercices, du plus recent au plus ancien (migration 0016). */
  superAttempts: SuperAttempt[]
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
  /**
   * Renvoie le lien de confirmation d'une inscription par email. Ne dit pas si
   * l'adresse a un compte : la reponse est la meme dans les deux cas.
   */
  resendConfirmation(email: string): Promise<void>
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
  /** Carte defi retournee : sa boite et sa prochaine echeance. */
  saveDefi(progress: FlashcardProgress): Promise<void>
  /** Super exercice rendu : le passage, score et reponses compris. */
  saveSuperAttempt(attempt: SuperAttempt): Promise<void>
  /** Cloture du positionnement : le resultat, et la progression initiale en lot. */
  savePlacement(result: PlacementResult, progress: SkillProgress[]): Promise<void>
  createBooking(slotId: string, skillId: string | null): Promise<Booking>
  deleteBooking(bookingId: string): Promise<void>
  createSlots(slots: NewSlot[]): Promise<AvailabilitySlot[]>

  // --- Compte et accord parental (migration 0011) ------------------------

  /** Vrai si le compte se connecte par mot de passe (et non seulement Google). */
  aUnMotDePasse(): Promise<boolean>
  /**
   * Change le mot de passe apres avoir verifie l'ancien. Rejette si l'ancien
   * est faux : un telephone laisse ouvert ne suffit pas a prendre le compte.
   */
  changerMotDePasse(ancien: string, nouveau: string): Promise<void>
  /**
   * Majeur seulement : demande le changement d'adresse a Supabase Auth, qui
   * envoie un lien de confirmation a la nouvelle adresse. Rien ne change avant
   * le clic. Un mineur passe par demanderModification.
   */
  changerEmail(nouvelEmail: string): Promise<void>
  /** Envoie (ou renvoie) au parent l'email de consentement. Rend l'adresse visee. */
  demanderConsentement(): Promise<{ envoye_a: string }>
  /** Mineur : soumet un changement d'email ou de date de naissance au parent. */
  demanderModification(champ: ChampModifiable, valeur: string): Promise<{ envoye_a: string }>
  /** Demandes de modification en attente du parent, pour les afficher. */
  getModificationsEnAttente(): Promise<ModificationEnAttente[]>
  /** Page publique du parent : lit la demande liee au jeton. Sans session. */
  lireAccord(jeton: string): Promise<AccordPublic>
  /** Page publique du parent : accepte ou refuse. Rend l'etat final. */
  repondreAccord(jeton: string, reponse: 'confirmer' | 'refuser'): Promise<AccordPublic['etat']>

  // --- Rappels par email (migration 0017, fonction rappel-revision) -------

  /** Etat du rappel de l'eleve, null s'il n'en a jamais demande. */
  getRappel(): Promise<Rappel | null>
  /**
   * Active le rappel a cette heure. A 15 ans et plus, il part vers l'eleve
   * tout de suite ; avant, une demande d'accord part chez le parent.
   */
  activerRappel(heure: string): Promise<Rappel>
  /** Change l'heure ou met en pause jusqu'a une date (null : reprendre). */
  reglerRappel(reglage: { heure?: string; pause_jusqu_au?: string | null }): Promise<Rappel>
  desactiverRappel(): Promise<Rappel | null>
  /** Page publique /rappels/:jeton : lit le rappel vise. Sans session. */
  lireLienRappel(jeton: string): Promise<RappelPublic>
  /** Page publique : accepte les rappels, ou ne plus les recevoir. Rend l'etat final. */
  repondreLienRappel(jeton: string, reponse: 'confirmer' | 'desinscrire'): Promise<RappelPublic['etat']>

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
