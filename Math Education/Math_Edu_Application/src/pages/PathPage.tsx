import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { domains, getSkill, skills } from '@/content'
import type { Chemin } from '@/lib/chemins'
import { cn } from '@/lib/cn'
import { domainProgress, statusOf } from '@/lib/dag'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { DagGraph } from '@/components/dag/DagGraph'
import { DagPath, GraphHint } from '@/components/dag/DagPath'
import { SkillDetailPanel } from '@/components/dag/SkillDetailPanel'
import { StatusLegend } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Level } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Progress'
import { useAuthenticatedSession } from '@/state/session'
import { useBookings } from '@/state/useBookings'
import { useDailyPlan } from '@/state/usePlan'

// Ecran "Mon parcours". Il porte les deux lectures du DAG :
//  - les chemins proposes pour la classe de l'eleve, qu'il choisit, puis le
//    chemin du jour (vue par defaut, sprint 2 point 6) ;
//  - le graphe complet d'un domaine (variante A), au bouton « Le graphe ».
// Meme donnee, deux niveaux de lecture selon le public.

type View = 'chemin' | 'graphe'

export default function PathPage() {
  const { session, updateProfile } = useAuthenticatedSession()
  const plan = useDailyPlan()
  const choisis = session.profile.chemins_choisis ?? []
  const basculerChemin = (id: string) =>
    updateProfile({
      chemins_choisis: choisis.includes(id) ? choisis.filter((c) => c !== id) : [...choisis, id],
    })
  const { next: nextBooking } = useBookings()
  const navigate = useNavigate()

  const [view, setView] = useState<View>('chemin')
  const [domainId, setDomainId] = useState<string>(
    () => plan.priority?.domain ?? domains[0]?.id ?? 'A',
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const domain = domains.find((d) => d.id === domainId) ?? domains[0]
  const rootGapIds = useMemo(() => plan.rootGaps.map((s) => s.id), [plan.rootGaps])

  const selectedSkill =
    (selectedId ? getSkill(selectedId) : null) ??
    plan.priority ??
    domain?.skills[0] ??
    null

  const startSkill = (skillId: string) => {
    const status = statusOf(session.progress, skillId)
    if (status === 'locked') {
      setSelectedId(skillId)
      return
    }
    navigate(`/exercice/${skillId}`)
  }

  if (plan.needsPlacement) {
    return (
      <AppShell>
        <PageBody>
          <PageHeader title="Mon parcours" />
          <Card tone="dashed" className="py-12">
            <EmptyState
              title="Ton graphe n'existe pas encore"
              description="Le test de positionnement place ta frontière de maîtrise dans le graphe des compétences. C'est lui qui construit ce parcours."
              action={
                <ButtonLink to="/test" size="lg">
                  Faire le test
                </ButtonLink>
              }
            />
          </Card>
        </PageBody>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title={view === 'chemin' ? 'Mon parcours' : domain?.name}
          subtitle={
            view === 'chemin' ? (
              'Choisis un ou plusieurs chemins : ton travail du jour en tiendra compte.'
            ) : (
              <>
                {domain?.skills.length} compétences · {domainProgress(session.progress, domainId).mastered}{' '}
                maîtrisées. Un domaine à la fois, rangé par niveau scolaire.
              </>
            )
          }
          actions={<ViewToggle view={view} onChange={setView} />}
        />

        {view === 'chemin' ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <CheminsProposes
                chemins={plan.chemins}
                choisis={choisis}
                onBasculer={basculerChemin}
              />
              <h2 className="mb-1 mt-7 font-display text-[19px] font-medium text-ink">
                Ton chemin du jour
              </h2>
              <p className="mb-4 text-[13px] leading-relaxed text-ink-subtle">
                {plan.cheminActif ? (
                  <>Sur le chemin « {plan.cheminActif.titre} ». Voici ce qui manque, dans l'ordre.</>
                ) : plan.objectif ? (
                  <>
                    Vers l'objectif de ton test (<Level value={plan.objectif.school_level} /> :{' '}
                    {plan.objectif.label.toLowerCase()}). Voici ce qui manque, dans l'ordre.
                  </>
                ) : (
                  'Aucun objectif défini.'
                )}
              </p>
              <DagPath path={plan.path} onStart={startSkill} />
              <GraphHint onOpen={() => setView('graphe')} />
            </div>
            <DomainSummary />
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <DomainChips current={domainId} onChange={setDomainId} />
              <StatusLegend />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="h-[440px] sm:h-[560px] lg:h-[620px]">
                {domain && (
                  <DagGraph
                    skills={domain.skills}
                    progress={session.progress}
                    rootGapIds={rootGapIds}
                    targetId={plan.objectif?.id ?? null}
                    selectedId={selectedSkill?.id ?? null}
                    onSelect={setSelectedId}
                  />
                )}
              </div>

              {selectedSkill && (
                <SkillDetailPanel
                  skill={selectedSkill}
                  progress={session.progress}
                  isRootGap={rootGapIds.includes(selectedSkill.id)}
                  onStart={startSkill}
                  teacherName={nextBooking?.teacher.nom_court ?? null}
                />
              )}
            </div>
          </>
        )}
      </PageBody>
    </AppShell>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode d'affichage du parcours"
      className="flex overflow-hidden rounded-[10px] border border-line bg-surface"
    >
      {(
        [
          ['chemin', 'Le chemin'],
          ['graphe', 'Le graphe'],
        ] as [View, string][]
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          onClick={() => onChange(value)}
          className={cn(
            'min-h-[40px] px-4 text-[12.5px] font-semibold transition',
            view === value ? 'bg-ink text-white' : 'text-ink-muted hover:bg-muted',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function DomainChips({
  current,
  onChange,
}: {
  current: string
  onChange: (id: string) => void
}) {
  const { session } = useAuthenticatedSession()

  return (
    <div className="flex flex-wrap gap-2">
      {domains.map((domain) => {
        const stats = domainProgress(session.progress, domain.id)
        const tone =
          stats.ratio >= 0.8 ? 'bg-mastered' : stats.mastered > 0 ? 'bg-progress' : 'bg-locked'
        const active = domain.id === current

        return (
          <button
            key={domain.id}
            type="button"
            onClick={() => onChange(domain.id)}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border px-3.5 text-[12.5px] font-medium transition',
              active
                ? 'border-transparent bg-muted font-semibold text-ink'
                : 'border-line bg-surface text-ink-muted hover:bg-muted',
            )}
          >
            {domain.name}
            <span className={cn('h-2 w-2 rounded-full', tone)} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

/** Avancement par domaine, colonne de droite de la vue chemin. */
function DomainSummary() {
  const plan = useDailyPlan()

  return (
    <Card>
      <h2 className="mb-4 font-display text-[17px] font-medium text-ink">Par domaine</h2>
      <div className="flex flex-col gap-4">
        {plan.perDomain.map((domain) => (
          <div key={domain.id}>
            <div className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink-soft">
              <span>{domain.name}</span>
              <span className="text-ink-faint">
                {domain.mastered} / {domain.total}
              </span>
            </div>
            <ProgressBar
              value={domain.mastered}
              max={domain.total}
              label={`${domain.name} : ${domain.mastered} sur ${domain.total}`}
            />
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-divider pt-4 text-[11.5px] leading-relaxed text-ink-faint">
        Le contenu couvre aujourd'hui {skills.length} compétences, du CP au début du collège. Le
        reste du collège arrive au fil des livraisons de contenu.
      </p>
    </Card>
  )
}

/**
 * Les chemins proposes pour la classe de l'eleve. Un clic choisit ou retire un
 * chemin ; le choix est enregistre dans le profil (migration 0012).
 */
function CheminsProposes({
  chemins,
  choisis,
  onBasculer,
}: {
  chemins: Chemin[]
  choisis: string[]
  onBasculer: (id: string) => void
}) {
  if (chemins.length === 0) {
    return (
      <Card tone="flat">
        <p className="text-[13px] leading-relaxed text-ink-subtle">
          Tout est acquis jusqu'à ta classe dans le contenu disponible. Bravo !
        </p>
      </Card>
    )
  }
  return (
    <section aria-labelledby="chemins-titre">
      <h2 id="chemins-titre" className="mb-3 font-display text-[19px] font-medium text-ink">
        Chemins proposés
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {chemins.map((chemin) => {
          const choisi = choisis.includes(chemin.id)
          return (
            <li key={chemin.id}>
              <button
                type="button"
                aria-pressed={choisi}
                onClick={() => onBasculer(chemin.id)}
                className={cn(
                  'flex h-full min-h-[44px] w-full flex-col items-start gap-1.5 rounded-card border p-4 text-left transition',
                  choisi
                    ? 'border-accent bg-accent-50'
                    : 'border-line bg-surface hover:border-accent-200',
                )}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="text-[14px] font-semibold leading-snug text-ink">{chemin.titre}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      choisi ? 'bg-accent text-white' : 'bg-muted text-ink-muted',
                    )}
                  >
                    {choisi ? 'Choisi' : 'Choisir'}
                  </span>
                </span>
                <span className="text-[12.5px] leading-relaxed text-ink-subtle">{chemin.description}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
