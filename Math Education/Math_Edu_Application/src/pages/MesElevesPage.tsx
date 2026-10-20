import { useEffect, useState } from 'react'

import { repository, RepositoryError } from '@/data'
import { formatDateShort } from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState, LoadingScreen, Notice } from '@/components/ui/Misc'
import type { SuiviProf } from '@/types/domain'

// « Mes élèves » du professeur (sprint 5) : les demandes de suivi a accepter
// ou refuser, puis les eleves suivis, avec leur graphe (s'ils partagent) et le
// fil de messages, que leur parent lit aussi.

export default function MesElevesPage() {
  const [suivis, setSuivis] = useState<SuiviProf[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const charger = () =>
    repository
      .getSuivisProf()
      .then(setSuivis)
      .catch((cause) => {
        setSuivis([])
        setErreur(cause instanceof RepositoryError ? cause.message : 'Tes élèves n’ont pas pu être lus.')
      })

  useEffect(() => {
    void charger()
  }, [])

  async function agir(action: () => Promise<void>) {
    setEnCours(true)
    setErreur(null)
    try {
      await action()
      await charger()
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'L’opération a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  if (suivis === null) return <LoadingScreen label="Lecture de tes élèves…" />

  const demandes = suivis.filter((s) => s.etat === 'demande')
  const actifs = suivis.filter((s) => s.etat === 'actif')
  const anciens = suivis.filter((s) => s.etat === 'termine')

  return (
    <AppShell>
      <PageBody className="max-w-[760px]">
        <PageHeader
          title="Mes élèves"
          subtitle="Les élèves que tu suis. Leurs parents voient vos échanges et peuvent t'écrire."
        />
        {erreur && (
          <Notice tone="progress" className="mb-4">
            {erreur}
          </Notice>
        )}

        {demandes.length > 0 && (
          <Card className="mb-5">
            <CardTitle>Demandes de suivi</CardTitle>
            <ul className="flex flex-col gap-3">
              {demandes.map((s) => (
                <li key={s.suivi_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] text-ink">
                    <span className="font-semibold">{s.prenom || 'Élève'}</span>
                    {s.niveau_scolaire ? ` · ${s.niveau_scolaire}` : ''}
                    <span className="text-ink-faint"> · le {formatDateShort(s.demande_le)}</span>
                  </span>
                  <span className="flex gap-2">
                    <Button size="sm" disabled={enCours} onClick={() => void agir(() => repository.repondreSuivi(s.suivi_id, true))}>
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={enCours}
                      onClick={() => void agir(() => repository.repondreSuivi(s.suivi_id, false))}
                    >
                      Refuser
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {actifs.length === 0 && demandes.length === 0 ? (
          <Card tone="dashed" className="py-10">
            <EmptyState
              title="Aucun élève suivi"
              description="Un élève demande un suivi depuis ton profil public. Tu retrouveras ici sa demande."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {actifs.map((s) => (
              <Card key={s.suivi_id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-ink">
                    {s.prenom || 'Élève'}
                    {s.niveau_scolaire ? ` · ${s.niveau_scolaire}` : ''}
                  </p>
                  <Badge tone="mastered">Suivi en cours</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink to={`/suivi/${s.suivi_id}`} size="sm">
                    Messages
                  </ButtonLink>
                  {s.partage ? (
                    <ButtonLink
                      to={`/prof/eleves/${s.eleve_id}?prenom=${encodeURIComponent(s.prenom)}`}
                      size="sm"
                      variant="secondary"
                    >
                      Son graphe
                    </ButtonLink>
                  ) : (
                    <span className="self-center text-[11.5px] text-ink-faint">progression non partagée</span>
                  )}
                  <Button size="sm" variant="ghost" disabled={enCours} onClick={() => void agir(() => repository.terminerSuivi(s.suivi_id))}>
                    Mettre fin au suivi
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {anciens.length > 0 && (
          <p className="mt-5 text-[12px] text-ink-faint">
            {anciens.length} suivi{anciens.length > 1 ? 's' : ''} terminé{anciens.length > 1 ? 's' : ''} : les fils restent
            lisibles depuis leurs liens.
          </p>
        )}
      </PageBody>
    </AppShell>
  )
}
