import { Link, useNavigate } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { formatDuration, formatEuros, formatHour, formatWeekday, initials } from '@/lib/format'
import { AppShell, PageBody, PageHeader, StreakCard } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { Avatar, EmptyState, Level, Notice } from '@/components/ui/Misc'
import { ProgressRing } from '@/components/ui/Progress'
import { IconArrowRight, IconChevronRight, IconMindmap, IconVideo } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'
import { useBookings } from '@/state/useBookings'
import { useDailyPlan, type ReviewItem } from '@/state/usePlan'

// Ecran 4, variante A "plan du jour" (maquettes 1f desktop, 1h mobile + etat
// vide). La journee est deja decidee pour l'eleve : priorite, puis revisions,
// puis progression. Il n'a pas a choisir quoi travailler, c'est le role du DAG.

export default function WorkspacePage() {
  const { session } = useAuthenticatedSession()
  const plan = useDailyPlan()
  const { next: nextBooking } = useBookings()
  const { profile } = session

  const streakDays = 6

  return (
    <AppShell railBottom={<StreakCard days={streakDays} />}>
      <PageBody>
        <PageHeader
          title={`Bonjour ${profile.prenom}`}
          subtitle={
            plan.needsPlacement
              ? 'Fais le test de positionnement pour que ton parcours se construise.'
              : plan.isDayDone
                ? "Tout est à jour. Repasse demain, ou prends de l'avance."
                : `${plan.totalMinutes} minutes aujourd'hui : ${describePlan(plan.priorityExerciseCount, plan.reviews.length)}.`
          }
          actions={
            <div className="hidden items-center gap-3 lg:flex">
              {profile.niveau_scolaire && (
                <span className="rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-muted">
                  <Level value={profile.niveau_scolaire} /> · {profile.prenom}{' '}
                  {profile.nom.charAt(0)}.
                </span>
              )}
              <Avatar initials={initials(profile.prenom, profile.nom)} size="lg" />
            </div>
          }
        />

        {profile.role === 'eleve' && !profile.consentement_parental_at && profile.email_parent && (
          <Notice tone="progress" icon="!" className="mb-5">
            En attente de l'accord de ton parent. Un email a été envoyé à {profile.email_parent}.{' '}
            <button type="button" className="font-semibold underline underline-offset-2">
              Renvoyer
            </button>
          </Notice>
        )}

        {plan.needsPlacement ? (
          <PlacementInvite />
        ) : plan.isDayDone ? (
          <DayDone />
        ) : (
          <PriorityCard plan={plan} />
        )}

        {!plan.needsPlacement && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <ReviewList reviews={plan.reviews} />

            <div className="flex flex-col gap-5">
              <ProgressCard plan={plan} />
              <NextLessonCard booking={nextBooking} />
            </div>
          </div>
        )}
      </PageBody>
    </AppShell>
  )
}

function describePlan(exerciseCount: number, reviewCount: number): string {
  const parts: string[] = []
  if (exerciseCount > 0) {
    parts.push(exerciseCount === 1 ? '1 exercice ciblé' : `${exerciseCount} exercices ciblés`)
  }
  if (reviewCount > 0) {
    parts.push(reviewCount === 1 ? '1 carte à revoir' : `${reviewCount} cartes à revoir`)
  }
  return parts.length > 0 ? parts.join(' et ') : 'rien de prévu'
}

/** Carte sombre "priorite du jour" : le seul appel a l'action qui compte. */
function PriorityCard({ plan }: { plan: ReturnType<typeof useDailyPlan> }) {
  const navigate = useNavigate()
  const skill = plan.priority
  if (!skill) return null

  return (
    <Card tone="dark" className="animate-fade-up p-6 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[600px]">
          <SectionLabel className="mb-2.5 text-accent-300">
            Priorité du jour · lacune racine
          </SectionLabel>
          <h2 className="font-display text-[21px] font-medium leading-snug text-white sm:text-2xl">
            {skill.label}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
            Compétence de <Level value={skill.school_level} /> qui bloque{' '}
            {plan.objectif ? `« ${plan.objectif.label} »` : 'la suite de ton programme'}.{' '}
            {plan.priorityExerciseCount} exercices, environ{' '}
            {formatDuration(plan.priorityDurationS)}.
          </p>
          {plan.priorityUnlocks > 0 && (
            <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-accent-200">
              Débloque {plan.priorityUnlocks} compétence{plan.priorityUnlocks > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2.5">
          <Button size="lg" onClick={() => navigate(`/exercice/${skill.id}`)}>
            Commencer
          </Button>
          {skill.mindmap_id && (
            <ButtonLink
              to={`/cartes/${skill.mindmap_id}`}
              variant="ghost"
              className="border border-ink-soft text-locked-200 hover:bg-white/5"
            >
              Revoir la carte mentale
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Compte neuf : rien a montrer tant que le test n'est pas passe. */
function PlacementInvite() {
  return (
    <Card tone="dashed" className="py-10">
      <EmptyState
        title="Pas encore de parcours"
        description="Fais le test de positionnement (environ 8 minutes) pour créer ton graphe de compétences. Rien n'est noté."
        action={
          <ButtonLink to="/test" size="lg">
            Faire le test
          </ButtonLink>
        }
      />
    </Card>
  )
}

/** Etat vide de la maquette 1h : la journee est faite. */
function DayDone() {
  return (
    <Card tone="flat" className="py-10">
      <EmptyState
        tone="mastered"
        title="Rien à réviser aujourd'hui"
        description="Tes cartes sont à jour et ton exercice du jour est fait. Prochaine révision : demain matin."
        action={
          <ButtonLink to="/parcours" variant="secondary" size="lg">
            Prendre de l'avance
          </ButtonLink>
        }
        secondaryAction={
          <Link to="/parcours" className="text-[13px] font-semibold text-accent">
            Voir mon parcours
          </Link>
        }
      />
    </Card>
  )
}

/** Encart "a reviser aujourd'hui" : la revision espacee, sans gamification. */
function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  const first = reviews[0]

  return (
    <Card>
      <CardTitle
        action={
          <span className="text-xs font-semibold text-accent">
            {reviews.length} carte{reviews.length > 1 ? 's' : ''}
          </span>
        }
      >
        À réviser aujourd'hui
      </CardTitle>

      {reviews.length === 0 ? (
        <p className="rounded-card border border-divider bg-canvas p-5 text-center text-[13px] leading-relaxed text-ink-subtle">
          Aucune carte à revoir. La prochaine échéance arrive demain.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {reviews.map((item) => (
            <li key={item.skill.id}>
              <Link
                to={item.mindmap ? `/cartes/${item.mindmap.id}` : '/cartes'}
                className="flex min-h-[56px] items-center gap-3 rounded-xl border border-divider px-3.5 py-3 transition hover:border-line hover:bg-canvas"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    item.overdue ? 'bg-progress' : 'bg-mastered',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold leading-snug text-ink">
                    {item.skill.label}
                  </span>
                  <span className="block text-[11.5px] leading-relaxed text-ink-faint">
                    {item.mindmap ? item.mindmap.title : 'Carte mentale'} · {item.label}
                  </span>
                </span>
                <span className="hidden shrink-0 rounded-[9px] bg-muted px-3 py-1.5 text-xs font-semibold text-ink-muted sm:block">
                  Revoir
                </span>
                <IconChevronRight size={16} className="shrink-0 text-locked-200 sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <p className="text-[12.5px] leading-snug text-ink-subtle">Rythme : J+1 · J+3 · J+7 · J+21</p>
        {first?.mindmap && (
          <Link
            to={`/cartes/${first.mindmap.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent hover:text-accent-600"
          >
            Tout enchaîner
            <IconArrowRight size={14} />
          </Link>
        )}
      </div>
    </Card>
  )
}

function ProgressCard({ plan }: { plan: ReturnType<typeof useDailyPlan> }) {
  const { overall } = plan

  return (
    <Card>
      <CardTitle>Ma progression</CardTitle>
      <div className="mb-4 flex items-center gap-5">
        <ProgressRing
          mastered={overall.mastered}
          inProgress={overall.inProgress}
          total={overall.total}
        />
        <ul className="flex flex-col gap-2.5 text-[12.5px] text-ink-muted">
          <LegendRow color="bg-mastered" value={overall.mastered} label="maîtrisées" />
          <LegendRow color="bg-progress" value={overall.inProgress} label="en cours" />
          <LegendRow color="bg-locked-200" value={overall.upcoming} label="à venir" />
        </ul>
      </div>
      <p className="border-t border-divider pt-3.5 text-xs leading-relaxed text-ink-subtle">
        {overall.weakestDomain ? (
          <>
            Domaine le plus faible :{' '}
            <span className="font-semibold text-ink">{overall.weakestDomain.name}</span>
          </>
        ) : (
          'Le contenu pilote couvre la numération, le calcul et les fractions.'
        )}
      </p>
    </Card>
  )
}

function LegendRow({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-sm', color)} aria-hidden />
      {value} {label}
    </li>
  )
}

function NextLessonCard({ booking }: { booking: ReturnType<typeof useBookings>['next'] }) {
  return (
    <Card>
      <CardTitle>Prochain cours</CardTitle>
      {booking ? (
        <>
          <p className="mb-4 text-[12.5px] leading-relaxed text-ink-subtle">
            Ton prof voit ton graphe et prépare la séance.
          </p>
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-divider px-3.5 py-3">
            <Avatar
              initials={initials(booking.teacher.prenom, booking.teacher.nom_court.slice(-2))}
              tone="neutral"
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold leading-snug text-ink">
                {booking.teacher.nom_court} · {formatWeekday(booking.slot.start_at)}{' '}
                {formatHour(booking.slot.start_at)}
              </p>
              <p className="truncate text-[11.5px] leading-relaxed text-ink-faint">
                {booking.skill ? booking.skill.label : 'Séance générale'} ·{' '}
                {booking.slot.duree_min} min · {formatEuros(booking.slot.prix_eur)}
              </p>
            </div>
            <IconVideo size={18} className="shrink-0 text-ink-faint" />
          </div>
          <ButtonLink to="/cours" variant="secondary" fullWidth>
            Voir le calendrier
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="mb-4 text-[12.5px] leading-relaxed text-ink-subtle">
            Aucun cours réservé. Le professeur reçoit ton graphe et prépare la séance sur tes
            lacunes.
          </p>
          <ButtonLink to="/cours" variant="secondary" fullWidth>
            Réserver un cours
          </ButtonLink>
        </>
      )}
    </Card>
  )
}

/** Petit rappel visuel des cartes mentales, utilise par la liste des cartes. */
export function MindmapGlyph({ className }: { className?: string }) {
  return <IconMindmap size={18} className={cn('text-accent', className)} />
}

/** Badge de domaine, partage avec l'ecran parcours. */
export function DomainBadge({ name }: { name: string }) {
  return <Badge tone="neutral">{name}</Badge>
}
