import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Wordmark } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingScreen, Notice } from '@/components/ui/Misc'
import { formatDateLong } from '@/lib/format'
import { useSession } from '@/state/session'
import type { AccordPublic } from '@/types/domain'

// Page publique ouverte par le parent depuis son email (migration 0011, Edge
// Function accord-parental). Le parent n'a pas de compte : le jeton du lien
// suffit, et il n'est valable que 7 jours.
//
// Deux cas : le consentement avant 15 ans, et la demande de modification d'un
// mineur (email ou date de naissance). Le parent voit exactement ce qu'il
// accepte avant de cliquer, et peut refuser.

type Chargement =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'pret'; accord: AccordPublic }

export default function AccordPage() {
  const { jeton = '' } = useParams()
  const { lireAccord, repondreAccord } = useSession()
  const [chargement, setChargement] = useState<Chargement>({ etat: 'chargement' })
  const [pending, setPending] = useState(false)
  const [erreurReponse, setErreurReponse] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    lireAccord(jeton)
      .then((accord) => {
        if (!annule) setChargement({ etat: 'pret', accord })
      })
      .catch((cause: unknown) => {
        if (!annule) {
          setChargement({
            etat: 'erreur',
            message: cause instanceof Error ? cause.message : 'Ce lien ne fonctionne pas.',
          })
        }
      })
    return () => {
      annule = true
    }
  }, [jeton, lireAccord])

  const repondre = (reponse: 'confirmer' | 'refuser') => {
    if (chargement.etat !== 'pret') return
    setPending(true)
    setErreurReponse(null)
    repondreAccord(jeton, reponse)
      .then((etat) => setChargement({ etat: 'pret', accord: { ...chargement.accord, etat } }))
      .catch((cause: unknown) =>
        setErreurReponse(cause instanceof Error ? cause.message : "La réponse n'a pas pu être enregistrée."),
      )
      .finally(() => setPending(false))
  }

  if (chargement.etat === 'chargement') return <LoadingScreen label="Lecture de la demande…" />

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-5 py-10 sm:px-8">
      <div className="w-full max-w-[480px]">
        <Wordmark className="mb-6 text-base" />

        {chargement.etat === 'erreur' ? (
          <Card>
            <h1 className="mb-2 font-display text-[22px] font-medium leading-tight text-ink">
              Lien introuvable
            </h1>
            <p className="text-[13.5px] leading-relaxed text-ink-subtle">
              {chargement.message} Si votre enfant a renvoyé la demande, utilisez le lien du
              message le plus récent.
            </p>
          </Card>
        ) : (
          <Demande
            accord={chargement.accord}
            pending={pending}
            erreur={erreurReponse}
            onRepondre={repondre}
          />
        )}
      </div>
    </div>
  )
}

function Demande({
  accord,
  pending,
  erreur,
  onRepondre,
}: {
  accord: AccordPublic
  pending: boolean
  erreur: string | null
  onRepondre: (reponse: 'confirmer' | 'refuser') => void
}) {
  const { prenom } = accord
  const consentement = accord.type === 'consentement'

  const titre = consentement
    ? `Accord pour le compte de ${prenom}`
    : `${prenom} demande une modification`

  return (
    <Card>
      <h1 className="mb-3 font-display text-[24px] font-medium leading-tight tracking-[-0.015em] text-ink">
        {titre}
      </h1>

      {consentement ? (
        <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-soft">
          <p>
            {prenom} a créé un compte sur Racine, une application d'entraînement en
            mathématiques. Avant 15 ans, la loi demande l'accord d'un parent pour traiter les
            données de l'enfant.
          </p>
          <p>
            Données conservées : prénom, nom s'il est indiqué, adresse email, classe, date de
            naissance, réponses aux exercices, progression et réservations de cours. Elles sont
            hébergées dans l'Union européenne.
          </p>
        </div>
      ) : (
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          {accord.champ === 'email' ? (
            <>
              Nouvelle adresse email du compte : <strong>{accord.nouvelle_valeur}</strong>. Votre
              enfant se connectera désormais avec cette adresse.
            </>
          ) : (
            <>
              Nouvelle date de naissance :{' '}
              <strong>{accord.nouvelle_valeur ? formatDateLong(accord.nouvelle_valeur) : ''}</strong>.
            </>
          )}
        </p>
      )}

      {erreur && (
        <Notice tone="progress" icon="!" className="mt-4">
          {erreur}
        </Notice>
      )}

      {accord.etat === 'en_attente' && (
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button size="lg" fullWidth disabled={pending} onClick={() => onRepondre('confirmer')}>
            {consentement ? "Je donne mon accord" : 'J’accepte la modification'}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={pending}
            onClick={() => onRepondre('refuser')}
          >
            Je refuse
          </Button>
        </div>
      )}

      {accord.etat === 'confirme' && (
        <Notice tone="mastered" className="mt-5">
          {consentement
            ? `C'est noté : ${prenom} peut utiliser son compte. Merci.`
            : 'C’est noté : la modification est faite.'}
        </Notice>
      )}
      {accord.etat === 'annule' && (
        <Notice tone="progress" icon="!" className="mt-5">
          {consentement
            ? 'Refus enregistré. Le compte reste en attente de votre accord.'
            : 'Refus enregistré : rien ne change sur le compte.'}
        </Notice>
      )}
      {accord.etat === 'expire' && (
        <Notice tone="progress" icon="!" className="mt-5">
          Ce lien a expiré ou a été remplacé par un plus récent. Votre enfant peut renvoyer la
          demande depuis son compte.
        </Notice>
      )}
    </Card>
  )
}
