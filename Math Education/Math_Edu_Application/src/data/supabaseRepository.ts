// Implementation Supabase du repository.
//
// Rien ici ne contient de logique metier : le moteur (lib/dag.ts, lib/exercise.ts)
// decide, ce fichier ne fait que lire et ecrire. C'est ce qui permettra de
// deplacer la correction cote serveur au sprint 3 sans rien reecrire du moteur.
//
// Le schema correspondant vit dans supabase/migrations/0001_schema_initial.sql.
// Les politiques RLS garantissent qu'un eleve ne lit et n'ecrit que ses lignes :
// aucun filtre `user_id` n'est donc necessaire en lecture, mais on le pose quand
// meme sur les requetes de liste, parce qu'une politique peut evoluer et qu'une
// requete explicite reste lisible.

import { FunctionsHttpError, type PostgrestError } from '@supabase/supabase-js'

import { requireSupabase } from '@/lib/supabase'
import { messageAuth } from '@/lib/authErreurs'
import { emptyProgress, type ProgressMap } from '@/lib/dag'
import type { DefiProgressMap } from '@/lib/defis'
import type { Correction } from '@/lib/exercise'
import { skills } from '@/content'
import { assurerContenu, chargerContenuSupabase } from '@/content/chargement'
import {
  RepositoryError,
  type Catalog,
  type DataRepository,
  type NewSlot,
  type ProfileCompletion,
  type Session,
  type ReponseEnregistree,
} from './repository'
import type {
  AccordPublic,
  AvailabilitySlot,
  Booking,
  ContentReview,
  ExerciseAttempt,
  FlashcardProgress,
  ModificationEnAttente,
  SuperAttempt,
  PlacementResult,
  Profile,
  Rappel,
  RappelPublic,
  SkillProgress,
  Teacher,
  CourseOffer,
  CorrigeParent,
  Enfant,
  Inscrit,
  MessageSuivi,
  Suivi,
  SuiviProf,
} from '@/types/domain'

// =============================================================================
// Conversion base -> types applicatifs
//
// Les noms de colonnes suivent deja les types TypeScript, ces fonctions restent
// donc minces. Elles existent pour un seul motif : etre le seul endroit a
// corriger si un nom de colonne change.
// =============================================================================

interface LigneProfil {
  id: string
  role: Profile['role']
  prenom: string
  nom: string
  email: string
  niveau_scolaire: Profile['niveau_scolaire']
  date_naissance: string | null
  email_parent: string | null
  consentement_parental_at: string | null
  role_choisi_le: string | null
  partage_progression_prof: boolean
  resume_hebdo_parent: boolean
  rappels_revision: boolean
  abonnement: Profile['abonnement']
  cree_le: string
  chemins_choisis?: string[] | null
  rythme_jours?: number | null
  jours_travail?: number[] | null
}

function versProfil(ligne: LigneProfil): Profile {
  return {
    id: ligne.id,
    role: ligne.role,
    prenom: ligne.prenom,
    nom: ligne.nom,
    email: ligne.email,
    niveau_scolaire: ligne.niveau_scolaire,
    date_naissance: ligne.date_naissance,
    email_parent: ligne.email_parent,
    consentement_parental_at: ligne.consentement_parental_at,
    // Absente tant que la migration 0010 n'est pas appliquee : on la traite
    // comme un role deja choisi, ce qui laisse l'ecran tel qu'avant.
    role_choisi_le: ligne.role_choisi_le === undefined ? ligne.cree_le : ligne.role_choisi_le,
    cree_le: ligne.cree_le,
    partage_progression_prof: ligne.partage_progression_prof,
    resume_hebdo_parent: ligne.resume_hebdo_parent,
    rappels_revision: ligne.rappels_revision,
    abonnement: ligne.abonnement,
    // Absente tant que la migration 0012 n'est pas appliquee.
    chemins_choisis: ligne.chemins_choisis ?? [],
    // Absentes tant que la migration 0017 n'est pas appliquee.
    rythme_jours: ligne.rythme_jours ?? 3,
    jours_travail: ligne.jours_travail ?? [],
  }
}

type LigneProgression = Omit<
  SkillProgress,
  'niveau' | 'exercices_reussis' | 'controles_reussis' | 'prochain_controle' | 'valide_par_test'
> &
  Partial<
    Pick<
      SkillProgress,
      'niveau' | 'exercices_reussis' | 'controles_reussis' | 'prochain_controle' | 'valide_par_test'
    >
  > & { user_id: string }

function versProgression(lignes: LigneProgression[]): ProgressMap {
  const carte: ProgressMap = {}
  // Toute competence du contenu a une ligne, meme absente en base : le moteur
  // lit `progress[id]` sans se demander si la ligne existe.
  for (const skill of skills) carte[skill.id] = emptyProgress(skill.id)

  for (const ligne of lignes) {
    carte[ligne.skill_id] = {
      skill_id: ligne.skill_id,
      status: ligne.status,
      recent: ligne.recent ?? [],
      score: ligne.score,
      attempts: ligne.attempts,
      next_review_at: ligne.next_review_at,
      review_box: ligne.review_box,
      updated_at: ligne.updated_at,
      // Colonnes de la migration 0013 ; avant elle, une competence maitrisee
      // est lue au niveau 4, sans controle prevu.
      niveau: ligne.niveau ?? (ligne.status === 'mastered' ? 4 : ligne.score > 0 ? 1 : 0),
      exercices_reussis: ligne.exercices_reussis ?? [],
      controles_reussis: ligne.controles_reussis ?? 0,
      prochain_controle: ligne.prochain_controle ?? null,
      valide_par_test: ligne.valide_par_test ?? false,
    }
  }
  return carte
}

// =============================================================================
// Gestion des erreurs
// =============================================================================

/**
 * Traduit une erreur PostgREST en message utilisable.
 *
 * Le code 42501 est un refus de politique RLS. Il apparait quand une politique
 * manque, pas seulement quand l'acces est illegitime : c'est le symptome decrit
 * dans CLAUDE.md section 5bis, l'app affiche "pas de donnees" alors que la base
 * est remplie. Le distinguer fait gagner des heures.
 */
function erreur(operation: string, cause: PostgrestError | Error | null): RepositoryError {
  if (!cause) return new RepositoryError(operation)

  const code = (cause as PostgrestError).code
  if (code === '42501') {
    return new RepositoryError(
      `${operation} : refus de la base (politique RLS). Verifier les politiques de la migration.`,
      cause,
    )
  }
  // Refus de regle, pas des pannes : le message dit ce qui s'est passe, sans
  // renvoyer l'eleve verifier une connexion qui fonctionne tres bien.
  if (cause.message?.includes('Creneau complet')) {
    return new RepositoryError(
      'Ce créneau est complet : la dernière place vient d’être prise.',
      cause,
      true,
    )
  }
  // Seule la reservation a une contrainte d'unicite qui parle a l'eleve
  // (slot_id, eleve_id). Ailleurs, un doublon reste une erreur technique.
  if (code === '23505' && operation === 'Reservation') {
    return new RepositoryError('Tu as déjà réservé ce créneau.', cause, true)
  }
  if (code === '23503') {
    return new RepositoryError(`${operation} : reference introuvable.`, cause)
  }
  return new RepositoryError(`${operation} : ${cause.message}`, cause)
}

// =============================================================================
// Edge Function accord-parental
// =============================================================================

/**
 * Appelle `accord-parental` et rend sa reponse. Une reponse d'erreur porte un
 * message destine a l'eleve ou au parent (`erreur`), qu'on remonte tel quel :
 * c'est la fonction qui sait pourquoi elle refuse (trop d'envois, lien expire).
 */
async function appelerAccord<T>(corps: Record<string, unknown>): Promise<T> {
  return appelerFonction<T>('accord-parental', corps)
}

/** Meme contrat pour `rapport-hebdo` et `supprimer-compte` (migration 0019). */
async function appelerParent<T>(nom: string, corps: Record<string, unknown>): Promise<T> {
  return appelerFonction<T>(nom, corps)
}

/** Meme contrat pour `rappel-revision` (migration 0017). */
async function appelerRappel<T>(corps: Record<string, unknown>): Promise<T> {
  return appelerFonction<T>('rappel-revision', corps)
}

/**
 * Appel de `corriger` ou de `rendre-super` : un refus (4xx) garde son message,
 * une panne donne la consigne de l'ecran d'exercice, la reponse restant saisie.
 */
async function appelerCorrection<T>(nom: string, corps: Record<string, unknown>): Promise<T> {
  try {
    return await appelerFonction<T>(nom, corps)
  } catch (cause) {
    if (cause instanceof RepositoryError && cause.refus) throw cause
    throw new RepositoryError(
      "La correction n'a pas pu se faire. Vérifie ta connexion et valide à nouveau.",
      cause instanceof Error ? cause : undefined,
    )
  }
}

async function appelerFonction<T>(nom: string, corps: Record<string, unknown>): Promise<T> {
  const db = requireSupabase()
  const { data, error } = await db.functions.invoke<T>(nom, { body: corps })
  if (error) {
    let message = "Le serveur n'a pas répondu. Vérifie ta connexion et réessaie."
    let refus = false
    if (error instanceof FunctionsHttpError) {
      const detail = (await error.context.json().catch(() => null)) as { erreur?: string } | null
      if (detail?.erreur) message = detail.erreur
      // 4xx : la demande est refusee pour une raison qu'on explique ; 5xx : panne.
      refus = error.context.status < 500
    }
    throw new RepositoryError(message, error, refus)
  }
  if (data === null) throw new RepositoryError('Réponse vide du serveur.')
  return data
}

// =============================================================================
// Lecture de la session
// =============================================================================

async function chargerSession(userId: string): Promise<Session | null> {
  const db = requireSupabase()

  // Une seule salve de requetes en parallele plutot qu'en cascade : sur un
  // reseau mobile, quatre allers-retours sequentiels se voient a l'oeil nu.
  // Le contenu pedagogique part dans la meme salve : il n'est lisible qu'une
  // fois connecte, et toute session rendue doit le trouver installe (le moteur
  // et versProgression le lisent). Il ne se charge qu'une fois par appareil et
  // par publication, voir content/chargement.ts.
  const [, profil, progression, tentatives, positionnement, reservations, defis, passages] = await Promise.all([
    assurerContenu(() => chargerContenuSupabase(db)).catch((cause: unknown) => {
      throw erreur('Lecture du contenu', cause instanceof Error ? cause : null)
    }),
    db.from('profiles').select('*').eq('id', userId).maybeSingle(),
    db.from('skill_progress').select('*').eq('user_id', userId),
    db
      .from('exercise_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('placement_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('bookings').select('*').eq('eleve_id', userId),
    db.from('flashcard_progress').select('*').eq('user_id', userId),
    db
      .from('super_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (profil.error) throw erreur('Lecture du profil', profil.error)
  // Le trigger cree le profil a l'inscription. Absent ici, c'est que le trigger
  // n'a pas ete installe : la migration n'a pas tourne.
  if (!profil.data) return null
  if (progression.error) throw erreur('Lecture de la progression', progression.error)
  if (tentatives.error) throw erreur('Lecture des tentatives', tentatives.error)
  if (positionnement.error) throw erreur('Lecture du positionnement', positionnement.error)
  if (reservations.error) throw erreur('Lecture des reservations', reservations.error)
  // Avant la migration 0014, la table n'existe pas : l'eleve garde sa session,
  // sans cartes defi. Toute autre erreur remonte.
  const tableAbsente = defis.error && ['42P01', 'PGRST205'].includes(defis.error.code ?? '')
  if (defis.error && !tableAbsente) throw erreur('Lecture des cartes defi', defis.error)
  // Idem pour les super exercices avant la migration 0016.
  const passagesAbsents = passages.error && ['42P01', 'PGRST205'].includes(passages.error.code ?? '')
  if (passages.error && !passagesAbsents) throw erreur('Lecture des super exercices', passages.error)

  const placement: PlacementResult | null = positionnement.data
    ? {
        questions_posees: positionnement.data.questions_posees,
        competences_maitrisees: positionnement.data.competences_maitrisees,
        competences_totales: positionnement.data.competences_totales,
        lacunes_racines: positionnement.data.lacunes_racines ?? [],
        objectif_skill_id: positionnement.data.objectif_skill_id,
        estimation_semaines: positionnement.data.estimation_semaines,
      }
    : null

  return {
    profile: versProfil(profil.data as LigneProfil),
    progress: versProgression((progression.data ?? []) as LigneProgression[]),
    objectifSkillId: placement?.objectif_skill_id ?? null,
    placement,
    bookings: (reservations.data ?? []) as Booking[],
    attempts: (tentatives.data ?? []) as ExerciseAttempt[],
    defis: versDefis(tableAbsente ? [] : ((defis.data ?? []) as FlashcardProgress[])),
    superAttempts: passagesAbsents ? [] : ((passages.data ?? []) as SuperAttempt[]),
  }
}

function versDefis(lignes: FlashcardProgress[]): DefiProgressMap {
  const parCarte: DefiProgressMap = {}
  for (const ligne of lignes) {
    parCarte[ligne.card_id] = {
      card_id: ligne.card_id,
      skill_id: ligne.skill_id,
      box: ligne.box,
      next_review_at: ligne.next_review_at,
      reviews: ligne.reviews,
      last_knew: ligne.last_knew,
      updated_at: ligne.updated_at,
    }
  }
  return parCarte
}

// =============================================================================
// Le repository
// =============================================================================

export const supabaseRepository: DataRepository = {
  async getSession() {
    const db = requireSupabase()
    const { data, error } = await db.auth.getSession()
    if (error) throw erreur('Lecture de la session', error)
    if (!data.session) return null
    return chargerSession(data.session.user.id)
  },

  onAuthChange(handler) {
    const db = requireSupabase()
    const { data } = db.auth.onAuthStateChange((evenement, session) => {
      // INITIAL_SESSION est deja couvert par getSession() a l'hydratation, le
      // traiter ici declencherait un double chargement au demarrage.
      if (evenement === 'INITIAL_SESSION') return

      if (!session) {
        handler(null)
        return
      }
      void chargerSession(session.user.id)
        .then(handler)
        .catch(() => handler(null))
    })
    return () => data.subscription.unsubscribe()
  },

  async signInWithGoogle() {
    const db = requireSupabase()
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Le retour repasse par la racine, puis HomeRedirect oriente selon le
        // role, ou vers /bienvenue si le profil est incomplet.
        redirectTo: `${window.location.origin}/`,
        // On ne demande rien de plus que l'identite : ce sont des mineurs.
        scopes: 'openid email profile',
      },
    })
    if (error) throw erreur('Connexion Google', error)
  },

  async signInWithPassword(email, motDePasse) {
    const db = requireSupabase()
    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    })
    if (error) {
      // Message volontairement identique pour un email inconnu et un mot de
      // passe faux : distinguer les deux revient a publier la liste des comptes.
      // Seule exception, l'adresse pas encore confirmee : Supabase ne la signale
      // qu'avec le bon mot de passe, elle ne revele donc rien.
      throw new RepositoryError(messageAuth(error, 'connexion'), error, true)
    }

    const session = data.user ? await chargerSession(data.user.id) : null
    if (!session) throw new RepositoryError('Profil introuvable apres connexion.')
    return session
  },

  async signUp(input) {
    const db = requireSupabase()
    const { data, error } = await db.auth.signUp({
      email: input.email.trim(),
      password: input.motDePasse,
      options: {
        // Lues par le trigger creer_profil_pour_nouvel_utilisateur. Rien d'autre :
        // ces metadonnees finissent dans le JWT.
        data: { role: input.role, prenom: input.prenom.trim() },
        // Le lien de confirmation ramene a la racine, d'ou RequireAuth oriente
        // vers /bienvenue tant que le profil est incomplet.
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    if (error) throw new RepositoryError(messageAuth(error, 'inscription'), error, true)

    // Pas de session : la confirmation d'email est active, le compte attend le
    // clic sur le lien. Aucune ecriture n'est possible d'ici, le RLS la
    // filtrerait. C'est ce cas qui faisait echouer l'inscription en recette.
    // Supabase repond de la meme facon quand l'adresse existe deja, pour ne pas
    // reveler quels comptes existent : l'ecran ne doit donc rien affirmer de plus.
    if (!data.session || !data.user) return null

    const session = await chargerSession(data.user.id)
    if (!session) throw new RepositoryError('Profil introuvable apres inscription.')
    return session
  },

  async resendConfirmation(email) {
    const db = requireSupabase()
    const { error } = await db.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw new RepositoryError(messageAuth(error, 'inscription'), error, true)
  },

  async signOut() {
    const db = requireSupabase()
    const { error } = await db.auth.signOut()
    if (error) throw erreur('Deconnexion', error)
  },

  async completeProfile(completion: ProfileCompletion) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    const { data, error } = await db
      .from('profiles')
      .update({
        role: completion.role,
        prenom: completion.prenom.trim(),
        nom: completion.nom.trim(),
        niveau_scolaire: completion.niveau_scolaire,
        date_naissance: completion.date_naissance,
        email_parent: completion.email_parent?.trim() || null,
        resume_hebdo_parent: Boolean(completion.email_parent),
      })
      .eq('id', utilisateur.user.id)
      .select('*')
      .single()

    if (error) throw erreur('Completion du profil', error)
    return versProfil(data as LigneProfil)
  },

  async corriger(exerciseId, reponse, mode) {
    const db = requireSupabase()
    const { data, error } = await db.functions.invoke<Correction>('corriger', {
      body: mode ? { exercise_id: exerciseId, reponse, mode } : { exercise_id: exerciseId, reponse },
    })
    if (error || !data) {
      throw new RepositoryError(
        "La correction n'a pas pu se faire. Vérifie ta connexion et valide à nouveau.",
        error ?? undefined,
      )
    }
    return data
  },

  async updateProfile(patch) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    // Liste blanche plutot que liste noire : seules ces colonnes partent du
    // client. La base refuse de toute facon `role` et
    // `consentement_parental_at` (trigger profiles_colonnes_protegees), mais
    // mieux vaut ne pas les envoyer que compter sur le refus.
    const modifiable: Record<string, unknown> = {}
    const autorisees = [
      'prenom',
      'nom',
      'niveau_scolaire',
      'date_naissance',
      'email_parent',
      'partage_progression_prof',
      'resume_hebdo_parent',
      'rappels_revision',
      'chemins_choisis',
      'rythme_jours',
      'jours_travail',
    ] as const

    for (const champ of autorisees) {
      if (champ in patch) modifiable[champ] = patch[champ]
    }

    const { data, error } = await db
      .from('profiles')
      .update(modifiable)
      .eq('id', utilisateur.user.id)
      .select('*')
      .single()

    if (error) throw erreur('Mise a jour du profil', error)
    return versProfil(data as LigneProfil)
  },

  async repondre(exercise, reponse, dureeS) {
    // Le serveur corrige, ecrit la tentative et la progression (sprint 6) :
    // le navigateur ne peut plus les ecrire (migration 0021).
    const r = await appelerCorrection<
      Correction & {
        progression: Omit<ReponseEnregistree, 'correction' | 'tentative' | 'ligne'> & { ligne: SkillProgress }
        tentative: ExerciseAttempt
      }
    >('corriger', { exercise_id: exercise.id, reponse, mode: 'exercice', duree_s: dureeS })
    const { progression, tentative, ...correction } = r
    return {
      correction,
      ligne: progression.ligne,
      vientDEtreAcquise: progression.vientDEtreAcquise,
      controle: progression.controle,
      attendEpreuve: progression.attendEpreuve,
      tentative,
    }
  },

  async rendreSuper(sx, reponses, dureeS) {
    const r = await appelerCorrection<{
      corrections: Record<string, Correction>
      passage: SuperAttempt
      progression: { ligne: SkillProgress; vientDEtreAcquise: boolean } | null
    }>('rendre-super', { super_id: sx.id, reponses, duree_s: dureeS })
    return {
      corrections: r.corrections,
      passage: r.passage,
      ligne: r.progression?.ligne ?? null,
      vientDEtreAcquise: r.progression?.vientDEtreAcquise ?? false,
    }
  },

  async saveProgress(progress: SkillProgress) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    // Seules ces trois colonnes restent ecrites par le navigateur : le reste
    // de la ligne appartient au serveur (trigger de la migration 0021).
    const { error } = await db
      .from('skill_progress')
      .update({
        review_box: progress.review_box,
        next_review_at: progress.next_review_at,
        updated_at: progress.updated_at,
      })
      .eq('user_id', utilisateur.user.id)
      .eq('skill_id', progress.skill_id)

    if (error) throw erreur('Enregistrement de la revision', error)
  },

  async saveDefi(progress: FlashcardProgress) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    const { error } = await db
      .from('flashcard_progress')
      .upsert({ ...progress, user_id: utilisateur.user.id }, { onConflict: 'user_id,card_id' })

    if (error) throw erreur('Enregistrement de la carte defi', error)
  },

  async savePlacement(result: PlacementResult, progress: SkillProgress[]) {
    const db = requireSupabase()
    // Le serveur verifie chaque competence declaree acquise contre les
    // reponses qu'il a lui-meme corrigees pendant le test (migration 0021),
    // puis ecrit le resultat et les lignes de progression.
    const { error } = await db.rpc('enregistrer_positionnement', {
      p_maitrisees: progress.filter((ligne) => ligne.status === 'mastered').map((ligne) => ligne.skill_id),
      p_questions: result.questions_posees,
      p_lacunes: result.lacunes_racines,
      p_objectif: result.objectif_skill_id,
      p_estimation: result.estimation_semaines,
    })
    if (error) throw erreur('Enregistrement du positionnement', error)
  },

  async createBooking(slotId, skillId) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    const { data, error } = await db
      .from('bookings')
      .insert({ slot_id: slotId, eleve_id: utilisateur.user.id, skill_id: skillId })
      .select('*')
      .single()

    // La capacite est refusee par un trigger, pas par une verification cote
    // client : deux eleves qui reservent la derniere place au meme instant
    // passeraient sinon tous les deux.
    if (error) throw erreur('Reservation', error)
    return data as Booking
  },

  async deleteBooking(bookingId) {
    const db = requireSupabase()
    const { error } = await db.from('bookings').delete().eq('id', bookingId)
    if (error) throw erreur('Annulation', error)
  },

  async createSlots(slots: NewSlot[]) {
    const db = requireSupabase()
    const { data, error } = await db
      .from('availability_slots')
      .upsert(
        slots.map((slot) => ({
          prof_id: slot.prof_id,
          start_at: slot.start_at,
          duree_min: slot.duree_min,
          capacite: slot.capacite,
          prix_eur: slot.prix_eur,
          domaines: slot.domaines,
          // Le trigger de 0018 reprend duree, places et prix de l'offre.
          ...(slot.offer_id ? { offer_id: slot.offer_id } : {}),
          ...(slot.reserve_suivi ? { reserve_suivi: true } : {}),
        })),
        // Republier un horaire deja ouvert ne doit pas etre une erreur.
        { onConflict: 'prof_id,start_at', ignoreDuplicates: true },
      )
      .select('*')

    if (error) throw erreur('Ouverture des creneaux', error)
    return (data ?? []).map(
      (slot) => ({ ...slot, offer_id: slot.offer_id ?? null, reserve_suivi: slot.reserve_suivi ?? false, places_prises: 0 }) as AvailabilitySlot,
    )
  },

  async saveOffer(offre, id) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')
    const requete = id
      ? db.from('course_offers').update(offre).eq('id', id).select('*').single()
      : db.from('course_offers').insert({ ...offre, prof_id: utilisateur.user.id }).select('*').single()
    const { data, error } = await requete
    if (error) throw erreur("Enregistrement de l'offre", error)
    return data as CourseOffer
  },

  async deleteOffer(id) {
    const db = requireSupabase()
    const { error } = await db.from('course_offers').delete().eq('id', id)
    if (error) throw erreur("Suppression de l'offre", error)
  },

  async saveProfilProf(profil) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')
    const { error } = await db.from('teachers').update(profil).eq('id', utilisateur.user.id)
    if (error) throw erreur('Enregistrement du profil public', error)
  },

  async getInscrits(slotId) {
    const db = requireSupabase()
    const { data, error } = await db.rpc('inscrits_du_creneau', { creneau: slotId })
    if (error) throw erreur('Lecture des inscrits', error)
    return (data ?? []) as Inscrit[]
  },

  async getLienVisio(slotId) {
    const db = requireSupabase()
    const { data, error } = await db.from('seances_visio').select('lien').eq('slot_id', slotId).maybeSingle()
    if (error) {
      if (['42P01', 'PGRST205'].includes(error.code)) return null
      throw erreur('Lecture du lien de visio', error)
    }
    return (data?.lien as string | undefined) ?? null
  },

  async getProgressionEleve(eleveId) {
    const db = requireSupabase()
    // La RLS (peut_lire_eleve) ne rend des lignes que si l'eleve partage.
    const { data, error } = await db.from('skill_progress').select('*').eq('user_id', eleveId)
    if (error) throw erreur("Lecture de la progression de l'eleve", error)
    if (!data || data.length === 0) return null
    return versProgression(data as LigneProgression[])
  },

  async aUnMotDePasse() {
    const db = requireSupabase()
    const { data } = await db.auth.getUser()
    const fournisseurs = (data.user?.app_metadata?.providers ?? []) as string[]
    return fournisseurs.includes('email')
  },

  async changerMotDePasse(ancien, nouveau) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    const email = utilisateur.user?.email
    if (!email) throw new RepositoryError('Aucune session ouverte')

    // Verifie l'ancien mot de passe en se reconnectant avec : Supabase ne le
    // demande pas pour updateUser, et un telephone laisse deverrouille ne doit
    // pas suffire a prendre le compte.
    const verification = await db.auth.signInWithPassword({ email, password: ancien })
    if (verification.error) {
      throw new RepositoryError(messageAuth(verification.error, 'modification'), verification.error, true)
    }
    const { error } = await db.auth.updateUser({ password: nouveau })
    if (error) throw new RepositoryError(messageAuth(error, 'modification'), error, true)
  },

  async changerEmail(nouvelEmail) {
    const db = requireSupabase()
    const { error } = await db.auth.updateUser(
      { email: nouvelEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/profil` },
    )
    if (error) {
      // Le trigger de 0011 refuse le changement pour un mineur : Supabase Auth
      // le rend comme une erreur de base, sans code utile.
      if (/database error/i.test(error.message)) {
        throw new RepositoryError(
          "Ton email se modifie avec l'accord de ton parent.",
          error,
          true,
        )
      }
      throw new RepositoryError(messageAuth(error, 'modification'), error, true)
    }
  },

  demanderConsentement() {
    return appelerAccord<{ envoye_a: string }>({ action: 'demander_consentement' })
  },

  demanderModification(champ, valeur) {
    return appelerAccord<{ envoye_a: string }>({ action: 'demander_modification', champ, valeur })
  },

  async getModificationsEnAttente() {
    const db = requireSupabase()
    const { data, error } = await db
      .from('modifications_profil')
      .select('id, champ, nouvelle_valeur, email_parent, cree_le, expire_le')
      .is('confirme_le', null)
      .is('annule_le', null)
      .gt('expire_le', new Date().toISOString())
      .order('cree_le', { ascending: false })
    if (error) throw erreur('Lecture des demandes en attente', error)
    return (data ?? []) as ModificationEnAttente[]
  },

  lireAccord(jeton) {
    return appelerAccord<AccordPublic>({ action: 'lire', jeton })
  },

  async repondreAccord(jeton, reponse) {
    const { etat } = await appelerAccord<{ etat: AccordPublic['etat'] }>({ action: reponse, jeton })
    return etat
  },

  async getRappel() {
    const db = requireSupabase()
    // Colonnes nommees : les empreintes de jeton ne sont pas lisibles (0017).
    const { data, error } = await db
      .from('rappels')
      .select('destinataire, pour_parent, heure, etat, motif_arret, pause_jusqu_au')
      .maybeSingle()
    if (error) {
      // Migration 0017 pas encore appliquee : pas de rappel, rien a afficher.
      if (error.code === '42P01' || error.code === 'PGRST205') return null
      throw erreur('Lecture du rappel', error)
    }
    if (!data) return null
    return { ...(data as Rappel), heure: String(data.heure).slice(0, 5) }
  },

  async activerRappel(heure) {
    await appelerRappel({ action: 'activer', heure })
    const rappel = await this.getRappel()
    if (!rappel) throw new RepositoryError('Le rappel n’a pas été enregistré.')
    return rappel
  },

  async reglerRappel(reglage) {
    await appelerRappel({ action: 'regler', ...reglage })
    const rappel = await this.getRappel()
    if (!rappel) throw new RepositoryError('Aucun rappel à régler.', undefined, true)
    return rappel
  },

  async desactiverRappel() {
    await appelerRappel({ action: 'desactiver' })
    return this.getRappel()
  },

  async getMesSuivis() {
    const db = requireSupabase()
    const { data, error } = await db.from('suivis').select('*').order('demande_le', { ascending: false })
    if (error) {
      if (['42P01', 'PGRST205'].includes(error.code)) return []
      throw erreur('Lecture des suivis', error)
    }
    return (data ?? []) as Suivi[]
  },

  async getSuivisProf() {
    const db = requireSupabase()
    const { data, error } = await db.rpc('mes_suivis_prof')
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw erreur('Lecture des élèves suivis', error)
    }
    return (data ?? []) as SuiviProf[]
  },

  async demanderSuivi(profId) {
    const db = requireSupabase()
    const { error } = await db.rpc('demander_suivi', { prof: profId })
    if (error) throw erreur('Demande de suivi', error)
  },

  async repondreSuivi(suiviId, accepte) {
    const db = requireSupabase()
    const { error } = await db.rpc('repondre_suivi', { suivi: suiviId, accepte })
    if (error) throw erreur('Réponse à la demande', error)
  },

  async terminerSuivi(suiviId) {
    const db = requireSupabase()
    const { data, error } = await db.rpc('terminer_suivi', { suivi: suiviId })
    if (error) throw erreur('Fin du suivi', error)
    if (!data) throw new RepositoryError('Ce suivi est déjà terminé.', undefined, true)
  },

  async getMessages(suiviId) {
    const db = requireSupabase()
    const { data, error } = await db
      .from('messages_suivi')
      .select('*')
      .eq('suivi_id', suiviId)
      .order('cree_le', { ascending: true })
    if (error) throw erreur('Lecture des messages', error)
    return (data ?? []) as MessageSuivi[]
  },

  async envoyerMessage(suiviId, texte) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')
    const { data, error } = await db
      .from('messages_suivi')
      .insert({ suivi_id: suiviId, auteur_id: utilisateur.user.id, texte: texte.trim() })
      .select('*')
      .single()
    if (error) throw erreur('Envoi du message', error)
    return data as MessageSuivi
  },

  async signalerMessage(messageId) {
    const db = requireSupabase()
    const { error } = await db.rpc('signaler_message', { message: messageId })
    if (error) throw erreur('Signalement', error)
  },

  async rattacherEnfants() {
    const db = requireSupabase()
    const { data, error } = await db.rpc('rattacher_mes_enfants')
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return 0
      throw erreur('Rattachement des enfants', error)
    }
    return (data as number) ?? 0
  },

  async getEnfants() {
    const db = requireSupabase()
    const { data, error } = await db.rpc('mes_enfants')
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') return []
      throw erreur('Lecture des enfants', error)
    }
    return (data ?? []) as Enfant[]
  },

  async reglerRapport(lienId, actif) {
    const db = requireSupabase()
    const { data, error } = await db.rpc('regler_rapport_hebdo', { lien: lienId, actif })
    if (error) throw erreur('Réglage du résumé hebdomadaire', error)
    if (!data) throw new RepositoryError('Ce lien ne vous est pas rattaché.', undefined, true)
  },

  async getTentativesEleve(eleveId) {
    const db = requireSupabase()
    const { data, error } = await db
      .from('exercise_attempts')
      .select('*')
      .eq('user_id', eleveId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw erreur('Lecture des réponses', error)
    return (data ?? []) as ExerciseAttempt[]
  },

  async getCorrigesParent(skillId) {
    const db = requireSupabase()
    const { data, error } = await db.rpc('corriges_pour_parent', { competence: skillId })
    if (error) throw erreur('Lecture des corrigés', error)
    return (data ?? []) as CorrigeParent[]
  },

  async exporterDonnees(eleveId) {
    const db = requireSupabase()
    // La RLS ne rend que ce que le demandeur a le droit de lire : lui-meme, ou
    // son enfant rattache.
    const tables = [
      'profiles',
      'skill_progress',
      'exercise_attempts',
      'placement_results',
      'flashcard_progress',
      'super_attempts',
      'placement_reponses',
    ] as const
    const resultats = await Promise.all(
      tables.map((t) => db.from(t).select('*').eq(t === 'profiles' ? 'id' : 'user_id', eleveId)),
    )
    const export_: Record<string, unknown> = { exporte_le: new Date().toISOString() }
    tables.forEach((t, i) => {
      export_[t] = resultats[i].error ? { erreur: resultats[i].error.message } : resultats[i].data
    })
    return export_
  },

  async supprimerCompte(eleveId) {
    await appelerParent('supprimer-compte', eleveId
      ? { action: 'enfant', eleve_id: eleveId, confirmation: 'SUPPRIMER' }
      : { action: 'moi', confirmation: 'SUPPRIMER' })
  },

  async lireLienRapport(jeton) {
    return appelerParent<{ actif: boolean; prenom: string }>('rapport-hebdo', { action: 'lire', jeton })
  },

  async desinscrireRapport(jeton) {
    return appelerParent<{ actif: boolean; prenom: string }>('rapport-hebdo', { action: 'desinscrire', jeton })
  },

  async lireLienRappel(jeton) {
    return appelerRappel<RappelPublic>({ action: 'lire', jeton })
  },

  async repondreLienRappel(jeton, reponse) {
    const { etat } = await appelerRappel<{ etat: RappelPublic['etat'] }>({ action: reponse, jeton })
    return etat
  },

  async getCatalog(): Promise<Catalog> {
    const db = requireSupabase()

    const [professeurs, creneaux, offres, rattachements] = await Promise.all([
      db.from('teachers').select('*, profiles!inner(prenom)'),
      // La vue, pas la table : places_prises y est calcule depuis bookings.
      db.from('slots_disponibles').select('*').order('start_at', { ascending: true }),
      db.from('course_offers').select('*').eq('active', true).order('cree_le', { ascending: true }),
      // offer_id n'est pas dans la vue (0001 et 0004 doivent rester rejouables).
      db.from('availability_slots').select('id, offer_id, reserve_suivi'),
    ])

    if (professeurs.error) throw erreur('Lecture des professeurs', professeurs.error)
    if (creneaux.error) throw erreur('Lecture des creneaux', creneaux.error)
    // Migration 0018 pas encore appliquee : ni offre ni rattachement, le
    // catalogue reste celui d'avant.
    const absente = (e: PostgrestError | null) => e !== null && ['42P01', 'PGRST205', '42703'].includes(e.code)
    if (offres.error && !absente(offres.error)) throw erreur('Lecture des offres', offres.error)
    // Avant 0020, reserve_suivi n'existe pas : on relit sans elle.
    let lignes = rattachements.data as { id: string; offer_id?: string | null; reserve_suivi?: boolean }[] | null
    if (rattachements.error && absente(rattachements.error)) {
      const repli = await db.from('availability_slots').select('id, offer_id')
      lignes = repli.error ? [] : (repli.data as { id: string; offer_id: string | null }[])
    }
    const rattache = new Map((lignes ?? []).map((l) => [l.id, l]))

    const teachers: Teacher[] = (professeurs.data ?? []).map((ligne) => {
      const joint = ligne as { profiles?: { prenom?: string } | { prenom?: string }[] }
      const profil = Array.isArray(joint.profiles) ? joint.profiles[0] : joint.profiles
      return {
        id: ligne.id,
        prenom: profil?.prenom ?? ligne.nom_court,
        nom_court: ligne.nom_court,
        titre: ligne.titre,
        note: ligne.note ?? 0,
        nb_cours: ligne.nb_cours,
        domaines: ligne.domaines ?? [],
        experience: ligne.experience ?? '',
        methode: ligne.methode ?? '',
        niveaux: ligne.niveaux ?? [],
        // Avant 0018, aucune verification n'existe : tous visibles comme avant.
        verifie: ligne.verifie_le === undefined ? true : ligne.verifie_le !== null,
      }
    })

    const slots = ((creneaux.data ?? []) as Omit<AvailabilitySlot, 'offer_id' | 'reserve_suivi'>[]).map((slot) => ({
      ...slot,
      offer_id: rattache.get(slot.id)?.offer_id ?? null,
      reserve_suivi: rattache.get(slot.id)?.reserve_suivi ?? false,
    }))
    return { teachers, slots, offers: offres.error ? [] : ((offres.data ?? []) as CourseOffer[]) }
  },

  async getRecette() {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) return { relecteur: false, reviews: [] }

    // Le RLS ne montre au compte que sa propre ligne : presente, il est relecteur.
    const { data: ligne, error } = await db
      .from('content_reviewers')
      .select('user_id')
      .eq('user_id', utilisateur.user.id)
      .maybeSingle()
    // La recette est un outil interne : son absence (migration 0008 pas encore
    // appliquee, par exemple) ne doit jamais empecher un eleve de travailler.
    if (error || !ligne) return { relecteur: false, reviews: [] }

    const { data, error: erreurLecture } = await db
      .from('content_reviews')
      .select(COLONNES_REVIEW)
      .eq('reviewer_id', utilisateur.user.id)
    if (erreurLecture) throw erreur('Lecture des verdicts de recette', erreurLecture)
    return { relecteur: true, reviews: (data ?? []) as ContentReview[] }
  },

  async saveReview(review) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    // Derniere publication : le verdict porte sur cette version du contenu.
    const { data: publication } = await db
      .from('content_publications')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await db
      .from('content_reviews')
      .upsert(
        {
          ...review,
          commentaire: review.commentaire.trim(),
          reviewer_id: utilisateur.user.id,
          publication_id: publication?.id ?? null,
          mis_a_jour_le: new Date().toISOString(),
          // Un verdict change doit etre reporte de nouveau par recette.py.
          traite_le: null,
        },
        { onConflict: 'reviewer_id,item_type,item_id' },
      )
      .select(COLONNES_REVIEW)
      .single()

    if (error) throw erreur('Enregistrement du verdict', error)
    return data as ContentReview
  },
}

const COLONNES_REVIEW = 'item_type, item_id, verdict, commentaire, mis_a_jour_le, traite_le'
