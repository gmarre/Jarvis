import { Link } from 'react-router-dom'

import { getExercisesForSkill, getMindmap, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { statusOf, unlockCount, type ProgressMap } from '@/lib/dag'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Level } from '@/components/ui/Misc'
import type { Skill } from '@/types/content'

// Panneau de detail d'une competence (maquette 1i, colonne de droite).
// Il repond a la seule question qui compte pour l'eleve : pourquoi celle-la, et
// qu'est-ce que ca debloque.

interface SkillDetailPanelProps {
  skill: Skill
  progress: ProgressMap
  isRootGap: boolean
  onStart: (skillId: string) => void
  /** Nom du professeur qui verra ce meme graphe, si un cours est prevu. */
  teacherName?: string | null
  className?: string
}

export function SkillDetailPanel({
  skill,
  progress,
  isRootGap,
  onStart,
  teacherName,
  className,
}: SkillDetailPanelProps) {
  const status = statusOf(progress, skill.id)
  const entry = progress[skill.id]
  const exercises = getExercisesForSkill(skill.id)
  const mindmap = getMindmap(skill.mindmap_id)
  const unlocks = unlockCount(skill.id)

  const missingPrerequisites = skill.prerequisites.filter(
    (id) => statusOf(progress, id) !== 'mastered',
  )

  return (
    <aside className={cn('rounded-panel border border-line bg-surface p-5 sm:p-6', className)}>
      {isRootGap ? (
        <Badge tone="accent" className="mb-3">
          Lacune racine
        </Badge>
      ) : (
        <StatusBadge status={status} className="mb-3" />
      )}

      <h2 className="font-display text-[19px] font-medium leading-snug text-ink">{skill.label}</h2>
      <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-ink-subtle">
        {skill.description}. Compétence de <Level value={skill.school_level} />
        {unlocks > 0 && <> dont dépendent {unlocks} compétences</>}.
      </p>

      <dl className="mb-5 flex flex-col gap-2.5">
        <DetailRow
          label="Réussite"
          value={
            entry && entry.attempts > 0
              ? `${entry.score} sur ${entry.attempts} essais`
              : `Seuil : ${skill.mastery_threshold.required} sur ${skill.mastery_threshold.out_of}`
          }
          tone={status === 'mastered' ? 'text-mastered' : 'text-progress'}
        />
        <DetailRow
          label="Exercices"
          value={exercises.length > 0 ? `${exercises.length} disponibles` : 'à venir'}
          tone="text-ink"
        />
        <DetailRow
          label="Carte mentale"
          value={mindmap ? '1 liée' : 'aucune'}
          tone="text-ink"
        />
        <DetailRow
          label="Prérequis"
          value={
            missingPrerequisites.length === 0
              ? 'Tous acquis'
              : `${missingPrerequisites.length} manquant${missingPrerequisites.length > 1 ? 's' : ''}`
          }
          tone={missingPrerequisites.length === 0 ? 'text-mastered' : 'text-progress'}
          last
        />
      </dl>

      {missingPrerequisites.length > 0 && (
        <div className="mb-4 rounded-card border border-divider bg-canvas p-3.5">
          <p className="mb-2 text-[11.5px] font-semibold text-ink-muted">À travailler avant</p>
          <ul className="flex flex-col gap-1.5">
            {missingPrerequisites.map((id) => {
              const prerequisite = getSkill(id)
              if (!prerequisite) return null
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onStart(id)}
                    className="text-left text-[12.5px] font-medium text-accent hover:text-accent-600"
                  >
                    {prerequisite.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {exercises.length > 0 && status !== 'locked' ? (
        <Button fullWidth onClick={() => onStart(skill.id)} className="mb-2.5">
          Travailler cette compétence
        </Button>
      ) : (
        <Button variant="disabled" fullWidth disabled className="mb-2.5">
          {exercises.length === 0 ? 'Exercices bientôt disponibles' : 'Verrouillé'}
        </Button>
      )}

      {mindmap && (
        <ButtonLink to={`/cartes/${mindmap.id}`} variant="secondary" fullWidth>
          Voir la carte mentale
        </ButtonLink>
      )}

      {teacherName && (
        <p className="mt-5 border-t border-divider pt-4 text-[11.5px] leading-relaxed text-ink-faint">
          Vue professeur : {teacherName} voit ce même graphe avant votre prochain cours.{' '}
          <Link to="/cours" className="font-semibold text-accent">
            Calendrier
          </Link>
        </p>
      )}
    </aside>
  )
}

function DetailRow({
  label,
  value,
  tone,
  last,
}: {
  label: string
  value: string
  tone: string
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 text-[12.5px] font-medium text-ink-muted',
        !last && 'border-b border-divider pb-2.5',
      )}
    >
      <dt>{label}</dt>
      <dd className={cn('font-semibold', tone)}>{value}</dd>
    </div>
  )
}
