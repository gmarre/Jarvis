import { useMemo } from 'react'

import { getSkill } from '@/content'
import { useSession } from './session'
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
        const teacher = slot ? catalog.teachers.find((t) => t.id === slot.prof_id) : undefined
        if (!slot || !teacher) return null
        return {
          booking,
          slot,
          teacher,
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

    return catalog.slots
      .map((slot) => {
        const teacher = catalog.teachers.find((t) => t.id === slot.prof_id)
        if (!teacher) return null
        return {
          slot,
          teacher,
          isFull: slot.places_prises >= slot.capacite,
          isBooked: bookedSlotIds.has(slot.id),
          matchesGaps: slot.domaines.some((domain) => gapDomains.includes(domain)),
        }
      })
      .filter((item): item is EnrichedSlot => item !== null)
      .sort((a, b) => new Date(a.slot.start_at).getTime() - new Date(b.slot.start_at).getTime())
  }, [catalog, session, gapDomains])
}
