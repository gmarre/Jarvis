import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { domains, getSkill } from '@/content'
import { dureeLisible } from '@/lib/schedule'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Avatar, Notice } from '@/components/ui/Misc'
import { initials } from '@/lib/format'
import { repository, RepositoryError } from '@/data'
import { useSession } from '@/state/session'
import type { Suivi } from '@/types/domain'

// Profil public d'un professeur (sprint 3, point 3), ouvert par l'eleve depuis
// l'icone du professeur sur /cours. Seuls les professeurs verifies sont
// lisibles (migration 0018) : un autre identifiant renvoie au catalogue.

export default function TeacherPublicPage() {
  const { profId = '' } = useParams()
  const { catalog } = useSession()
  const prof = catalog.teachers.find((t) => t.id === profId)
  // Suivi (sprint 5) : l'eleve le demande ici ; le professeur l'accepte.
  const [suivi, setSuivi] = useState<Suivi | null | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    let annule = false
    repository
      .getMesSuivis()
      .then((l) => !annule && setSuivi(l.find((s) => s.prof_id === profId && s.etat !== 'termine' && s.etat !== 'refuse') ?? null))
      .catch(() => !annule && setSuivi(null))
    return () => {
      annule = true
    }
  }, [profId])
  if (!prof) return <Navigate to="/cours" replace />

  const offres = catalog.offers.filter((o) => o.prof_id === prof.id && o.active)

  return (
    <AppShell>
      <PageBody className="max-w-[760px]">
        <PageHeader
          title={prof.nom_court}
          subtitle={prof.titre || 'Professeur'}
          actions={
            <ButtonLink to="/cours" variant="secondary" size="sm">
              Voir ses créneaux
            </ButtonLink>
          }
        />
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex items-start gap-4">
              <Avatar initials={initials(prof.prenom, prof.nom_court)} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {prof.niveaux.map((n) => (
                    <Badge key={n} tone="neutral">
                      {n}
                    </Badge>
                  ))}
                  {prof.domaines.map((id) => (
                    <Badge key={id} tone="accent">
                      {domains.find((d) => d.id === id)?.name ?? id}
                    </Badge>
                  ))}
                </div>
                {prof.nb_cours > 0 && (
                  <p className="mt-2 text-[12px] text-ink-faint">{prof.nb_cours} cours donnés sur Racine</p>
                )}
              </div>
            </div>
            {prof.experience && (
              <>
                <p className="mt-4 text-xs font-semibold text-ink-soft">Expérience</p>
                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">{prof.experience}</p>
              </>
            )}
            {prof.methode && (
              <>
                <p className="mt-4 text-xs font-semibold text-ink-soft">Méthode</p>
                <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">{prof.methode}</p>
              </>
            )}
          </Card>

          <Card>
            <CardTitle>Être suivi par {prof.prenom}</CardTitle>
            <p className="text-[12.5px] leading-relaxed text-ink-subtle">
              Un suivi ouvre un fil de messages pour tes questions de cours, et des créneaux réservés aux élèves
              suivis. Ton parent voit tous vos échanges.
            </p>
            {suivi === undefined ? null : suivi ? (
              <p className="mt-3 text-[12.5px] font-semibold text-mastered-700">
                {suivi.etat === 'actif' ? 'Ce professeur te suit.' : 'Demande envoyée, en attente de sa réponse.'}
              </p>
            ) : (
              <Button
                size="sm"
                className="mt-3"
                onClick={() =>
                  void repository
                    .demanderSuivi(prof.id)
                    .then(() => repository.getMesSuivis())
                    .then((l) => setSuivi(l.find((s) => s.prof_id === prof.id && s.etat === 'demande') ?? null))
                    .catch((cause) => setMessage(cause instanceof RepositoryError ? cause.message : 'La demande a échoué.'))
                }
              >
                Demander un suivi
              </Button>
            )}
            {message && (
              <Notice tone="progress" className="mt-3">
                {message}
              </Notice>
            )}
          </Card>

          {offres.length > 0 && (
            <Card>
              <CardTitle>Ses cours</CardTitle>
              <ul className="flex flex-col gap-3">
                {offres.map((o) => (
                  <li key={o.id} className="rounded-xl border border-divider px-3.5 py-3">
                    <p className="text-[13px] font-semibold text-ink">{o.titre}</p>
                    <p className="text-[11.5px] text-ink-faint">
                      {o.niveau} · {dureeLisible(o.duree_min)} · {o.places} élève{o.places > 1 ? 's' : ''} au plus ·{' '}
                      {o.prix_eur} €
                    </p>
                    {o.description && <p className="mt-1.5 text-[12.5px] text-ink-muted">{o.description}</p>}
                    <p className="mt-1.5 text-[11.5px] text-ink-subtle">
                      {o.skill_ids.map((id) => getSkill(id)?.label ?? id).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </PageBody>
    </AppShell>
  )
}
