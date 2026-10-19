import { useState } from 'react'

import { Notice } from '@/components/ui/Misc'
import { needsParentalConsent } from '@/lib/age'
import { formatDateLong } from '@/lib/format'
import { useAuthenticatedSession } from '@/state/session'

// Etat du consentement parental d'un eleve, avec le renvoi de l'email.
// Partage par /travail et /profil : un seul texte, un seul bouton, une seule
// regle (accord requis avant 15 ans). Ne rend rien quand rien n'est a dire.

export function ConsentementNotice({
  className,
  afficherConfirme = false,
}: {
  className?: string
  /** Sur /profil, on rappelle aussi l'accord deja donne. */
  afficherConfirme?: boolean
}) {
  const { session, demanderConsentement } = useAuthenticatedSession()
  const { profile } = session
  const [envoi, setEnvoi] = useState<
    { etat: 'repos' } | { etat: 'envoi' } | { etat: 'envoye'; a: string } | { etat: 'erreur'; message: string }
  >({ etat: 'repos' })

  if (profile.role !== 'eleve') return null

  if (profile.consentement_parental_at) {
    if (!afficherConfirme) return null
    return (
      <Notice tone="mastered" className={className}>
        Consentement parental confirmé le {formatDateLong(profile.consentement_parental_at)}.
      </Notice>
    )
  }

  if (!needsParentalConsent(profile.role, profile.date_naissance ?? '')) return null

  if (!profile.email_parent) {
    return (
      <Notice tone="progress" icon="!" className={className}>
        Aucun email de parent renseigné. Avant 15 ans, l'accord d'un parent est obligatoire :
        ajoute son adresse dans ton profil.
      </Notice>
    )
  }

  const renvoyer = () => {
    setEnvoi({ etat: 'envoi' })
    demanderConsentement()
      .then(({ envoye_a }) => setEnvoi({ etat: 'envoye', a: envoye_a }))
      .catch((cause: unknown) =>
        setEnvoi({
          etat: 'erreur',
          message: cause instanceof Error ? cause.message : "L'email n'a pas pu partir.",
        }),
      )
  }

  return (
    <Notice tone="progress" icon="!" className={className}>
      En attente de l'accord de {profile.email_parent}. Tu peux travailler normalement en
      attendant.{' '}
      {envoi.etat === 'envoye' ? (
        <span className="font-semibold">Email renvoyé à {envoi.a}.</span>
      ) : (
        <button
          type="button"
          onClick={renvoyer}
          disabled={envoi.etat === 'envoi'}
          className="min-h-[44px] font-semibold underline underline-offset-2"
        >
          {envoi.etat === 'envoi' ? 'Envoi…' : "Renvoyer l'email"}
        </button>
      )}
      {envoi.etat === 'erreur' && <span className="mt-1 block">{envoi.message}</span>}
    </Notice>
  )
}
