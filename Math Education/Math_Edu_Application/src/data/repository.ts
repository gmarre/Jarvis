// Couche d'acces aux donnees.
//
// Tout l'etat eleve passe par cette interface, et uniquement par elle. C'est la
// couture prevue pour Supabase : le jour du branchement, on ecrit un
// `supabaseRepository` qui implemente ce meme contrat et on change une seule
// ligne dans `data/index.ts`. Aucun ecran n'est touche.

import type { ProgressMap } from '@/lib/dag'
import type {
  AvailabilitySlot,
  Booking,
  ExerciseAttempt,
  PlacementResult,
  Profile,
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

export interface Catalog {
  teachers: Teacher[]
  slots: AvailabilitySlot[]
}

export interface DataRepository {
  /** Compte de demonstration deja diagnostique (Lea, 4e). */
  signInDemo(): Promise<Session>
  /** Compte tout juste cree : aucune progression, etats vides. */
  signUp(input: SignUpInput): Promise<Session>
  /** Bascule sur l'espace professeur de demonstration. */
  signInTeacher(): Promise<Session>
  /** Session persistee, pour survivre a un rechargement de page. */
  restore(): Promise<Session | null>
  save(session: Session): Promise<void>
  clear(): Promise<void>
  getCatalog(): Promise<Catalog>
}
