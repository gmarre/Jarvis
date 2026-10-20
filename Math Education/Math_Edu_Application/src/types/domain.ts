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
  /**
   * Moment ou le role a ete fixe (migration 0010). Null : compte Google qui
   * n'a pas encore complete son profil, il peut encore choisir son role, une fois.
   */
  role_choisi_le: string | null
  cree_le: string
  /** Preferences de confidentialite, ecran Profil. */
  partage_progression_prof: boolean
  resume_hebdo_parent: boolean
  rappels_revision: boolean
  abonnement: Abonnement | null
  /** Chemins de /parcours choisis (lettres de domaine), migration 0012. */
  chemins_choisis: string[]
  /** Seances visees par semaine, 2 a 5 (migration 0017). */
  rythme_jours: number
  /** Jours de travail choisis, 1 lundi a 7 dimanche ; les rappels ne partent que ces jours-la. */
  jours_travail: number[]
}

/** Rappel de travail par email (migration 0017), ecrit par le serveur seul. */
export interface Rappel {
  destinataire: string
  /** Avant 15 ans, le rappel va au parent, qui l'a accepte. */
  pour_parent: boolean
  /** « 17:00 ». */
  heure: string
  etat: 'en_attente' | 'actif' | 'arrete'
  motif_arret: 'eleve' | 'desinscription' | 'sans_effet' | 'refus' | null
  pause_jusqu_au: string | null
}

/** Un enfant rattache au compte parent (migration 0019, mes_enfants). */
export interface Enfant {
  lien_id: string
  eleve_id: string
  prenom: string
  niveau_scolaire: string | null
  rapport_hebdo: boolean
}

/** Reponse et corrige d'un exercice, rendus au seul parent rattache (corriges_pour_parent). */
export interface CorrigeParent {
  exercise_id: string
  answer: { value: string | number | boolean; unit?: string | null; accepted?: (string | number)[] }
  solution_steps: string[]
  misconceptions: Record<string, string | null>
}

/** Ce que voit le parent (ou le destinataire) sur /rappels/:jeton, sans compte. */
export interface RappelPublic {
  prenom: string
  etat: 'en_attente' | 'actif' | 'arrete' | 'expire'
  heure: string
  /** Lien d'accord envoye au parent, plutot que lien de desinscription d'un rappel. */
  accord: boolean
}

/** Ce qu'un mineur ne change qu'avec l'accord de son parent (migration 0011). */
export type ChampModifiable = 'date_naissance' | 'email'

/** Demande de modification envoyee au parent, pas encore tranchee. */
export interface ModificationEnAttente {
  id: string
  champ: ChampModifiable
  nouvelle_valeur: string
  email_parent: string
  cree_le: string
  expire_le: string
}

/** Ce que la page publique /accord/:jeton montre au parent. */
export interface AccordPublic {
  type: 'consentement' | 'modification'
  prenom: string
  champ: ChampModifiable | null
  nouvelle_valeur: string | null
  etat: 'en_attente' | 'confirme' | 'expire' | 'annule'
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

/** Table `super_attempts` (migration 0016) : un passage d'un super exercice. */
export interface SuperAttempt {
  id: string
  super_id: string
  skill_id: string
  score: number
  total: number
  reussi: boolean
  reponses: Record<string, { reponse: string; juste: boolean }>
  duree_s: number
  created_at: string
}

/** Table `flashcard_progress` (migration 0014) : revision espacee d'une carte defi. */
export interface FlashcardProgress {
  card_id: string
  skill_id: string
  /** Boite de Leitner, 1 (demain) a 5 (dans un mois). Voir lib/defis.ts. */
  box: number
  next_review_at: string
  reviews: number
  /** Derniere reponse de l'eleve : « je savais » ou non. */
  last_knew: boolean
  updated_at: string
}

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
  /**
   * Echeance de relecture de la carte mentale (Leitner), null si rien a
   * revoir. Distincte des controles de la competence (`prochain_controle`).
   */
  next_review_at: string | null
  /** Rang Leitner de la carte : 0 = jamais revue, puis J+1, J+3, J+7, J+21. */
  review_box: number
  updated_at: string | null
  /** Niveau de maitrise de 0 a 5 (lib/maitrise.ts, migration 0013). */
  niveau: 0 | 1 | 2 | 3 | 4 | 5
  /** Exercices differents reussis depuis la derniere ouverture. */
  exercices_reussis: string[]
  /** Controles reussis d'affilee au niveau 4. */
  controles_reussis: number
  /** Date du prochain controle de la competence, null si aucun. */
  prochain_controle: string | null
  /** Acquise par le test d'entree : controles plus espaces. */
  valide_par_test: boolean
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
  /** Profil public (migration 0018). */
  experience: string
  methode: string
  /** Classes enseignees (CP a 3e). */
  niveaux: string[]
  /** Verifie par l'administrateur : seul un professeur verifie est visible des eleves. */
  verifie: boolean
}

/** Ce que le professeur ecrit de son profil public. */
export type ProfilProf = Pick<Teacher, 'titre' | 'experience' | 'methode' | 'niveaux' | 'domaines'>

/** Table `course_offers` (migration 0018) : un type de cours propose par un professeur. */
export interface CourseOffer {
  id: string
  prof_id: string
  titre: string
  description: string
  skill_ids: string[]
  niveau: string
  /** 30 a 120 minutes. */
  duree_min: number
  /** 3 eleves au plus. */
  places: number
  /** Prix affiche, non encaisse pendant la beta. */
  prix_eur: number
  active: boolean
}

export type NewCourseOffer = Omit<CourseOffer, 'id' | 'prof_id'>

/** Un eleve inscrit a un creneau, vu par son professeur (inscrits_du_creneau). */
export interface Inscrit {
  eleve_id: string
  prenom: string
  /** L'eleve partage sa progression : le professeur peut voir son graphe. */
  partage: boolean
  skill_id: string | null
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
  /** Offre de cours dont le creneau est issu (migration 0018), null pour un cours libre. */
  offer_id: string | null
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
