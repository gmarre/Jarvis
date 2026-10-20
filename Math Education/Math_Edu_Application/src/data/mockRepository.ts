// Implementation factice du repository, adossee a `src/mocks/mockData.ts`.
//
// Elle reste utile apres le branchement de Supabase, pour deux raisons : faire
// une demonstration sans reseau ni compte, et servir de specification executable
// du contrat (voir mockRepository.test.ts). Elle implemente donc exactement la
// meme interface que le repository Supabase, mutations granulaires comprises.
//
// La session est persistee dans le localStorage pour qu'un rechargement de page
// ne fasse pas perdre la demonstration en cours. Rien de sensible n'y transite :
// aucun mot de passe n'est conserve.

import {
  buildCatalog,
  buildLeaSnapshot,
  buildNewAccountSnapshot,
  profMarcProfile,
} from '@/mocks/mockData'
import { emptyProgress } from '@/lib/dag'
import { newId } from '@/lib/id'
import { skills } from '@/content'
import { assurerContenu, chargerContenuLocal, versContenuPublic } from '@/content/chargement'
import { checkAnswer } from '@/lib/exercise'
import { MINIMUM_AGE_WITHOUT_CONSENT, ageFrom, estMineur } from '@/lib/age'
import { verifierValeur } from '../../supabase/functions/_shared/accord'
import { idQuestionSuper, type Exercise } from '@/types/content'
import {
  RepositoryError,
  type Catalog,
  type DataRepository,
  type NewSlot,
  type ProfileCompletion,
  type Session,
  type SignUpInput,
} from './repository'
import type {
  AvailabilitySlot,
  Booking,
  ContentReview,
  ModificationEnAttente,
  Profile,
  Rappel,
  CourseOffer,
} from '@/types/domain'

const STORAGE_KEY = 'racine.session.v2'

/**
 * Latence simulee : les ecrans doivent gerer un etat de chargement reel.
 * Annulee sous test, ou elle ne ferait que ralentir la suite.
 */
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 180

function wait<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * Banque complete, reponses comprises : elle joue le role du serveur pour la
 * correction. Les ecrans, eux, ne recoivent que la version publique, comme en
 * production.
 */
const banqueComplete = new Map<string, Exercise>()

async function chargerDemonstration() {
  const local = await chargerContenuLocal()
  for (const exercise of local.exercises) banqueComplete.set(exercise.id, exercise)
  // Les questions des super exercices se corrigent comme des exercices, sous
  // l'identifiant « SX-...#q1 », comme le fait l'Edge Function.
  for (const sx of local.superExercises) {
    for (const q of sx.questions) {
      banqueComplete.set(idQuestionSuper(sx.id, q.key), {
        id: idQuestionSuper(sx.id, q.key),
        skill_id: q.skill_id,
        level: 'maitrise',
        type: q.type,
        statement: q.statement,
        image: null,
        ...(q.choices ? { choices: q.choices } : {}),
        answer: q.answer,
        solution_steps: q.solution_steps,
        hint: q.hint ?? null,
        estimated_duration_s: 0,
        review_status: sx.review_status,
        programme_ref: sx.programme_ref,
      })
    }
  }
  return versContenuPublic(local)
}

/**
 * Contenu de la demonstration : les JSON locaux, importes a la demande (chunk a
 * part). Comme en production, toute session rendue le trouve installe.
 */
function contenu(): Promise<void> {
  return assurerContenu(chargerDemonstration)
}

/**
 * Adresses reconnues par la connexion de demonstration. Le mot de passe n'est
 * pas verifie : c'est une maquette, pas un systeme d'authentification, et il ne
 * faut surtout pas laisser croire le contraire.
 */
const COMPTES_DEMO = ['lea.d@email.fr', 'marc.b@email.fr'] as const

/** Rappel simule du mode demonstration (aucun email ne part). */
let rappelMock: Rappel | null = null

function profileFromSignUp(input: SignUpInput): Profile {
  const now = new Date().toISOString()
  return {
    id: `local-${newId()}`,
    role: input.role,
    prenom: input.prenom.trim(),
    nom: '',
    email: input.email.trim(),
    // Comme en production : l'inscription ne porte que l'identite, le reste se
    // complete sur /bienvenue.
    niveau_scolaire: null,
    date_naissance: null,
    email_parent: null,
    consentement_parental_at: null,
    // Inscription par email : le role vient du formulaire, il est fixe.
    role_choisi_le: now,
    cree_le: now,
    partage_progression_prof: true,
    resume_hebdo_parent: false,
    rappels_revision: false,
    abonnement: null,
    chemins_choisis: [],
    rythme_jours: 3,
    jours_travail: [],
  }
}

function reviveSession(raw: string): Session | null {
  try {
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.profile?.id) return null
    // Une session persistee avant l'ajout d'un champ ne doit pas casser l'app.
    return {
      ...parsed,
      attempts: parsed.attempts ?? [],
      bookings: parsed.bookings ?? [],
      defis: parsed.defis ?? {},
      superAttempts: parsed.superAttempts ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Etat en memoire, miroir du localStorage.
 *
 * Contrairement a l'ancienne version, les mutations ecrivent ici entite par
 * entite : le mock se comporte comme la base, ce qui evite qu'un bug
 * n'apparaisse qu'en production.
 */
let courante: Session | null = null
let catalogue: Catalog | null = null
/** Demandes soumises au parent, en memoire seulement (aucun email ne part). */
let modifications: ModificationEnAttente[] = []
/**
 * Recette en demonstration : desactivee, comme pour tout compte qui n'est pas
 * inscrit dans content_reviewers. Les tests l'activent (activerRecetteMock).
 */
let relecteurMock = false
let verdicts: ContentReview[] = []
const abonnes = new Set<(session: Session | null) => void>()

function notifier() {
  for (const abonne of abonnes) abonne(courante)
}

function persister() {
  try {
    if (courante) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courante))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Navigation privee, stockage refuse : la demonstration continue en memoire.
  }
}

/** Session courante garantie, pour les mutations. */
function exigerSession(): Session {
  if (!courante) throw new RepositoryError('Aucune session ouverte')
  return courante
}

function catalogueCourant(): Catalog {
  if (!catalogue) catalogue = buildCatalog()
  return catalogue
}

/** Recalcule les places prises depuis les reservations, comme le fait la vue SQL. */
function recalculerPlaces(slots: AvailabilitySlot[], bookings: Booking[]): AvailabilitySlot[] {
  return slots.map((slot) => ({
    ...slot,
    places_prises: bookings.filter((b) => b.slot_id === slot.id).length,
  }))
}

export const mockRepository: DataRepository = {
  async getSession() {
    await contenu()
    if (!courante) {
      const raw = (() => {
        try {
          return window.localStorage.getItem(STORAGE_KEY)
        } catch {
          return null
        }
      })()
      courante = raw ? reviveSession(raw) : null
    }
    return wait(courante)
  },

  onAuthChange(handler) {
    abonnes.add(handler)
    return () => abonnes.delete(handler)
  },

  async signInWithGoogle() {
    throw new RepositoryError(
      "La connexion Google demande le backend. Utilise l'entree de demonstration.",
    )
  },

  async signInWithPassword(email) {
    await contenu()
    const adresse = email.trim().toLowerCase()
    if (!COMPTES_DEMO.includes(adresse as (typeof COMPTES_DEMO)[number])) {
      throw new RepositoryError('Adresse inconnue en mode demonstration.')
    }

    const snapshot =
      adresse === 'marc.b@email.fr'
        ? buildNewAccountSnapshot(profMarcProfile)
        : buildLeaSnapshot()

    courante = { ...snapshot, attempts: [], defis: {}, superAttempts: [] }
    persister()
    notifier()
    return wait(courante)
  },

  async signUp(input) {
    await contenu()
    courante = { ...buildNewAccountSnapshot(profileFromSignUp(input)), attempts: [], defis: {}, superAttempts: [] }
    persister()
    notifier()
    return wait(courante)
  },

  async resendConfirmation() {
    // Aucun email en mode demonstration : l'inscription y ouvre la session.
    await wait(undefined)
  },

  async signOut() {
    courante = null
    persister()
    notifier()
    await wait(undefined)
  },

  async corriger(exerciseId, reponse) {
    // Le contenu peut avoir ete installe par un autre chemin (tests) : la
    // banque se charge alors ici, une fois.
    if (banqueComplete.size === 0) await chargerDemonstration()
    const exercise = banqueComplete.get(exerciseId)
    if (!exercise) throw new RepositoryError(`Exercice inconnu : ${exerciseId}`)
    return wait(checkAnswer(exercise, reponse))
  },

  async completeProfile(completion: ProfileCompletion) {
    const session = exigerSession()
    // Meme regle que le trigger de la migration 0010 : le role ne se choisit
    // qu'une fois, et la completion du profil fige ce choix.
    if (session.profile.role_choisi_le !== null && completion.role !== session.profile.role) {
      throw new RepositoryError('Le role ne se modifie pas depuis le client', undefined, true)
    }
    const profile: Profile = {
      ...session.profile,
      ...completion,
      role_choisi_le: session.profile.role_choisi_le ?? new Date().toISOString(),
    }
    courante = { ...session, profile }
    persister()
    notifier()
    return wait(profile)
  },

  async updateProfile(patch) {
    const session = exigerSession()
    const profile: Profile = { ...session.profile, ...patch }
    courante = { ...session, profile }
    persister()
    notifier()
    return wait(profile)
  },

  async saveAttempt(attempt, progress) {
    const session = exigerSession()
    courante = {
      ...session,
      progress: { ...session.progress, [progress.skill_id]: progress },
      attempts: [attempt, ...session.attempts],
    }
    persister()
    await wait(undefined)
  },

  async saveProgress(progress) {
    const session = exigerSession()
    courante = {
      ...session,
      progress: { ...session.progress, [progress.skill_id]: progress },
    }
    persister()
    await wait(undefined)
  },

  async saveDefi(progress) {
    const session = exigerSession()
    courante = { ...session, defis: { ...session.defis, [progress.card_id]: progress } }
    persister()
    await wait(undefined)
  },

  async saveSuperAttempt(attempt) {
    const session = exigerSession()
    courante = { ...session, superAttempts: [attempt, ...session.superAttempts] }
    persister()
    await wait(undefined)
  },

  async savePlacement(result, progress) {
    const session = exigerSession()
    const carte = { ...session.progress }
    for (const skill of skills) carte[skill.id] = carte[skill.id] ?? emptyProgress(skill.id)
    for (const ligne of progress) carte[ligne.skill_id] = ligne

    courante = {
      ...session,
      placement: result,
      objectifSkillId: result.objectif_skill_id,
      progress: carte,
    }
    persister()
    await wait(undefined)
  },

  async createBooking(slotId, skillId) {
    const session = exigerSession()
    if (session.bookings.some((b) => b.slot_id === slotId)) {
      throw new RepositoryError('Tu as déjà réservé ce créneau.', undefined, true)
    }

    const cat = catalogueCourant()
    const slot = cat.slots.find((s) => s.id === slotId)
    if (!slot) throw new RepositoryError('Creneau introuvable.')
    // Meme refus que le trigger SQL : la capacite est une regle, pas un affichage.
    if (slot.places_prises >= slot.capacite) {
      throw new RepositoryError(
        'Ce créneau est complet : la dernière place vient d’être prise.',
        undefined,
        true,
      )
    }

    const booking: Booking = {
      id: newId(),
      slot_id: slotId,
      eleve_id: session.profile.id,
      skill_id: skillId,
      cree_le: new Date().toISOString(),
      paid_at: null,
    }

    const bookings = [...session.bookings, booking]
    courante = { ...session, bookings }
    catalogue = { ...cat, slots: recalculerPlaces(cat.slots, bookings) }
    persister()
    return wait(booking)
  },

  async deleteBooking(bookingId) {
    const session = exigerSession()
    const bookings = session.bookings.filter((b) => b.id !== bookingId)
    courante = { ...session, bookings }

    const cat = catalogueCourant()
    catalogue = { ...cat, slots: recalculerPlaces(cat.slots, bookings) }
    persister()
    await wait(undefined)
  },

  async createSlots(slots: NewSlot[]) {
    const cat = catalogueCourant()
    const crees: AvailabilitySlot[] = slots.map((slot) => ({
      ...slot,
      offer_id: slot.offer_id ?? null,
      id: newId(),
      places_prises: 0,
    }))

    // Un professeur ne peut pas ouvrir deux fois le meme horaire, comme la
    // contrainte unique (prof_id, start_at) en base.
    const nouveaux = crees.filter(
      (slot) =>
        !cat.slots.some((s) => s.prof_id === slot.prof_id && s.start_at === slot.start_at),
    )

    catalogue = { ...cat, slots: [...cat.slots, ...nouveaux] }
    return wait(nouveaux)
  },

  async aUnMotDePasse() {
    exigerSession()
    return wait(true)
  },

  async changerMotDePasse(ancien, nouveau) {
    exigerSession()
    // Aucun mot de passe n'est conserve en demonstration : on ne verifie que
    // ce que l'ecran doit deja garantir.
    if (!ancien || !nouveau) throw new RepositoryError('Mot de passe manquant', undefined, true)
    await wait(undefined)
  },

  async changerEmail(nouvelEmail) {
    const session = exigerSession()
    if (estMineur(session.profile.date_naissance)) {
      throw new RepositoryError("Ton email se modifie avec l'accord de ton parent.", undefined, true)
    }
    // Pas d'email en demonstration : l'adresse change tout de suite.
    const profile = { ...session.profile, email: nouvelEmail.trim() }
    courante = { ...session, profile }
    persister()
    notifier()
    await wait(undefined)
  },

  async demanderConsentement() {
    const { profile } = exigerSession()
    if (profile.consentement_parental_at) {
      throw new RepositoryError('Ton parent a déjà donné son accord.', undefined, true)
    }
    if (!profile.email_parent) {
      throw new RepositoryError("Indique d'abord l'email d'un parent.", undefined, true)
    }
    const age = profile.date_naissance ? ageFrom(profile.date_naissance) : null
    if (age === null || age >= MINIMUM_AGE_WITHOUT_CONSENT) {
      throw new RepositoryError("L'accord d'un parent n'est demandé qu'avant 15 ans.", undefined, true)
    }
    return wait({ envoye_a: profile.email_parent })
  },

  async demanderModification(champ, valeur) {
    const { profile } = exigerSession()
    const invalide = verifierValeur(champ, valeur.trim())
    if (invalide) throw new RepositoryError(invalide, undefined, true)
    if (!estMineur(profile.date_naissance)) {
      throw new RepositoryError("Pas besoin de l'accord d'un parent : modifie-le directement.", undefined, true)
    }
    if (!profile.email_parent) {
      throw new RepositoryError("Indique d'abord l'email d'un parent.", undefined, true)
    }
    const maintenant = new Date()
    modifications = [
      {
        id: newId(),
        champ,
        nouvelle_valeur: valeur.trim(),
        email_parent: profile.email_parent,
        cree_le: maintenant.toISOString(),
        expire_le: new Date(maintenant.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
      },
      // Une seule demande en cours par champ, comme le serveur.
      ...modifications.filter((m) => m.champ !== champ),
    ]
    return wait({ envoye_a: profile.email_parent })
  },

  async getModificationsEnAttente() {
    exigerSession()
    return wait([...modifications])
  },

  async lireAccord() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  // Rappels : en demonstration, aucun email ne part ; l'etat est simule pour
  // montrer l'ecran, et l'ecran dit que rien n'est envoye (mode demo).
  async getRappel() {
    exigerSession()
    return wait(rappelMock)
  },

  async activerRappel(heure) {
    const session = exigerSession()
    if (session.profile.jours_travail.length === 0) {
      throw new RepositoryError('Choisis d’abord tes jours de travail : le rappel ne part que ces jours-là.', undefined, true)
    }
    const naissance = session.profile.date_naissance
    const age = naissance ? ageFrom(naissance) : null
    const pourParent = age !== null && age < MINIMUM_AGE_WITHOUT_CONSENT
    rappelMock = {
      destinataire: pourParent ? (session.profile.email_parent ?? '') : session.profile.email,
      pour_parent: pourParent,
      heure,
      etat: pourParent ? 'en_attente' : 'actif',
      motif_arret: null,
      pause_jusqu_au: null,
    }
    return wait(rappelMock)
  },

  async reglerRappel(reglage) {
    exigerSession()
    if (!rappelMock) throw new RepositoryError('Aucun rappel à régler.', undefined, true)
    rappelMock = { ...rappelMock, ...reglage }
    return wait(rappelMock)
  },

  async desactiverRappel() {
    exigerSession()
    if (rappelMock) rappelMock = { ...rappelMock, etat: 'arrete', motif_arret: 'eleve' }
    return wait(rappelMock)
  },

  async saveOffer(offre, id) {
    const session = exigerSession()
    const cat = catalogueCourant()
    const enregistree: CourseOffer = { ...offre, id: id ?? newId(), prof_id: session.profile.id }
    catalogue = {
      ...cat,
      offers: id ? cat.offers.map((o) => (o.id === id ? enregistree : o)) : [...cat.offers, enregistree],
    }
    persister()
    return wait(enregistree)
  },

  async deleteOffer(id) {
    exigerSession()
    const cat = catalogueCourant()
    catalogue = {
      ...cat,
      offers: cat.offers.filter((o) => o.id !== id),
      slots: cat.slots.map((s) => (s.offer_id === id ? { ...s, offer_id: null } : s)),
    }
    persister()
    await wait(undefined)
  },

  async saveProfilProf(profil) {
    const session = exigerSession()
    const cat = catalogueCourant()
    catalogue = { ...cat, teachers: cat.teachers.map((t) => (t.id === session.profile.id ? { ...t, ...profil } : t)) }
    persister()
    await wait(undefined)
  },

  async getInscrits(slotId) {
    const session = exigerSession()
    // Demonstration : les inscrits sont les reservations simulees, nommees.
    return wait(
      session.bookings
        .filter((b) => b.slot_id === slotId)
        .map((b) => ({ eleve_id: b.eleve_id, prenom: b.eleve_id === 'eleve-lea' ? 'Léa' : 'Élève', partage: true, skill_id: b.skill_id })),
    )
  },

  async getLienVisio(slotId) {
    exigerSession()
    // Un lien fictif : en demonstration, aucune salle n'est reservee.
    return wait(`https://meet.jit.si/Racine-demo-${slotId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}`)
  },

  async getProgressionEleve() {
    exigerSession()
    return wait(null)
  },

  // Espace parent : en demonstration, aucun enfant n'est rattache.
  async rattacherEnfants() {
    exigerSession()
    return wait(0)
  },

  async getEnfants() {
    exigerSession()
    return wait([])
  },

  async reglerRapport() {
    throw new RepositoryError('Aucun enfant rattaché en mode démonstration.', undefined, true)
  },

  async getTentativesEleve(eleveId) {
    const session = exigerSession()
    return wait(eleveId === session.profile.id ? session.attempts : [])
  },

  async getCorrigesParent() {
    exigerSession()
    return wait([])
  },

  async exporterDonnees(eleveId) {
    const session = exigerSession()
    if (eleveId !== session.profile.id) return wait({})
    return wait({
      exporte_le: new Date().toISOString(),
      profiles: [session.profile],
      skill_progress: Object.values(session.progress),
      exercise_attempts: session.attempts,
      placement_results: session.placement ? [session.placement] : [],
      flashcard_progress: Object.values(session.defis),
      super_attempts: session.superAttempts,
    })
  },

  async supprimerCompte() {
    exigerSession()
    // Demonstration : rien n'est stocke hors du navigateur ; on repart de zero.
    courante = null
    persister()
    await wait(undefined)
  },

  async lireLienRapport() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  async desinscrireRapport() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  async lireLienRappel() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  async repondreLienRappel() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  async repondreAccord() {
    throw new RepositoryError("Aucun lien n'est envoyé en mode démonstration.", undefined, true)
  },

  async getCatalog() {
    return wait(catalogueCourant())
  },

  async getRecette() {
    return wait({ relecteur: relecteurMock, reviews: relecteurMock ? [...verdicts] : [] })
  },

  async saveReview(review) {
    exigerSession()
    if (!relecteurMock) throw new RepositoryError("Ce compte n'est pas relecteur.", undefined, true)
    const commentaire = review.commentaire.trim()
    // Meme regle que la contrainte SQL invalide_avec_commentaire.
    if (review.verdict === 'invalide' && commentaire === '') {
      throw new RepositoryError('Un refus doit dire ce qui ne va pas.', undefined, true)
    }
    const enregistre: ContentReview = {
      ...review,
      commentaire,
      mis_a_jour_le: new Date().toISOString(),
      traite_le: null,
    }
    verdicts = [
      ...verdicts.filter((v) => !(v.item_type === review.item_type && v.item_id === review.item_id)),
      enregistre,
    ]
    return wait(enregistre)
  },
}

/** Fait du compte de demonstration un relecteur. Reserve aux tests. */
export function activerRecetteMock() {
  relecteurMock = true
}

/** Remet le mock a zero. Reserve aux tests. */
export function resetMockRepository() {
  courante = null
  modifications = []
  catalogue = null
  relecteurMock = false
  verdicts = []
  abonnes.clear()
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // sans importance
  }
}
