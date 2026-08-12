// Donnees factices, isolees dans ce seul fichier.
//
// Regle posee dans le brief design : aucun composant ne contient de donnee en
// dur. Le jour ou Supabase remplace le repository mock, ce fichier disparait
// sans toucher a un seul ecran.
//
// L'histoire simulee s'appuie sur le vrai contenu (`src/content`) :
// Lea, 4e, bloque sur la simplification de fractions (C007, son niveau).
// En remontant le DAG, la cause n'est pas en 4e : c'est le sens du
// denominateur (C003), vu en CE1. C'est exactement la promesse du produit.

import { skills } from '@/content'
import { addDays, startOfWeek } from '@/lib/format'
import { emptyProgress, nextReviewDate } from '@/lib/dag'
import type { ProgressMap } from '@/lib/dag'
import type {
  AvailabilitySlot,
  Booking,
  PlacementResult,
  Profile,
  SkillProgress,
  Teacher,
} from '@/types/domain'

/** Competence visee par Lea : celle vue en classe en ce moment. */
export const OBJECTIF_SKILL_ID = 'C007'

/** Competences maitrisees par Lea au moment ou elle arrive sur l'application. */
const MASTERED = [
  'A001',
  'A002',
  'A003',
  'A004',
  'A005',
  'A006',
  'A007',
  'A008',
  'A009',
  'A011',
  'B001',
  'B005',
  'B006',
  'C001',
  'C002',
]

/**
 * Competences deja commencees sans etre acquises. A010 et C003 ont tous leurs
 * prerequis acquis : ce sont les deux lacunes racines de Lea.
 */
const IN_PROGRESS: Record<string, boolean[]> = {
  // Fenetre des dernieres tentatives. Seuil de C003 : 2 reussites sur 3, Lea
  // arrive donc avec un echec au compteur et tout reste a faire.
  C003: [false],
  A010: [false],
}

/**
 * Competences maitrisees dont la revision tombe aujourd'hui. Le rang Leitner
 * donne l'echeance suivante : J+1, J+3, J+7 puis J+21.
 */
const DUE_TODAY: Record<string, number> = {
  C001: 2,
  C002: 1,
  A009: 3,
  A011: 4,
}

function buildProgress(now: Date): ProgressMap {
  const progress: ProgressMap = {}
  const today = new Date(now)
  today.setHours(6, 0, 0, 0)

  for (const skill of skills) {
    const isMastered = MASTERED.includes(skill.id)
    const started = IN_PROGRESS[skill.id]

    if (isMastered) {
      const box = DUE_TODAY[skill.id]
      const { required, out_of: outOf } = skill.mastery_threshold
      progress[skill.id] = {
        skill_id: skill.id,
        status: 'mastered',
        recent: Array.from({ length: outOf }, (_, index) => index < required),
        score: required,
        attempts: outOf,
        review_box: box ?? 4,
        // Sans echeance du jour, la carte a ete revue recemment : on projette
        // la prochaine revision dans le futur pour ne pas polluer le rappel.
        next_review_at: box ? today.toISOString() : nextReviewDate(4, now).toISOString(),
        updated_at: addDays(now, -3).toISOString(),
      }
      continue
    }

    if (started) {
      progress[skill.id] = {
        skill_id: skill.id,
        status: 'in_progress',
        recent: started,
        score: started.filter(Boolean).length,
        attempts: started.length,
        review_box: 0,
        next_review_at: null,
        updated_at: addDays(now, -1).toISOString(),
      }
      continue
    }

    progress[skill.id] = emptyProgress(skill.id)
  }

  return progress
}

export const teachers: Teacher[] = [
  {
    id: 'prof-marc',
    prenom: 'Marc',
    nom_court: 'Marc B.',
    titre: 'Professeur agrégé',
    note: 4.9,
    nb_cours: 128,
    domaines: ['C', 'A'],
  },
  {
    id: 'prof-sarah',
    prenom: 'Sarah',
    nom_court: 'Sarah K.',
    titre: 'Professeure certifiée',
    note: 4.8,
    nb_cours: 94,
    domaines: ['B', 'A'],
  },
  {
    id: 'prof-ines',
    prenom: 'Inès',
    nom_court: 'Inès R.',
    titre: 'Étudiante agrégative',
    note: 4.7,
    nb_cours: 41,
    domaines: ['C'],
  },
]

/**
 * Creneaux de la semaine en cours, generes a partir de la date du jour : une
 * date en dur donnerait un calendrier vide des la semaine suivante.
 */
function buildSlots(now: Date): AvailabilitySlot[] {
  const monday = startOfWeek(now)
  const slots: AvailabilitySlot[] = []

  // [jour depuis lundi, heure, professeur, places deja prises]
  const grid: [number, number, string, number][] = [
    [0, 15, 'prof-marc', 0],
    [0, 17, 'prof-sarah', 1],
    [1, 14, 'prof-marc', 3],
    [1, 16, 'prof-ines', 0],
    [3, 14, 'prof-marc', 1],
    [3, 16, 'prof-sarah', 0],
    [3, 18, 'prof-ines', 2],
    [4, 15, 'prof-marc', 0],
    [4, 16, 'prof-ines', 1],
    [4, 18, 'prof-sarah', 0],
    [5, 14, 'prof-marc', 3],
    [5, 15, 'prof-sarah', 3],
  ]

  for (const [dayOffset, hour, profId, taken] of grid) {
    const start = addDays(monday, dayOffset)
    start.setHours(hour, 0, 0, 0)
    const teacher = teachers.find((t) => t.id === profId)
    slots.push({
      id: `slot-${dayOffset}-${hour}-${profId}`,
      prof_id: profId,
      start_at: start.toISOString(),
      duree_min: 90,
      capacite: 3,
      places_prises: taken,
      prix_eur: 20,
      domaines: teacher?.domaines ?? [],
    })
  }

  return slots
}

/** Le cours deja reserve par Lea : jeudi 14h avec Marc B. */
function buildBookings(now: Date): Booking[] {
  return [
    {
      id: 'booking-lea-1',
      slot_id: 'slot-3-14-prof-marc',
      eleve_id: 'eleve-lea',
      skill_id: 'C003',
      cree_le: addDays(now, -2).toISOString(),
      paid_at: addDays(now, -2).toISOString(),
    },
  ]
}

function buildLeaProfile(now: Date): Profile {
  const inscription = new Date(now)
  inscription.setMonth(inscription.getMonth() - 5)

  return {
    id: 'eleve-lea',
    role: 'eleve',
    prenom: 'Léa',
    nom: 'Dubois',
    email: 'lea.d@email.fr',
    niveau_scolaire: '4e',
    date_naissance: '2012-03-14',
    email_parent: 'parent@email.fr',
    consentement_parental_at: inscription.toISOString(),
    cree_le: inscription.toISOString(),
    partage_progression_prof: true,
    resume_hebdo_parent: true,
    rappels_revision: false,
    abonnement: {
      prix_mensuel: 9.99,
      engagement_mois: 6,
      actif: true,
      jour_renouvellement: 12,
    },
  }
}

/** Profil professeur, pour la vue "ouvrir des creneaux" de l'ecran 7. */
export const profMarcProfile: Profile = {
  id: 'prof-marc',
  role: 'prof',
  prenom: 'Marc',
  nom: 'Bernard',
  email: 'marc.b@email.fr',
  niveau_scolaire: null,
  date_naissance: null,
  email_parent: null,
  consentement_parental_at: null,
  cree_le: '2026-01-08T09:00:00.000Z',
  partage_progression_prof: true,
  resume_hebdo_parent: false,
  rappels_revision: true,
  abonnement: null,
}

/** Eleves suivis par Marc, affiches dans son espace. */
export const suiviEleves = [
  { prenom: 'Léa D.', niveau: '4e', lacune_skill_id: 'C003' },
  { prenom: 'Tom N.', niveau: '3e', lacune_skill_id: 'A010' },
]

export interface MockSnapshot {
  profile: Profile
  progress: ProgressMap
  objectifSkillId: string | null
  placement: PlacementResult | null
  bookings: Booking[]
}

/** Etat de demonstration : le compte de Lea, deja diagnostique. */
export function buildLeaSnapshot(now: Date = new Date()): MockSnapshot {
  return {
    profile: buildLeaProfile(now),
    progress: buildProgress(now),
    objectifSkillId: OBJECTIF_SKILL_ID,
    placement: {
      questions_posees: 24,
      competences_maitrisees: MASTERED.length,
      competences_totales: skills.length,
      lacunes_racines: ['C003', 'A010'],
      objectif_skill_id: OBJECTIF_SKILL_ID,
      estimation_semaines: 3,
    },
    bookings: buildBookings(now),
  }
}

/**
 * Etat d'un compte tout juste cree : aucune progression, consentement parental
 * en attente. C'est lui qui alimente les etats vides des maquettes.
 */
export function buildNewAccountSnapshot(profile: Profile): MockSnapshot {
  const progress: ProgressMap = {}
  for (const skill of skills) progress[skill.id] = emptyProgress(skill.id)

  return { profile, progress, objectifSkillId: null, placement: null, bookings: [] }
}

export function buildCatalog(now: Date = new Date()): {
  teachers: Teacher[]
  slots: AvailabilitySlot[]
} {
  return { teachers, slots: buildSlots(now) }
}

/** Utilitaire de lecture : la progression d'une competence, jamais undefined. */
export function progressOf(progress: ProgressMap, skillId: string): SkillProgress {
  return (
    progress[skillId] ?? emptyProgress(skillId)
  )
}
