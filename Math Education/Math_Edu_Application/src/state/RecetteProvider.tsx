import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { repository } from '@/data'
import type { ContentReview, NewContentReview, ReviewItemType } from '@/types/domain'
import { RecetteContext, type RecetteValue } from './recette'
import { useSession } from './session'

// Etat de la recette du contenu : verdicts accepte / invalide rendus en
// parcourant l'application (migration 0008, scripts/recette.py).
//
// Tenu a l'ecart de la session : un eleve n'en a jamais besoin, et un echec de
// lecture ici ne doit rien empecher d'autre.

const cle = (type: ReviewItemType, id: string) => `${type}:${id}`

export function RecetteProvider({ children }: { children: ReactNode }) {
  const { status, session } = useSession()
  const userId = session?.profile.id ?? null

  const [relecteur, setRelecteur] = useState(false)
  const [chargee, setChargee] = useState(false)
  const [reviews, setReviews] = useState<ContentReview[]>([])

  // Relu a chaque changement de compte connecte.
  useEffect(() => {
    let annule = false
    setChargee(false)
    if (status !== 'authenticated' || !userId) {
      setRelecteur(false)
      setReviews([])
      setChargee(status !== 'loading')
      return
    }
    repository
      .getRecette()
      .then((recette) => {
        if (annule) return
        setRelecteur(recette.relecteur)
        setReviews(recette.reviews)
        setChargee(true)
      })
      .catch(() => {
        // Outil interne : en cas d'echec, il ne s'affiche simplement pas.
        if (annule) return
        setRelecteur(false)
        setChargee(true)
      })
    return () => {
      annule = true
    }
  }, [status, userId])

  const parCle = useMemo(
    () => new Map(reviews.map((review) => [cle(review.item_type, review.item_id), review])),
    [reviews],
  )

  const verdictDe = useCallback<RecetteValue['verdictDe']>(
    (type, id) => parCle.get(cle(type, id)),
    [parCle],
  )

  // Ici on attend la base avant d'afficher le verdict : un refus (commentaire
  // manquant, compte retire des relecteurs) doit se voir, pas etre masque par
  // un etat local deja a jour.
  const rendreVerdict = useCallback(async (review: NewContentReview) => {
    const enregistre = await repository.saveReview(review)
    setReviews((actuels) => [
      ...actuels.filter(
        (r) => cle(r.item_type, r.item_id) !== cle(enregistre.item_type, enregistre.item_id),
      ),
      enregistre,
    ])
  }, [])

  const value = useMemo<RecetteValue>(
    () => ({ relecteur, chargee, reviews, verdictDe, rendreVerdict }),
    [relecteur, chargee, reviews, verdictDe, rendreVerdict],
  )

  return <RecetteContext.Provider value={value}>{children}</RecetteContext.Provider>
}
