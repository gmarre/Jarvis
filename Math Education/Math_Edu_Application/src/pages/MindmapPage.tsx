import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { getMindmap, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { REVIEW_INTERVALS_DAYS, reviewLabel, statusOf } from '@/lib/dag'
import { relativeDays } from '@/lib/format'
import { MindmapView } from '@/components/mindmap/MindmapView'
import { Wordmark } from '@/components/layout/AppShell'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, SectionLabel } from '@/components/ui/Card'
import { Level } from '@/components/ui/Misc'
import { IconCheck, IconClose } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'

// Ecran 6 : carte mentale. Absent des maquettes, dessine dans le meme systeme.
//
// La carte n'est pas qu'un document a lire : c'est le support de la revision
// espacee. Quand l'eleve declare l'avoir revue, chaque competence rattachee
// passe a l'echeance Leitner suivante (J+1, J+3, J+7, J+21).

export default function MindmapPage() {
  const { mindmapId = '' } = useParams()
  const navigate = useNavigate()
  const { session, reviewSkill } = useAuthenticatedSession()

  const mindmap = getMindmap(mindmapId)
  const [reviewed, setReviewed] = useState(false)

  const linkedSkills = useMemo(
    () =>
      (mindmap?.skill_ids ?? [])
        .map((id) => getSkill(id))
        .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill)),
    [mindmap],
  )

  if (!mindmap) return <Navigate to="/cartes" replace />

  /** Competences de la carte effectivement acquises : seules elles se revisent. */
  const reviewable = linkedSkills.filter(
    (skill) => statusOf(session.progress, skill.id) === 'mastered',
  )

  const nextBox = Math.min(
    (reviewable[0] ? session.progress[reviewable[0].id]?.review_box ?? 0 : 0) + 1,
    REVIEW_INTERVALS_DAYS.length,
  )

  const markReviewed = () => {
    for (const skill of reviewable) reviewSkill(skill.id)
    setReviewed(true)
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex items-center gap-4 border-b border-divider bg-surface px-5 py-3.5 sm:px-8">
        <Wordmark className="hidden text-base sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-medium leading-tight text-ink">
            {mindmap.title}
          </p>
          <p className="truncate text-[11.5px] text-ink-faint">
            Carte mentale · {linkedSkills.length} compétences
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Fermer la carte"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line text-ink-muted transition hover:bg-muted"
        >
          <IconClose size={17} />
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex-1 p-4 sm:p-6">
          <div className="h-[420px] overflow-hidden rounded-panel border border-line bg-surface sm:h-[540px] lg:h-full lg:min-h-[560px]">
            <MindmapView
              markdown={mindmap.markdown}
              title={mindmap.title}
              className="h-full w-full p-2"
            />
          </div>
          <p className="mt-3 text-center text-[11.5px] text-ink-faint">
            Clique sur un cercle pour déplier ou replier une branche.
          </p>
        </div>

        <aside className="w-full shrink-0 border-t border-divider bg-surface p-6 lg:w-[340px] lg:border-l lg:border-t-0">
          <SectionLabel className="mb-3">Ce que couvre cette carte</SectionLabel>
          <ul className="mb-6 flex flex-col gap-2">
            {linkedSkills.map((skill) => {
              const status = statusOf(session.progress, skill.id)
              return (
                <li
                  key={skill.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-divider px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">
                      {skill.label}
                    </span>
                    <span className="block text-[11px] text-ink-faint">
                      <Level value={skill.school_level} />
                    </span>
                  </span>
                  <StatusBadge status={status} />
                </li>
              )
            })}
          </ul>

          <Card tone="flat" className="p-4">
            <p className="mb-1 text-[13px] font-semibold text-ink">Révision espacée</p>
            <p className="mb-4 text-[12px] leading-relaxed text-ink-subtle">
              Rythme : J+1 · J+3 · J+7 · J+21. Revoir la carte fait avancer les compétences
              acquises d'un cran.
            </p>

            {reviewable.length === 0 ? (
              <p className="rounded-card border border-divider bg-canvas p-3 text-[12px] leading-relaxed text-ink-subtle">
                Aucune compétence de cette carte n'est encore acquise. Travaille d'abord les
                exercices, la révision viendra ensuite.
              </p>
            ) : reviewed ? (
              <div className="flex items-start gap-2.5 rounded-card border border-mastered-200 bg-mastered-50 p-3.5">
                <IconCheck size={16} className="mt-px shrink-0 text-mastered-700" />
                <p className="text-[12px] leading-relaxed text-mastered-900">
                  Carte révisée. Prochaine échéance : {reviewLabel(nextBox)}, soit{' '}
                  {relativeDays(
                    new Date(
                      Date.now() + REVIEW_INTERVALS_DAYS[nextBox - 1] * 86_400_000,
                    ).toISOString(),
                  )}
                  .
                </p>
              </div>
            ) : (
              <Button fullWidth onClick={markReviewed}>
                J'ai révisé cette carte
              </Button>
            )}
          </Card>

          <div className={cn('mt-4 flex flex-col gap-2.5', reviewable.length === 0 && 'mt-4')}>
            {linkedSkills.some(
              (skill) => statusOf(session.progress, skill.id) !== 'mastered',
            ) && (
              <ButtonLink
                to={`/exercice/${
                  linkedSkills.find(
                    (skill) => statusOf(session.progress, skill.id) === 'in_progress',
                  )?.id ??
                  linkedSkills.find(
                    (skill) => statusOf(session.progress, skill.id) === 'available',
                  )?.id ??
                  linkedSkills[0].id
                }`}
                variant="secondary"
                fullWidth
              >
                S'entraîner sur ces notions
              </ButtonLink>
            )}
            <ButtonLink to="/travail" variant="ghost" fullWidth>
              Retour à mon espace
            </ButtonLink>
          </div>

          {mindmap.review_status !== 'valide' && (
            <p className="mt-5 text-[11px] leading-relaxed text-ink-faint">
              <Badge tone="neutral" className="mr-1.5 align-middle">
                {mindmap.review_status}
              </Badge>
              Contenu en cours de relecture, il peut encore évoluer.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
