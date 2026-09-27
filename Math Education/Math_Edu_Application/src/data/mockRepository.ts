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
import {
  RepositoryError,
  type Catalog,
  type DataRepository,
  type NewSlot,
  type ProfileCompletion,
  type Session,
  type SignUpInput,
} from './repository'
import type { AvailabilitySlot, Booking, Profile } from '@/types/domain'

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
 * Adresses reconnues par la connexion de demonstration. Le mot de passe n'est
 * pas verifie : c'est une maquette, pas un systeme d'authentification, et il ne
 * faut surtout pas laisser croire le contraire.
 */
const COMPTES_DEMO = ['lea.d@email.fr', 'marc.b@email.fr'] as const

function profileFromSignUp(input: SignUpInput): Profile {
  const now = new Date().toISOString()
  return {
    id: `local-${newId()}`,
    role: input.role,
    prenom: input.prenom.trim(),
    nom: input.nom.trim(),
    email: input.email.trim(),
    niveau_scolaire: input.niveau_scolaire,
    date_naissance: input.date_naissance,
    email_parent: input.email_parent?.trim() || null,
    // Le consentement n'est pas acquis a la case cochee : le parent doit
    // confirmer par email. Tant qu'il ne l'a pas fait, la date reste nulle et
    // l'application affiche le bandeau "en attente".
    consentement_parental_at: null,
    cree_le: now,
    partage_progression_prof: true,
    resume_hebdo_parent: Boolean(input.email_parent),
    rappels_revision: true,
    abonnement: null,
  }
}

function reviveSession(raw: string): Session | null {
  try {
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.profile?.id) return null
    // Une session persistee avant l'ajout d'un champ ne doit pas casser l'app.
    return { ...parsed, attempts: parsed.attempts ?? [], bookings: parsed.bookings ?? [] }
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
    const adresse = email.trim().toLowerCase()
    if (!COMPTES_DEMO.includes(adresse as (typeof COMPTES_DEMO)[number])) {
      throw new RepositoryError('Adresse inconnue en mode demonstration.')
    }

    const snapshot =
      adresse === 'marc.b@email.fr'
        ? buildNewAccountSnapshot(profMarcProfile)
        : buildLeaSnapshot()

    courante = { ...snapshot, attempts: [] }
    persister()
    notifier()
    return wait(courante)
  },

  async signUp(input) {
    courante = { ...buildNewAccountSnapshot(profileFromSignUp(input)), attempts: [] }
    persister()
    notifier()
    return wait(courante)
  },

  async signOut() {
    courante = null
    persister()
    notifier()
    await wait(undefined)
  },

  async completeProfile(completion: ProfileCompletion) {
    const session = exigerSession()
    const profile: Profile = { ...session.profile, ...completion }
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
      throw new RepositoryError('Ce creneau est deja reserve.')
    }

    const cat = catalogueCourant()
    const slot = cat.slots.find((s) => s.id === slotId)
    if (!slot) throw new RepositoryError('Creneau introuvable.')
    // Meme refus que le trigger SQL : la capacite est une regle, pas un affichage.
    if (slot.places_prises >= slot.capacite) {
      throw new RepositoryError('Creneau complet.')
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

  async getCatalog() {
    return wait(catalogueCourant())
  },
}

/** Remet le mock a zero. Reserve aux tests. */
export function resetMockRepository() {
  courante = null
  catalogue = null
  abonnes.clear()
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // sans importance
  }
}
