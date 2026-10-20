import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { domains, getSkill } from '@/content'
import { repository, RepositoryError } from '@/data'
import { domainProgress, statusOf, type ProgressMap } from '@/lib/dag'
import { libelleNiveau, type Niveau } from '@/lib/maitrise'
import { DagGraph } from '@/components/dag/DagGraph'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { EmptyState, LoadingScreen, Notice } from '@/components/ui/Misc'
import { NiveauMaitrise } from '@/components/ui/NiveauMaitrise'

// Graphe d'un eleve inscrit a un cours, vu par son professeur (sprint 3,
// point 4). Lecture seule. La base ne rend la progression que si l'eleve est
// inscrit a un creneau de ce professeur ET partage sa progression
// (est_prof_de) : sinon, l'ecran le dit, sans rien montrer.

export default function StudentGraphPage() {
  const { eleveId = '' } = useParams()
  const [params] = useSearchParams()
  const prenom = params.get('prenom') ?? 'l’élève'
  const [progress, setProgress] = useState<ProgressMap | null | undefined>(undefined)
  const [erreur, setErreur] = useState<string | null>(null)
  const [domaine, setDomaine] = useState(domains[0]?.id ?? 'A')
  const [choisie, setChoisie] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    repository
      .getProgressionEleve(eleveId)
      .then((p) => !annule && setProgress(p))
      .catch((cause) => {
        if (annule) return
        setProgress(null)
        setErreur(cause instanceof RepositoryError ? cause.message : 'La progression n’a pas pu être lue.')
      })
    return () => {
      annule = true
    }
  }, [eleveId])

  if (progress === undefined) return <LoadingScreen label="Lecture de la progression…" />

  const domain = domains.find((d) => d.id === domaine)
  const skill = choisie ? getSkill(choisie) : null
  const entree = choisie && progress ? progress[choisie] : undefined

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title={`Le graphe de ${prenom}`}
          subtitle="Lecture seule : ce que l'élève a acquis, ce qu'il travaille et ce qui lui manque."
          actions={
            <ButtonLink to="/prof/agenda" variant="secondary" size="sm">
              Retour à l'agenda
            </ButtonLink>
          }
        />
        {erreur && (
          <Notice tone="progress" className="mb-4">
            {erreur}
          </Notice>
        )}
        {progress === null ? (
          <Card tone="dashed" className="py-10">
            <EmptyState
              title="Progression non partagée"
              description="L'élève n'a pas autorisé le partage de sa progression, ou n'est inscrit à aucun de tes cours."
            />
          </Card>
        ) : (
          <>
            <div className="mb-4 max-w-[320px]">
              <Select aria-label="Domaine" value={domaine} onChange={(e) => setDomaine(e.target.value)}>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {domainProgress(progress, d.id).mastered} / {d.skills.length} acquises
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="h-[440px] sm:h-[560px]">
                {domain && (
                  <DagGraph
                    skills={domain.skills}
                    progress={progress}
                    rootGapIds={[]}
                    targetId={null}
                    selectedId={choisie}
                    onSelect={setChoisie}
                  />
                )}
              </div>
              <Card>
                {skill ? (
                  <>
                    <p className="text-[14px] font-semibold text-ink">{skill.label}</p>
                    <p className="mt-1 text-[12px] text-ink-faint">{skill.school_level}</p>
                    <div className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <NiveauMaitrise niveau={(entree?.niveau ?? 0) as Niveau} />
                      {libelleNiveau((entree?.niveau ?? 0) as Niveau)}
                    </div>
                    <p className="mt-2 text-[12px] text-ink-subtle">
                      {statusOf(progress, skill.id) === 'locked'
                        ? 'Ses prérequis ne sont pas encore acquis.'
                        : `${entree?.attempts ?? 0} réponse${(entree?.attempts ?? 0) > 1 ? 's' : ''} récente${(entree?.attempts ?? 0) > 1 ? 's' : ''}.`}
                    </p>
                  </>
                ) : (
                  <p className="text-[12.5px] text-ink-subtle">Touche une compétence pour voir son niveau.</p>
                )}
              </Card>
            </div>
          </>
        )}
      </PageBody>
    </AppShell>
  )
}
