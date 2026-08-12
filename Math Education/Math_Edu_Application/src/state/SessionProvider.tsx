import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { repository, type Catalog, type Session } from '@/data'
import { applyAttempt, nextReviewDate } from '@/lib/dag'
import { checkAnswer } from '@/lib/exercise'
import type { Exercise } from '@/types/content'
import type { Booking } from '@/types/domain'
import {
  SessionContext,
  type AnswerResult,
  type SessionStatus,
  type SessionValue,
} from './session'

// Etat applicatif de la session : profil, progression sur le DAG, tentatives et
// reservations. Tout passe par le repository, jamais par un appel direct.

const EMPTY_CATALOG: Catalog = { teachers: [], slots: [] }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG)
  const hydrated = useRef(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [restored, loadedCatalog] = await Promise.all([
        repository.restore(),
        repository.getCatalog(),
      ])
      if (cancelled) return
      setCatalog(loadedCatalog)
      setSession(restored)
      setStatus(restored ? 'authenticated' : 'anonymous')
      hydrated.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Persistance : on n'ecrit qu'apres hydratation, sinon le premier rendu
  // ecraserait la session restauree par un null.
  useEffect(() => {
    if (!hydrated.current) return
    if (session) void repository.save(session)
    else void repository.clear()
  }, [session])

  const start = useCallback(async (loader: () => Promise<Session>) => {
    setStatus('loading')
    const next = await loader()
    hydrated.current = true
    setSession(next)
    setStatus('authenticated')
  }, [])

  const signInDemo = useCallback(() => start(() => repository.signInDemo()), [start])
  const signInTeacher = useCallback(() => start(() => repository.signInTeacher()), [start])
  const signUp = useCallback<SessionValue['signUp']>(
    (input) => start(() => repository.signUp(input)),
    [start],
  )

  const signOut = useCallback(async () => {
    await repository.clear()
    setSession(null)
    setStatus('anonymous')
  }, [])

  const answerExercise = useCallback(
    (exercise: Exercise, raw: string, durationS: number): AnswerResult => {
      const correction = checkAnswer(exercise, raw)
      let outcome = { justMastered: false, shouldDescend: false, descendTo: [] as string[] }

      setSession((current) => {
        if (!current) return current

        const applied = applyAttempt(current.progress, exercise.skill_id, correction.isCorrect)
        outcome = {
          justMastered: applied.justMastered,
          shouldDescend: applied.shouldDescend,
          descendTo: applied.descendTo,
        }

        return {
          ...current,
          progress: { ...current.progress, [exercise.skill_id]: applied.progress },
          attempts: [
            {
              id: `attempt-${Date.now()}`,
              exercise_id: exercise.id,
              skill_id: exercise.skill_id,
              answer: raw,
              is_correct: correction.isCorrect,
              duration_s: durationS,
              created_at: new Date().toISOString(),
            },
            ...current.attempts,
          ],
        }
      })

      return { ...correction, ...outcome }
    },
    [],
  )

  const reviewSkill = useCallback((skillId: string) => {
    setSession((current) => {
      if (!current) return current
      const entry = current.progress[skillId]
      if (!entry) return current

      const nextBox = Math.min(entry.review_box + 1, 4)
      return {
        ...current,
        progress: {
          ...current.progress,
          [skillId]: {
            ...entry,
            review_box: nextBox,
            next_review_at: nextReviewDate(nextBox).toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      }
    })
  }, [])

  const completePlacement = useCallback<SessionValue['completePlacement']>(
    (result, progress) => {
      setSession((current) =>
        current
          ? { ...current, placement: result, progress, objectifSkillId: result.objectif_skill_id }
          : current,
      )
    },
    [],
  )

  const bookSlot = useCallback((slotId: string, skillId: string | null) => {
    setSession((current) => {
      if (!current) return current
      if (current.bookings.some((b) => b.slot_id === slotId)) return current

      const booking: Booking = {
        id: `booking-${Date.now()}`,
        slot_id: slotId,
        eleve_id: current.profile.id,
        skill_id: skillId,
        cree_le: new Date().toISOString(),
        paid_at: null,
      }
      return { ...current, bookings: [...current.bookings, booking] }
    })

    setCatalog((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        slot.id === slotId
          ? { ...slot, places_prises: Math.min(slot.places_prises + 1, slot.capacite) }
          : slot,
      ),
    }))
  }, [])

  const cancelBooking = useCallback((bookingId: string) => {
    let slotId: string | null = null

    setSession((current) => {
      if (!current) return current
      slotId = current.bookings.find((b) => b.id === bookingId)?.slot_id ?? null
      return { ...current, bookings: current.bookings.filter((b) => b.id !== bookingId) }
    })

    setCatalog((current) => ({
      ...current,
      slots: current.slots.map((slot) =>
        slot.id === slotId
          ? { ...slot, places_prises: Math.max(slot.places_prises - 1, 0) }
          : slot,
      ),
    }))
  }, [])

  const updateProfile = useCallback<SessionValue['updateProfile']>((patch) => {
    setSession((current) =>
      current ? { ...current, profile: { ...current.profile, ...patch } } : current,
    )
  }, [])

  const profileId = session?.profile.id

  const openSlots = useCallback<SessionValue['openSlots']>(
    (dayIso, hours, domaines) => {
      const profId = profileId ?? 'prof-marc'
      const created = hours.map((hour) => {
        const start = new Date(dayIso)
        start.setHours(hour, 0, 0, 0)
        return {
          id: `slot-open-${start.getTime()}-${profId}`,
          prof_id: profId,
          start_at: start.toISOString(),
          duree_min: 90,
          capacite: 3,
          places_prises: 0,
          prix_eur: 20,
          domaines,
        }
      })

      setCatalog((current) => ({
        ...current,
        slots: [
          ...current.slots.filter((slot) => !created.some((c) => c.id === slot.id)),
          ...created,
        ],
      }))
    },
    [profileId],
  )

  const value = useMemo<SessionValue>(
    () => ({
      status,
      session,
      catalog,
      signInDemo,
      signInTeacher,
      signUp,
      signOut,
      answerExercise,
      reviewSkill,
      completePlacement,
      bookSlot,
      cancelBooking,
      updateProfile,
      openSlots,
    }),
    [
      status,
      session,
      catalog,
      signInDemo,
      signInTeacher,
      signUp,
      signOut,
      answerExercise,
      reviewSkill,
      completePlacement,
      bookSlot,
      cancelBooking,
      updateProfile,
      openSlots,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
