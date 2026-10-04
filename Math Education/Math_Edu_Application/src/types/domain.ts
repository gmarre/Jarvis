// Types de l'etat eleve : ce qui vivra en base Supabase (cf. CLAUDE.md, section
// 6 "Modele de donnees"). Le contenu pedagogique, lui, reste en JSON versionne
// et vit dans `types/content.ts`.

import type { SchoolLevel } from './content'

export type UserRole = 'eleve' | 'prof' | 'parent'

/** Table `profiles`. */
export interface Profile {
  id: string
  role: UserRole
  prenom: string
  nom: string
  email: string
  niveau_scolaire: SchoolLevel | null
  date_naissance: string | null
  email_parent: string | null
  /** Null tant que le parent n'a pas confirme (RGPD mineurs, < 15 ans). */
  consentement_parental_at: string | null
  cree_le: string
  /** Preferences de confidentialite, ecran Profil. */
  partage_progression_prof: boolean
  resume_hebdo_parent: boolean
  rappels_revision: boolean
  abonnement: Abonnement | null
}

export interface Abonnement {
  prix_mensuel: number
  engagement_mois: number
  actif: boolean
  jour_renouvellement: number
}

/**
 * Statut d'une competence pour un eleve donne.
 * - `locked` : au moins un prerequis n'est pas maitrise.
 * - `available` : tous les prerequis sont maitrises, jamais travaillee.
 * - `in_progress` : commencee, seuil de maitrise pas encore atteint.
 * - `mastered` : seuil de maitrise atteint.
 */
export type SkillStatus = 'locked' | 'available' | 'in_progress' | 'mastered'

/** Table `skill_progress`. */
export interface SkillProgress {
  skill_id: string
  status: SkillStatus
  /**
   * Les `out_of` dernieres tentatives, de la plus ancienne a la plus recente.
   * C'est la fenetre glissante sur laquelle se juge la maitrise. En base, elle
   * sera recalculable depuis `exercise_attempts` : on la stocke ici pour eviter
   * une requete a chaque affichage.
   */
  recent: boolean[]
  /** Reussites dans la fenetre courante. Derive de `recent`. */
  score: number
  /** Taille de la fenetre courante. Derive de `recent`. */
  attempts: number
  /** Echeance de revision espacee (Leitner), null si rien a reviser. */
  next_review_at: string | null
  /** Rang Leitner : 0 = jamais revise, puis J+1, J+3, J+7, J+21. */
  review_box: number
  updated_at: string | null
}

/** Table `exercise_attempts`. */
export interface ExerciseAttempt {
  id: string
  exercise_id: string
  skill_id: string
  answer: string
  is_correct: boolean
  duration_s: number
  created_at: string
}

/** Resultat d'un test de positionnement, ecran 2. */
export interface PlacementResult {
  questions_posees: number
  competences_maitrisees: number
  competences_totales: number
  /** Competences a reparer en priorite, de la plus profonde a la plus proche. */
  lacunes_racines: string[]
  /** Competence visee, generalement du niveau scolaire de l'eleve. */
  objectif_skill_id: string
  estimation_semaines: number
}

export interface Teacher {
  id: string
  prenom: string
  nom_court: string
  titre: string
  note: number
  nb_cours: number
  /** Domaines du DAG couverts par ce professeur. */
  domaines: string[]
}

/** Table `availability_slots`. */
export interface AvailabilitySlot {
  id: string
  prof_id: string
  /** ISO 8601. */
  start_at: string
  duree_min: number
  /** Max 3 eleves par cours (cf. CLAUDE.md section 2). */
  capacite: number
  places_prises: number
  prix_eur: number
  domaines: string[]
}

/** Table `bookings`. */
export interface Booking {
  id: string
  slot_id: string
  eleve_id: string
  /** Competence sur laquelle la seance est preparee. */
  skill_id: string | null
  cree_le: string
  paid_at: string | null
}

/** Table `content_reviews` : verdict de recette sur un exercice ou une carte. */
export type ReviewItemType = 'exercise' | 'mindmap'
export type ReviewVerdict = 'accepte' | 'invalide'

export interface ContentReview {
  item_type: ReviewItemType
  item_id: string
  verdict: ReviewVerdict
  /** Obligatoire pour un refus : c'est ce que lira celui qui corrige. */
  commentaire: string
  /** ISO 8601. */
  mis_a_jour_le: string
  /** Pose par scripts/recette.py une fois le verdict reporte dans le contenu. */
  traite_le: string | null
}

/** Ce que l'ecran de recette envoie. */
export type NewContentReview = Pick<ContentReview, 'item_type' | 'item_id' | 'verdict' | 'commentaire'>

/** Etat de recette du compte connecte. */
export interface Recette {
  /** Le compte figure dans content_reviewers. Sinon, rien de la recette ne s'affiche. */
  relecteur: boolean
  reviews: ContentReview[]
}
