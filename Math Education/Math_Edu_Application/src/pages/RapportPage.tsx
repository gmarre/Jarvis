import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { repository } from '@/data'
import { Wordmark } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingScreen, Notice } from '@/components/ui/Misc'

// Desinscription du resume hebdomadaire (migration 0019, fonction
// rapport-hebdo), sans compte : le jeton du lien de l'email suffit.

type Etat = { etat: 'chargement' } | { etat: 'erreur'; message: string } | { etat: 'pret'; actif: boolean; prenom: string }

export default function RapportPage() {
  const { jeton = '' } = useParams()
  const [etat, setEtat] = useState<Etat>({ etat: 'chargement' })
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let annule = false
    repository
      .lireLienRapport(jeton)
      .then((r) => !annule && setEtat({ etat: 'pret', ...r }))
      .catch((cause: unknown) => !annule && setEtat({ etat: 'erreur', message: cause instanceof Error ? cause.message : 'Ce lien ne fonctionne pas.' }))
    return () => {
      annule = true
    }
  }, [jeton])

  if (etat.etat === 'chargement') return <LoadingScreen label="Lecture du lien…" />

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-5 py-10 sm:px-8">
      <div className="w-full max-w-[480px]">
        <Wordmark className="mb-6 text-base" />
        <Card>
          <h1 className="mb-3 font-display text-[22px] font-medium leading-tight text-ink">Résumé hebdomadaire</h1>
          {etat.etat === 'erreur' ? (
            <p className="text-[13.5px] text-ink-subtle">{etat.message}</p>
          ) : etat.actif ? (
            <>
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                Vous recevez chaque dimanche un résumé de la semaine de {etat.prenom}.
              </p>
              <Button
                className="mt-5"
                variant="secondary"
                size="lg"
                fullWidth
                disabled={pending}
                onClick={() => {
                  setPending(true)
                  repository
                    .desinscrireRapport(jeton)
                    .then((r) => setEtat({ etat: 'pret', ...r }))
                    .catch((cause: unknown) => setEtat({ etat: 'erreur', message: cause instanceof Error ? cause.message : 'La désinscription a échoué.' }))
                    .finally(() => setPending(false))
                }}
              >
                Ne plus recevoir ce résumé
              </Button>
            </>
          ) : (
            <Notice tone="mastered">C'est noté : plus aucun résumé ne partira. Vous pouvez le réactiver depuis votre espace parent.</Notice>
          )}
        </Card>
      </div>
    </div>
  )
}
