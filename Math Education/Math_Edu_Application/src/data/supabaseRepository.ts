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

import type { PostgrestError } from '@supabase/supabase-js'

import { requireSupabase } from '@/lib/supabase'
import { emptyProgress, type ProgressMap } from '@/lib/dag'
import { skills } from '@/content'
import { assurerContenu, chargerContenuSupabase } from '@/content/chargement'
import {
  RepositoryError,
  type Catalog,
  type DataRepository,
  type NewSlot,
  type ProfileCompletion,
  type Session,
} from './repository'
import type {
  AvailabilitySlot,
  Booking,
  ExerciseAttempt,
  PlacementResult,
  Profile,
  SkillProgress,
  Teacher,
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
  partage_progression_prof: boolean
  resume_hebdo_parent: boolean
  rappels_revision: boolean
  abonnement: Profile['abonnement']
  cree_le: string
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
    cree_le: ligne.cree_le,
    partage_progression_prof: ligne.partage_progression_prof,
    resume_hebdo_parent: ligne.resume_hebdo_parent,
    rappels_revision: ligne.rappels_revision,
    abonnement: ligne.abonnement,
  }
}

type LigneProgression = SkillProgress & { user_id: string }

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
  const [, profil, progression, tentatives, positionnement, reservations] = await Promise.all([
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
  ])

  if (profil.error) throw erreur('Lecture du profil', profil.error)
  // Le trigger cree le profil a l'inscription. Absent ici, c'est que le trigger
  // n'a pas ete installe : la migration n'a pas tourne.
  if (!profil.data) return null
  if (progression.error) throw erreur('Lecture de la progression', progression.error)
  if (tentatives.error) throw erreur('Lecture des tentatives', tentatives.error)
  if (positionnement.error) throw erreur('Lecture du positionnement', positionnement.error)
  if (reservations.error) throw erreur('Lecture des reservations', reservations.error)

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
  }
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
      throw new RepositoryError('Adresse ou mot de passe incorrect.', error)
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
    if (error) throw erreur('Creation du compte', error)

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

  async saveAttempt(attempt: ExerciseAttempt, progress: SkillProgress) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')
    const userId = utilisateur.user.id

    // Deux ecritures, et deux seulement : une ligne de progression, une
    // tentative. C'est tout l'objet du passage aux mutations granulaires.
    const [progression, tentative] = await Promise.all([
      db.from('skill_progress').upsert({ ...progress, user_id: userId }, { onConflict: 'user_id,skill_id' }),
      db.from('exercise_attempts').insert({
        id: attempt.id,
        user_id: userId,
        exercise_id: attempt.exercise_id,
        skill_id: attempt.skill_id,
        answer: attempt.answer,
        is_correct: attempt.is_correct,
        duration_s: attempt.duration_s,
        created_at: attempt.created_at,
      }),
    ])

    if (progression.error) throw erreur('Enregistrement de la progression', progression.error)
    if (tentative.error) throw erreur('Enregistrement de la tentative', tentative.error)
  },

  async saveProgress(progress: SkillProgress) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')

    const { error } = await db
      .from('skill_progress')
      .upsert({ ...progress, user_id: utilisateur.user.id }, { onConflict: 'user_id,skill_id' })

    if (error) throw erreur('Enregistrement de la revision', error)
  },

  async savePlacement(result: PlacementResult, progress: SkillProgress[]) {
    const db = requireSupabase()
    const { data: utilisateur } = await db.auth.getUser()
    if (!utilisateur.user) throw new RepositoryError('Aucune session ouverte')
    const userId = utilisateur.user.id

    const { error: erreurResultat } = await db.from('placement_results').insert({
      user_id: userId,
      questions_posees: result.questions_posees,
      competences_maitrisees: result.competences_maitrisees,
      competences_totales: result.competences_totales,
      lacunes_racines: result.lacunes_racines,
      objectif_skill_id: result.objectif_skill_id,
      estimation_semaines: result.estimation_semaines,
    })
    if (erreurResultat) throw erreur('Enregistrement du positionnement', erreurResultat)

    // Seules les competences reellement evaluees sont ecrites. Poser les 38
    // lignes dont 30 vides remplirait la base de bruit, et le convertisseur
    // comble les absentes a la lecture.
    const aEcrire = progress.filter(
      (ligne) => ligne.status !== 'locked' || ligne.attempts > 0,
    )
    if (aEcrire.length === 0) return

    const { error } = await db
      .from('skill_progress')
      .upsert(
        aEcrire.map((ligne) => ({ ...ligne, user_id: userId })),
        { onConflict: 'user_id,skill_id' },
      )
    if (error) throw erreur('Enregistrement de la progression initiale', error)
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
        })),
        // Republier un horaire deja ouvert ne doit pas etre une erreur.
        { onConflict: 'prof_id,start_at', ignoreDuplicates: true },
      )
      .select('*')

    if (error) throw erreur('Ouverture des creneaux', error)
    return (data ?? []).map((slot) => ({ ...slot, places_prises: 0 }) as AvailabilitySlot)
  },

  async getCatalog(): Promise<Catalog> {
    const db = requireSupabase()

    const [professeurs, creneaux] = await Promise.all([
      db.from('teachers').select('*, profiles!inner(prenom)'),
      // La vue, pas la table : places_prises y est calcule depuis bookings.
      db.from('slots_disponibles').select('*').order('start_at', { ascending: true }),
    ])

    if (professeurs.error) throw erreur('Lecture des professeurs', professeurs.error)
    if (creneaux.error) throw erreur('Lecture des creneaux', creneaux.error)

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
      }
    })

    return { teachers, slots: (creneaux.data ?? []) as AvailabilitySlot[] }
  },
}
