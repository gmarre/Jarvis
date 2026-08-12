import { Link } from 'react-router-dom'

import { mindmaps, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { statusOf } from '@/lib/dag'
import { relativeDays } from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Level } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Progress'
import { IconChevronRight, IconMindmap } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'
import { useDailyPlan } from '@/state/usePlan'

// Liste des cartes memoire. C'est l'entree "Cartes mémoire" de la navigation :
// les cartes du jour d'abord, puis le reste de la bibliotheque.

export default function MindmapListPage() {
  const { session } = useAuthenticatedSession()
  const plan = useDailyPlan()

  const dueSkillIds = new Set(plan.reviews.map((review) => review.skill.id))

  const cards = mindmaps.map((mindmap) => {
    const skills = mindmap.skill_ids
      .map((id) => getSkill(id))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
    const mastered = skills.filter(
      (skill) => statusOf(session.progress, skill.id) === 'mastered',
    ).length
    const due = skills.filter((skill) => dueSkillIds.has(skill.id)).length
    const nextReview = skills
      .map((skill) => session.progress[skill.id]?.next_review_at)
      .filter((date): date is string => Boolean(date))
      .sort()[0]

    return { mindmap, skills, mastered, due, nextReview }
  })

  const dueCards = cards.filter((card) => card.due > 0)
  const otherCards = cards.filter((card) => card.due === 0)

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title="Cartes mémoire"
          subtitle="Une carte par groupe de compétences. Les revoir au bon moment, c'est ce qui les ancre : J+1, J+3, J+7, J+21."
        />

        {plan.needsPlacement && (
          <Card tone="dashed" className="mb-6 py-10">
            <EmptyState
              title="Aucune carte programmée"
              description="Les échéances de révision se créent au fur et à mesure que tu valides des compétences."
              action={
                <ButtonLink to="/test" size="lg">
                  Faire le test de positionnement
                </ButtonLink>
              }
            />
          </Card>
        )}

        {dueCards.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-[17px] font-medium text-ink">
              À revoir aujourd'hui
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {dueCards.map((card) => (
                <MindmapCard key={card.mindmap.id} {...card} highlighted />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-display text-[17px] font-medium text-ink">
            {dueCards.length > 0 ? 'Toutes les cartes' : 'Bibliothèque'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherCards.map((card) => (
              <MindmapCard key={card.mindmap.id} {...card} />
            ))}
          </div>
        </section>
      </PageBody>
    </AppShell>
  )
}

interface MindmapCardProps {
  mindmap: (typeof mindmaps)[number]
  skills: NonNullable<ReturnType<typeof getSkill>>[]
  mastered: number
  due: number
  nextReview?: string
  highlighted?: boolean
}

function MindmapCard({
  mindmap,
  skills,
  mastered,
  due,
  nextReview,
  highlighted,
}: MindmapCardProps) {
  const levels = mindmap.school_levels

  return (
    <Link
      to={`/cartes/${mindmap.id}`}
      className={cn(
        'group flex flex-col rounded-panel border bg-surface p-5 transition hover:shadow-card',
        highlighted ? 'border-accent shadow-accent' : 'border-line',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
            highlighted ? 'bg-accent-50 text-accent' : 'bg-muted text-ink-muted',
          )}
        >
          <IconMindmap size={20} />
        </span>
        {due > 0 ? (
          <Badge tone="accent">
            {due} à revoir
          </Badge>
        ) : (
          <Badge tone="neutral">{skills.length} compétences</Badge>
        )}
      </div>

      <h3 className="font-display text-[16px] font-medium leading-snug text-ink">
        {mindmap.title}
      </h3>
      <p className="mt-1 text-[11.5px] text-ink-faint">
        {levels.map((level, index) => (
          <span key={level}>
            {index > 0 && ' · '}
            <Level value={level} />
          </span>
        ))}
      </p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-[11.5px] text-ink-subtle">
          <span>Compétences acquises</span>
          <span className="font-semibold text-ink-faint">
            {mastered} / {skills.length}
          </span>
        </div>
        <ProgressBar
          value={mastered}
          max={skills.length}
          label={`${mindmap.title} : ${mastered} sur ${skills.length}`}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-divider pt-3.5">
        <span className="text-[11.5px] text-ink-faint">
          {due > 0
            ? 'Échéance atteinte'
            : nextReview
              ? `Prochaine révision ${relativeDays(nextReview)}`
              : 'Pas encore programmée'}
        </span>
        <IconChevronRight
          size={16}
          className="text-locked-200 transition group-hover:text-accent"
        />
      </div>
    </Link>
  )
}
