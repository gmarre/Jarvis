import { useMemo } from 'react'

import { getSkill } from '@/content'
import { useSession } from './session'
import type { Catalog } from '@/data'
import type { Skill } from '@/types/content'
import type { AvailabilitySlot, Booking, Teacher } from '@/types/domain'

export interface EnrichedBooking {
  booking: Booking
  slot: AvailabilitySlot
  teacher: Teacher
  /** Competence sur laquelle la seance est preparee. */
  skill: Skill | null
  isPast: boolean
}

/**
 * Professeur d'un creneau, avec repli.
 *
 * La ligne `teachers` est creee automatiquement par la base (migration 0002),
 * mais elle peut manquer : compte cree avant cette migration, ou profil dont le
 * role vient de changer. Auparavant on ecartait le creneau, ce qui faisait
 * disparaitre de l'ecran une reservation deja prise et payante. On prefere
 * afficher un professeur au libelle neutre : l'eleve voit sa seance, et c'est ce
 * qui compte.
 */
function teacherFor(catalog: Catalog, profId: string): Teacher {
  const trouve = catalog.teachers.find((t) => t.id === profId)
  if (trouve) return trouve

  return {
    id: profId,
    prenom: 'Professeur',
    nom_court: 'Professeur',
    titre: '',
    note: 0,
    nb_cours: 0,
    domaines: [],
  }
}

/**
 * Reservations de l'eleve, recollees avec le creneau, le professeur et la
 * competence travaillee. Triees par date, la prochaine seance en tete.
 */
export function useBookings(): { upcoming: EnrichedBooking[]; next: EnrichedBooking | null } {
  const { session, catalog } = useSession()

  return useMemo(() => {
    if (!session) return { upcoming: [], next: null }
    const now = Date.now()

    const enriched = session.bookings
      .map((booking) => {
        const slot = catalog.slots.find((s) => s.id === booking.slot_id)
        // Sans creneau il n'y a rien a afficher, la reservation est orpheline.
        // Sans professeur, en revanche, on garde la seance.
        if (!slot) return null
        return {
          booking,
          slot,
          teacher: teacherFor(catalog, slot.prof_id),
          skill: booking.skill_id ? (getSkill(booking.skill_id) ?? null) : null,
          isPast: new Date(slot.start_at).getTime() < now,
        }
      })
      .filter((item): item is EnrichedBooking => item !== null)
      .sort((a, b) => new Date(a.slot.start_at).getTime() - new Date(b.slot.start_at).getTime())

    const upcoming = enriched.filter((item) => !item.isPast)
    return { upcoming, next: upcoming[0] ?? null }
  }, [session, catalog])
}

/** Creneaux disponibles, enrichis du professeur, tries par date. */
export interface EnrichedSlot {
  slot: AvailabilitySlot
  teacher: Teacher
  isFull: boolean
  isBooked: boolean
  /** Le creneau couvre un domaine ou l'eleve a une lacune. */
  matchesGaps: boolean
}

export function useSlots(gapDomains: string[]): EnrichedSlot[] {
  const { session, catalog } = useSession()

  return useMemo(() => {
    const bookedSlotIds = new Set(session?.bookings.map((b) => b.slot_id) ?? [])

    // Aucun creneau n'est ecarte : le repli sur un professeur neutre garantit
    // qu'un creneau ouvert reste visible et reservable.
    return catalog.slots
      .map<EnrichedSlot>((slot) => ({
        slot,
        teacher: teacherFor(catalog, slot.prof_id),
        isFull: slot.places_prises >= slot.capacite,
        isBooked: bookedSlotIds.has(slot.id),
        matchesGaps: slot.domaines.some((domain) => gapDomains.includes(domain)),
      }))
      .sort((a, b) => new Date(a.slot.start_at).getTime() - new Date(b.slot.start_at).getTime())
  }, [catalog, session, gapDomains])
}
