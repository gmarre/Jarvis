import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { repository } from '@/data'
import { Wordmark } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingScreen, Notice } from '@/components/ui/Misc'
import type { RappelPublic } from '@/types/domain'

// Page publique des rappels (migration 0017, Edge Function rappel-revision),
// sans compte : le jeton du lien suffit. Deux usages :
//   - le parent accepte ou refuse les rappels demandes par son enfant (avant
//     15 ans) ; le meme lien lui permet ensuite de les arreter ;
//   - le lien « se désinscrire » de chaque rappel : un clic, effet immediat.

type Chargement =
  | { etat: 'chargement' }
  | { etat: 'erreur'; message: string }
  | { etat: 'pret'; rappel: RappelPublic }

export default function RappelPage() {
  const { jeton = '' } = useParams()
  const [chargement, setChargement] = useState<Chargement>({ etat: 'chargement' })
  const [pending, setPending] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    repository
      .lireLienRappel(jeton)
      .then((rappel) => !annule && setChargement({ etat: 'pret', rappel }))
      .catch(
        (cause: unknown) =>
          !annule &&
          setChargement({ etat: 'erreur', message: cause instanceof Error ? cause.message : 'Ce lien ne fonctionne pas.' }),
      )
    return () => {
      annule = true
    }
  }, [jeton])

  const repondre = (reponse: 'confirmer' | 'desinscrire') => {
    if (chargement.etat !== 'pret') return
    setPending(true)
    setErreur(null)
    repository
      .repondreLienRappel(jeton, reponse)
      .then((etat) => setChargement({ etat: 'pret', rappel: { ...chargement.rappel, etat } }))
      .catch((cause: unknown) =>
        setErreur(cause instanceof Error ? cause.message : "La réponse n'a pas pu être enregistrée."),
      )
      .finally(() => setPending(false))
  }

  if (chargement.etat === 'chargement') return <LoadingScreen label="Lecture du lien…" />

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-5 py-10 sm:px-8">
      <div className="w-full max-w-[480px]">
        <Wordmark className="mb-6 text-base" />
        {chargement.etat === 'erreur' ? (
          <Card>
            <h1 className="mb-2 font-display text-[22px] font-medium leading-tight text-ink">Lien introuvable</h1>
            <p className="text-[13.5px] leading-relaxed text-ink-subtle">{chargement.message}</p>
          </Card>
        ) : (
          <Contenu rappel={chargement.rappel} pending={pending} erreur={erreur} onRepondre={repondre} />
        )}
      </div>
    </div>
  )
}

function Contenu({
  rappel,
  pending,
  erreur,
  onRepondre,
}: {
  rappel: RappelPublic
  pending: boolean
  erreur: string | null
  onRepondre: (reponse: 'confirmer' | 'desinscrire') => void
}) {
  const { prenom, heure } = rappel
  const h = heure.replace(':', ' h ')
  const demande = rappel.accord && rappel.etat === 'en_attente'

  return (
    <Card>
      <h1 className="mb-3 font-display text-[24px] font-medium leading-tight tracking-[-0.015em] text-ink">
        {demande ? `${prenom} demande des rappels de travail` : 'Rappels de travail'}
      </h1>

      {demande && (
        <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-soft">
          <p>
            {prenom} a choisi ses jours de travail sur Racine et aimerait qu'un petit email vous soit envoyé
            ces jours-là, vers {h}, s'il n'a encore rien fait.
          </p>
          <p>Au plus un rappel par jour et trois par semaine. Chaque email contient un lien pour arrêter.</p>
        </div>
      )}
      {rappel.etat === 'actif' && (
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          Les rappels pour {prenom} sont actifs, vers {h}, les jours de travail choisis. Vous pouvez les arrêter
          en un clic.
        </p>
      )}

      {erreur && (
        <Notice tone="progress" icon="!" className="mt-4">
          {erreur}
        </Notice>
      )}

      {demande && (
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button size="lg" fullWidth disabled={pending} onClick={() => onRepondre('confirmer')}>
            J'accepte les rappels
          </Button>
          <Button variant="secondary" size="lg" fullWidth disabled={pending} onClick={() => onRepondre('desinscrire')}>
            Je refuse
          </Button>
        </div>
      )}
      {rappel.etat === 'actif' && (
        <Button className="mt-6" variant="secondary" size="lg" fullWidth disabled={pending} onClick={() => onRepondre('desinscrire')}>
          Ne plus recevoir de rappels
        </Button>
      )}

      {rappel.etat === 'arrete' && (
        <Notice tone="mastered" className="mt-5">
          C'est noté : plus aucun rappel ne partira. {prenom} peut en redemander depuis son compte.
        </Notice>
      )}
      {rappel.etat === 'expire' && (
        <Notice tone="progress" icon="!" className="mt-5">
          Ce lien a expiré. {prenom} peut renvoyer la demande depuis son compte.
        </Notice>
      )}
    </Card>
  )
}
