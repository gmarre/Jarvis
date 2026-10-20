import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { repository, RepositoryError } from '@/data'
import { formatDateShort } from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingScreen, Notice } from '@/components/ui/Misc'
import { useAuthenticatedSession } from '@/state/session'
import type { Suivi } from '@/types/domain'

// « Mes professeurs » (sprint 5) : les suivis de l'eleve, demandes comprises,
// avec le fil de messages de chacun. Un suivi se demande depuis le profil
// public d'un professeur (/profs/:id).

const ETAT: Record<Suivi['etat'], string> = {
  demande: 'Demande envoyée',
  actif: 'Suivi en cours',
  refuse: 'Demande refusée',
  termine: 'Terminé',
}

export default function MesProfsPage() {
  const { catalog } = useAuthenticatedSession()
  const [suivis, setSuivis] = useState<Suivi[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = () =>
    repository
      .getMesSuivis()
      .then(setSuivis)
      .catch((cause) => {
        setSuivis([])
        setErreur(cause instanceof RepositoryError ? cause.message : 'Tes suivis n’ont pas pu être lus.')
      })

  useEffect(() => {
    void charger()
  }, [])

  if (suivis === null) return <LoadingScreen label="Lecture de tes suivis…" />

  return (
    <AppShell>
      <PageBody className="max-w-[760px]">
        <PageHeader
          title="Mes professeurs"
          subtitle="Les professeurs qui te suivent, et vos messages. Ton parent voit vos échanges."
          actions={
            <ButtonLink to="/cours" variant="secondary" size="sm">
              Trouver un professeur
            </ButtonLink>
          }
        />
        {erreur && (
          <Notice tone="progress" className="mb-4">
            {erreur}
          </Notice>
        )}
        {suivis.length === 0 ? (
          <Card tone="dashed" className="py-10">
            <EmptyState
              title="Aucun professeur ne te suit encore"
              description="Ouvre le profil d’un professeur depuis « Cours particuliers » et demande-lui un suivi."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {suivis.map((s) => {
              const prof = catalog.teachers.find((t) => t.id === s.prof_id)
              return (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link to={`/profs/${s.prof_id}`} className="text-[14px] font-semibold text-accent hover:text-accent-600">
                        {prof?.nom_court ?? 'Professeur'}
                      </Link>
                      <p className="text-[11.5px] text-ink-faint">Demandé le {formatDateShort(s.demande_le)}</p>
                    </div>
                    <Badge tone={s.etat === 'actif' ? 'mastered' : 'neutral'}>{ETAT[s.etat]}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(s.etat === 'actif' || s.etat === 'termine') && (
                      <ButtonLink to={`/suivi/${s.id}`} size="sm">
                        Messages
                      </ButtonLink>
                    )}
                    {(s.etat === 'actif' || s.etat === 'demande') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void repository
                            .terminerSuivi(s.id)
                            .then(charger)
                            .catch((cause) =>
                              setErreur(cause instanceof RepositoryError ? cause.message : 'L’opération a échoué.'),
                            )
                        }
                      >
                        {s.etat === 'demande' ? 'Annuler la demande' : 'Mettre fin au suivi'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageBody>
    </AppShell>
  )
}
