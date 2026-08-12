import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { SkillStatus } from '@/types/domain'

// Pastilles d'etat. Le code couleur est le meme partout dans l'application :
// vert maitrise, ambre en cours, gris verrouille, indigo lacune racine.
// Aucune autre couleur ne doit apparaitre sur un etat de competence.

export type BadgeTone =
  | 'mastered'
  | 'progress'
  | 'locked'
  | 'accent'
  | 'neutral'
  | 'wrong'
  | 'dark'

const TONES: Record<BadgeTone, string> = {
  mastered: 'bg-mastered-50 text-mastered-700',
  progress: 'bg-progress-50 text-progress-700',
  locked: 'bg-locked-50 text-ink-subtle',
  accent: 'bg-accent-50 text-accent-700',
  neutral: 'bg-muted text-ink-subtle',
  wrong: 'bg-red-50 text-wrong-600',
  dark: 'bg-ink text-white',
}

const DOTS: Partial<Record<BadgeTone, string>> = {
  mastered: 'bg-mastered',
  progress: 'bg-progress',
  locked: 'bg-locked',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  /** Affiche la pastille de couleur devant le libelle. */
  dot?: boolean
  className?: string
}

export function Badge({ tone = 'neutral', children, dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold leading-none',
        TONES[tone],
        className,
      )}
    >
      {dot && DOTS[tone] && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[tone])} aria-hidden />
      )}
      {children}
    </span>
  )
}

const STATUS_LABELS: Record<SkillStatus, string> = {
  mastered: 'Maîtrisé',
  in_progress: 'En cours',
  available: 'À travailler',
  locked: 'Verrouillé',
}

const STATUS_TONES: Record<SkillStatus, BadgeTone> = {
  mastered: 'mastered',
  in_progress: 'progress',
  available: 'accent',
  locked: 'locked',
}

/** Pastille d'etat d'une competence, deduite de son statut. */
export function StatusBadge({
  status,
  className,
}: {
  status: SkillStatus
  className?: string
}) {
  return (
    <Badge tone={STATUS_TONES[status]} dot={status !== 'available'} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

/** Legende maitrise / en cours / verrouille, reprise sur les vues DAG. */
export function StatusLegend({ className }: { className?: string }) {
  const items: [string, string][] = [
    ['bg-mastered', 'Maîtrisé'],
    ['bg-progress', 'En cours'],
    ['bg-locked-200', 'Verrouillé'],
  ]

  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {items.map(([color, label]) => (
        <div key={label} className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <span className={cn('h-2.5 w-2.5 rounded-full', color)} aria-hidden />
          {label}
        </div>
      ))}
    </div>
  )
}
