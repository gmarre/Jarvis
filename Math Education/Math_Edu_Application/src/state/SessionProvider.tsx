import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { RepositoryError, repository, useMockData, type Catalog, type Session } from '@/data'
import { applyAttempt, nextReviewDate } from '@/lib/dag'
import { checkAnswer } from '@/lib/exercise'
import { newId } from '@/lib/id'
import { atMinutes } from '@/lib/schedule'
import type { Exercise } from '@/types/content'
import type { SkillProgress } from '@/types/domain'
import {
  SessionContext,
  type AnswerResult,
  type SessionStatus,
  type SessionValue,
  type SyncError,
} from './session'

// Etat applicatif de la session : profil, progression sur le DAG, tentatives et
// reservations. Tout passe par le repository, jamais par un appel direct.
//
// Modele d'ecriture (sprint 2a). L'ancienne version sauvegardait la session
// entiere dans un useEffect a chaque changement d'etat. Contre Postgres, une
// seule reponse d'exercice aurait reecrit les 38 lignes de progression et tout
// l'historique. Desormais chaque intention fait sa propre ecriture ciblee.
//
// Le motif est partout le meme : on met l'etat local a jour tout de suite pour
// que l'interface reste vive, puis on ecrit. Si l'ecriture echoue, on le dit.

const EMPTY_CATALOG: Catalog = { teachers: [], slots: [] }

/** Met en forme un echec d'ecriture, en distinguant refus de regle et panne. */
function echec(prefixe: string, cause: unknown): SyncError {
  const detail = cause instanceof Error ? cause.message : String(cause)
  return {
    message: `${prefixe} ${detail}`,
    refus: cause instanceof RepositoryError && cause.refus,
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG)
  const [syncError, setSyncError] = useState<SyncError | null>(null)

  const dismissSyncError = useCallback(() => setSyncError(null), [])

  /**
   * Lance une ecriture sans bloquer l'interface, et signale son echec.
   *
   * On ne restaure pas l'etat precedent : l'eleve a vu sa reponse corrigee, la
   * lui retirer sous les yeux serait pire que de l'avertir. Le message lui dit
   * quoi faire, et un rechargement relit la verite du serveur.
   */
  const ecrire = useCallback((operation: () => Promise<unknown>, quoi: string) => {
    void operation().catch((cause: unknown) => {
      setSyncError(echec(`${quoi} n'a pas pu être enregistré.`, cause))
    })
  }, [])

  // Hydratation : session persistee et catalogue, en parallele.
  useEffect(() => {
    let annule = false

    void (async () => {
      try {
        const [restauree, catalogueCharge] = await Promise.all([
          repository.getSession(),
          repository.getCatalog(),
        ])
        if (annule) return
        setCatalog(catalogueCharge)
        setSession(restauree)
        setStatus(restauree ? 'authenticated' : 'anonymous')
      } catch (cause: unknown) {
        if (annule) return
        setSyncError(echec('Connexion au serveur impossible.', cause))
        setStatus('anonymous')
      }
    })()

    return () => {
      annule = true
    }
  }, [])

  // Changements d'authentification : deconnexion depuis un autre onglet,
  // rafraichissement de jeton, et surtout retour de redirection Google.
  useEffect(() => {
    return repository.onAuthChange((suivante) => {
      setSession(suivante)
      setStatus(suivante ? 'authenticated' : 'anonymous')
    })
  }, [])

  // --- Authentification ---------------------------------------------------

  const signInWithGoogle = useCallback(async () => {
    // Redirige le navigateur : la suite se passe au retour, via onAuthChange.
    await repository.signInWithGoogle()
  }, [])

  const signInWithPassword = useCallback(async (email: string, motDePasse: string) => {
    setStatus('loading')
    try {
      const suivante = await repository.signInWithPassword(email, motDePasse)
      setSession(suivante)
      setStatus('authenticated')
    } catch (cause) {
      setStatus('anonymous')
      throw cause
    }
  }, [])

  const signUp = useCallback<SessionValue['signUp']>(async (input) => {
    setStatus('loading')
    try {
      const suivante = await repository.signUp(input)
      if (!suivante) {
        // Compte cree, adresse a confirmer : personne n'est connecte.
        setStatus('anonymous')
        return 'confirmation_requise'
      }
      setSession(suivante)
      setStatus('authenticated')
      return 'connecte'
    } catch (cause) {
      setStatus('anonymous')
      throw cause
    }
  }, [])

  const signOut = useCallback(async () => {
    await repository.signOut()
    setSession(null)
    setStatus('anonymous')
  }, [])

  const completeProfile = useCallback<SessionValue['completeProfile']>(async (completion) => {
    const profile = await repository.completeProfile(completion)
    setSession((current) => (current ? { ...current, profile } : current))
  }, [])

  // --- Mutations ----------------------------------------------------------

  const answerExercise = useCallback(
    (exercise: Exercise, raw: string, durationS: number): AnswerResult => {
      const correction = checkAnswer(exercise, raw)
      const current = session
      if (!current) {
        return { ...correction, justMastered: false, shouldDescend: false, descendTo: [] }
      }

      // Le calcul se fait avant setSession, pas dans son updater : React ne
      // garantit pas qu'un updater tourne avant le retour de la fonction
      // appelante, et l'ecran d'exercice a besoin du verdict tout de suite.
      const applied = applyAttempt(current.progress, exercise.skill_id, correction.isCorrect)

      const attempt = {
        id: newId(),
        exercise_id: exercise.id,
        skill_id: exercise.skill_id,
        answer: raw,
        is_correct: correction.isCorrect,
        duration_s: durationS,
        created_at: new Date().toISOString(),
      }

      setSession({
        ...current,
        progress: { ...current.progress, [exercise.skill_id]: applied.progress },
        attempts: [attempt, ...current.attempts],
      })

      ecrire(() => repository.saveAttempt(attempt, applied.progress), 'Ta réponse')

      return {
        ...correction,
        justMastered: applied.justMastered,
        shouldDescend: applied.shouldDescend,
        descendTo: applied.descendTo,
      }
    },
    [session, ecrire],
  )

  const reviewSkill = useCallback(
    (skillId: string) => {
      const current = session
      const entry = current?.progress[skillId]
      if (!current || !entry) return

      const nextBox = Math.min(entry.review_box + 1, 4)
      const progress: SkillProgress = {
        ...entry,
        review_box: nextBox,
        next_review_at: nextReviewDate(nextBox).toISOString(),
        updated_at: new Date().toISOString(),
      }

      setSession({ ...current, progress: { ...current.progress, [skillId]: progress } })
      ecrire(() => repository.saveProgress(progress), 'Ta révision')
    },
    [session, ecrire],
  )

  const completePlacement = useCallback<SessionValue['completePlacement']>(
    (result, progress) => {
      const current = session
      if (!current) return

      setSession({
        ...current,
        placement: result,
        progress,
        objectifSkillId: result.objectif_skill_id,
      })
      ecrire(
        () => repository.savePlacement(result, Object.values(progress)),
        'Ton test de positionnement',
      )
    },
    [session, ecrire],
  )

  const bookSlot = useCallback(
    (slotId: string, skillId: string | null) => {
      const current = session
      if (!current) return
      if (current.bookings.some((b) => b.slot_id === slotId)) return

      // Ici on attend le serveur avant de mettre l'etat a jour : c'est lui qui
      // attribue l'identifiant, et surtout c'est lui qui refuse un creneau
      // complet. Afficher une reservation qui vient d'etre rejetee serait un
      // mensonge sur un acte payant.
      void repository
        .createBooking(slotId, skillId)
        .then(async (booking) => {
          setSession((etat) =>
            etat ? { ...etat, bookings: [...etat.bookings, booking] } : etat,
          )
          setCatalog(await repository.getCatalog())
        })
        .catch(async (cause: unknown) => {
          setSyncError(echec('La réservation a échoué.', cause))
          // L'ecran montrait une place libre qui n'existe plus : on relit les
          // places reelles pour qu'il cesse de proposer ce creneau.
          if (cause instanceof RepositoryError && cause.refus) {
            const frais = await repository.getCatalog().catch(() => null)
            if (frais) setCatalog(frais)
          }
        })
    },
    [session],
  )

  const cancelBooking = useCallback(
    (bookingId: string) => {
      const current = session
      if (!current) return

      setSession({ ...current, bookings: current.bookings.filter((b) => b.id !== bookingId) })

      void repository
        .deleteBooking(bookingId)
        .then(async () => setCatalog(await repository.getCatalog()))
        .catch((cause: unknown) => {
          setSyncError(echec("L'annulation a échoué.", cause))
        })
    },
    [session],
  )

  const updateProfile = useCallback<SessionValue['updateProfile']>(
    (patch) => {
      const current = session
      if (!current) return

      setSession({ ...current, profile: { ...current.profile, ...patch } })
      ecrire(() => repository.updateProfile(patch), 'Ton profil')
    },
    [session, ecrire],
  )

  const openSlots = useCallback<SessionValue['openSlots']>(
    (dayIso, starts, domaines) => {
      const profId = session?.profile.id
      if (!profId) return

      const nouveaux = starts.map((minutes) => {
        return {
          prof_id: profId,
          start_at: atMinutes(new Date(dayIso), minutes).toISOString(),
          duree_min: 90,
          capacite: 3,
          prix_eur: 20,
          domaines,
        }
      })

      void repository
        .createSlots(nouveaux)
        .then(async () => setCatalog(await repository.getCatalog()))
        .catch((cause: unknown) => {
          setSyncError(echec("L'ouverture des créneaux a échoué.", cause))
        })
    },
    [session],
  )

  const value = useMemo<SessionValue>(
    () => ({
      status,
      session,
      catalog,
      syncError,
      dismissSyncError,
      isDemo: useMockData,
      signInWithGoogle,
      signInWithPassword,
      signUp,
      signOut,
      completeProfile,
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
      syncError,
      dismissSyncError,
      signInWithGoogle,
      signInWithPassword,
      signUp,
      signOut,
      completeProfile,
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
