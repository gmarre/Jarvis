// Implementation factice du repository, adossee a `src/mocks/mockData.ts`.
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
import type { Catalog, DataRepository, Session, SignUpInput } from './repository'
import type { Profile } from '@/types/domain'

const STORAGE_KEY = 'racine.session.v1'

/** Latence simulee : les ecrans doivent gerer un etat de chargement reel. */
const LATENCY_MS = 240

function wait<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function profileFromSignUp(input: SignUpInput): Profile {
  const now = new Date().toISOString()
  return {
    id: `local-${Date.now()}`,
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
    return parsed
  } catch {
    return null
  }
}

export const mockRepository: DataRepository = {
  async signInDemo() {
    const snapshot = buildLeaSnapshot()
    return wait({ ...snapshot, attempts: [] })
  },

  async signUp(input) {
    const snapshot = buildNewAccountSnapshot(profileFromSignUp(input))
    return wait({ ...snapshot, attempts: [] })
  },

  async signInTeacher() {
    const snapshot = buildNewAccountSnapshot(profMarcProfile)
    return wait({ ...snapshot, attempts: [] })
  },

  async restore() {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? reviveSession(raw) : null
  },

  async save(session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  },

  async clear() {
    window.localStorage.removeItem(STORAGE_KEY)
  },

  async getCatalog(): Promise<Catalog> {
    return wait(buildCatalog())
  },
}
