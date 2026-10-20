import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { getSuperForSkill } from '@/content'
import { RepositoryError, repository, useMockData, type Catalog, type Session } from '@/data'
import { needsParentalConsent } from '@/lib/age'
import { applyAttempt, applySuper, nextReviewDate } from '@/lib/dag'
import { apresDefi } from '@/lib/defis'
import { newId } from '@/lib/id'
import { atMinutes } from '@/lib/schedule'
import { epreuveDe } from '@/lib/super'
import type { PublicExercise } from '@/types/content'
import type { Profile, SkillProgress } from '@/types/domain'
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

const EMPTY_CATALOG: Catalog = { teachers: [], slots: [], offers: [] }

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

  // Derniere session connue, lue apres l'attente de la correction : la session
  // capturee au moment du clic peut avoir change pendant l'aller-retour.
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

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

  const resendConfirmation = useCallback(
    (email: string) => repository.resendConfirmation(email),
    [],
  )

  const signOut = useCallback(async () => {
    await repository.signOut()
    setSession(null)
    setStatus('anonymous')
  }, [])

  /**
   * Envoie l'email de consentement si le profil l'exige. Ne bloque jamais
   * l'eleve : un echec s'affiche dans le bandeau, et /travail propose de
   * renvoyer l'email.
   */
  const envoyerConsentementSiRequis = useCallback((profile: Profile) => {
    if (
      profile.role !== 'eleve' ||
      profile.consentement_parental_at ||
      !profile.email_parent ||
      !needsParentalConsent(profile.role, profile.date_naissance ?? '')
    ) {
      return
    }
    void repository.demanderConsentement().catch((cause: unknown) => {
      setSyncError(echec("L'email à ton parent n'est pas parti.", cause))
    })
  }, [])

  const completeProfile = useCallback<SessionValue['completeProfile']>(
    async (completion) => {
      const profile = await repository.completeProfile(completion)
      setSession((current) => (current ? { ...current, profile } : current))
      envoyerConsentementSiRequis(profile)
    },
    [envoyerConsentementSiRequis],
  )

  // --- Mutations ----------------------------------------------------------

  const corriger = useCallback<SessionValue['corriger']>(
    (exerciseId, raw) => repository.corriger(exerciseId, raw),
    [],
  )

  const answerExercise = useCallback(
    async (exercise: PublicExercise, raw: string, durationS: number): Promise<AnswerResult> => {
      // Le serveur corrige : l'application n'a pas la reponse. Un echec remonte
      // a l'ecran, qui laisse l'eleve valider a nouveau ; rien n'est ecrit.
      const correction = await repository.corriger(exercise.id, raw)
      const current = sessionRef.current
      if (!current) {
        return {
          ...correction,
          justMastered: false,
          controle: null,
          niveau: 0,
          prochainControle: null,
          attendEpreuve: false,
          shouldDescend: false,
          descendTo: [],
        }
      }

      // Le calcul se fait avant setSession, pas dans son updater : React ne
      // garantit pas qu'un updater tourne avant le retour de la fonction
      // appelante, et l'ecran d'exercice a besoin du verdict tout de suite.
      const epreuve = epreuveDe(
        getSuperForSkill(exercise.skill_id).map((sx) => sx.id),
        current.superAttempts,
      )
      const applied = applyAttempt(
        current.progress,
        exercise.skill_id,
        exercise.id,
        correction.isCorrect,
        new Date(),
        epreuve,
      )

      const attempt = {
        id: newId(),
        exercise_id: exercise.id,
        skill_id: exercise.skill_id,
        answer: raw,
        is_correct: correction.isCorrect,
        duration_s: durationS,
        created_at: new Date().toISOString(),
      }

      const suivante = {
        ...current,
        progress: { ...current.progress, [exercise.skill_id]: applied.progress },
        attempts: [attempt, ...current.attempts],
      }
      sessionRef.current = suivante
      setSession(suivante)

      ecrire(() => repository.saveAttempt(attempt, applied.progress), 'Ta réponse')

      return {
        ...correction,
        justMastered: applied.justMastered,
        controle: applied.controle,
        niveau: applied.progress.niveau,
        prochainControle: applied.progress.prochain_controle,
        attendEpreuve: applied.attendEpreuve,
        shouldDescend: applied.shouldDescend,
        descendTo: applied.descendTo,
      }
    },
    [ecrire],
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

  const reviserDefi = useCallback<SessionValue['reviserDefi']>(
    (carte, savait) => {
      const current = sessionRef.current
      if (!current) return
      const progress = apresDefi(current.defis[carte.id], carte, savait, new Date())
      const suivante = { ...current, defis: { ...current.defis, [carte.id]: progress } }
      sessionRef.current = suivante
      setSession(suivante)
      ecrire(() => repository.saveDefi(progress), 'Ta carte défi')
    },
    [ecrire],
  )

  const enregistrerSuper = useCallback<SessionValue['enregistrerSuper']>(
    (attempt) => {
      const current = sessionRef.current
      if (!current) return { niveauAvant: 0, niveauApres: 0, justMastered: false }
      const effet = applySuper(current.progress, attempt.skill_id, {
        reussie: attempt.reussi,
        sansFaute: attempt.reussi && attempt.score === attempt.total,
      })
      const change = effet.progress.niveau !== effet.niveauAvant
      const suivante = {
        ...current,
        superAttempts: [attempt, ...current.superAttempts],
        progress: change ? { ...current.progress, [attempt.skill_id]: effet.progress } : current.progress,
      }
      sessionRef.current = suivante
      setSession(suivante)
      ecrire(() => repository.saveSuperAttempt(attempt), 'Ton super exercice')
      if (change) ecrire(() => repository.saveProgress(effet.progress), 'Ta progression')
      return {
        niveauAvant: effet.niveauAvant,
        niveauApres: effet.progress.niveau,
        justMastered: effet.justMastered,
      }
    },
    [ecrire],
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

  const modifierProfil = useCallback<SessionValue['modifierProfil']>(
    async (patch) => {
      const avant = sessionRef.current?.profile
      const profile = await repository.updateProfile(patch)
      setSession((current) => (current ? { ...current, profile } : current))
      // Consentement remis a zero par la base (nouveau parent, ou date sous
      // 15 ans) : on previent le parent sans attendre un clic de plus.
      if (avant?.consentement_parental_at || avant?.email_parent !== profile.email_parent) {
        envoyerConsentementSiRequis(profile)
      }
      return profile
    },
    [envoyerConsentementSiRequis],
  )

  const aUnMotDePasse = useCallback(() => repository.aUnMotDePasse(), [])
  const changerMotDePasse = useCallback(
    (ancien: string, nouveau: string) => repository.changerMotDePasse(ancien, nouveau),
    [],
  )
  const changerEmail = useCallback(async (nouvelEmail: string) => {
    await repository.changerEmail(nouvelEmail)
    // Le mock change l'adresse tout de suite ; Supabase attend le clic sur le
    // lien. Relire la session donne la verite dans les deux cas.
    const fraiche = await repository.getSession()
    if (fraiche) setSession(fraiche)
  }, [])
  const demanderConsentement = useCallback(() => repository.demanderConsentement(), [])
  const demanderModification = useCallback<SessionValue['demanderModification']>(
    (champ, valeur) => repository.demanderModification(champ, valeur),
    [],
  )
  const getModificationsEnAttente = useCallback(() => repository.getModificationsEnAttente(), [])
  const lireAccord = useCallback((jeton: string) => repository.lireAccord(jeton), [])
  const repondreAccord = useCallback<SessionValue['repondreAccord']>(
    (jeton, reponse) => repository.repondreAccord(jeton, reponse),
    [],
  )

  const openSlots = useCallback<SessionValue['openSlots']>(
    (dayIso, starts, domaines, offre, reserve) => {
      const profId = session?.profile.id
      if (!profId) return

      const nouveaux = starts.map((minutes) => {
        return {
          prof_id: profId,
          start_at: atMinutes(new Date(dayIso), minutes).toISOString(),
          duree_min: offre?.duree_min ?? 90,
          capacite: offre?.places ?? 3,
          prix_eur: offre?.prix_eur ?? 20,
          domaines: offre ? [...new Set(offre.skill_ids.map((id) => id.slice(0, 1)))].sort() : domaines,
          offer_id: offre?.id ?? null,
          reserve_suivi: reserve ?? false,
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

  const rechargerCatalogue = useCallback<SessionValue['rechargerCatalogue']>(async () => {
    try {
      setCatalog(await repository.getCatalog())
    } catch (cause) {
      setSyncError(echec('Le catalogue n’a pas pu être relu.', cause))
    }
  }, [])

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
      resendConfirmation,
      signOut,
      completeProfile,
      answerExercise,
      corriger,
      reviewSkill,
      reviserDefi,
      enregistrerSuper,
      completePlacement,
      bookSlot,
      cancelBooking,
      updateProfile,
      modifierProfil,
      aUnMotDePasse,
      changerMotDePasse,
      changerEmail,
      demanderConsentement,
      demanderModification,
      getModificationsEnAttente,
      lireAccord,
      repondreAccord,
      openSlots,
      rechargerCatalogue,
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
      resendConfirmation,
      signOut,
      completeProfile,
      answerExercise,
      corriger,
      reviewSkill,
      reviserDefi,
      enregistrerSuper,
      completePlacement,
      bookSlot,
      cancelBooking,
      updateProfile,
      modifierProfil,
      aUnMotDePasse,
      changerMotDePasse,
      changerEmail,
      demanderConsentement,
      demanderModification,
      getModificationsEnAttente,
      lireAccord,
      repondreAccord,
      openSlots,
      rechargerCatalogue,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
