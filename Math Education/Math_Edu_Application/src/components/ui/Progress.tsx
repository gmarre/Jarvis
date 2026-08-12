import { cn } from '@/lib/cn'

// Barres et anneaux de progression. La couleur suit toujours le meme code que
// les etats de maitrise : vert quand c'est solide, ambre quand ca progresse.

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  /** Force la couleur, sinon elle se deduit du taux d'avancement. */
  tone?: 'mastered' | 'progress' | 'accent'
  label?: string
}

export function ProgressBar({ value, max = 1, className, tone, label }: ProgressBarProps) {
  const ratio = max === 0 ? 0 : Math.min(Math.max(value / max, 0), 1)
  const resolved = tone ?? (ratio >= 0.8 ? 'mastered' : 'progress')
  const colors = {
    mastered: 'bg-mastered',
    progress: 'bg-progress',
    accent: 'bg-accent',
  } as const

  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', colors[resolved])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

interface ProgressRingProps {
  mastered: number
  inProgress: number
  total: number
  size?: number
}

/**
 * Anneau de progression de l'espace de travail : la part verte est acquise,
 * l'ambre en cours, le reste a venir.
 */
export function ProgressRing({ mastered, inProgress, total, size = 92 }: ProgressRingProps) {
  const safeTotal = Math.max(total, 1)
  const masteredPct = (mastered / safeTotal) * 100
  const inProgressPct = ((mastered + inProgress) / safeTotal) * 100
  const percent = Math.round(masteredPct)

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#10B981 0 ${masteredPct}%, #F59E0B ${masteredPct}% ${inProgressPct}%, #E2E0D9 ${inProgressPct}% 100%)`,
      }}
      role="img"
      aria-label={`${percent}% du niveau maîtrisé, ${mastered} compétences sur ${total}`}
    >
      <div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full bg-surface">
        <div className="font-display text-xl leading-none text-ink">{percent}%</div>
        <div className="mt-1 text-[10px] leading-tight text-ink-faint">du niveau</div>
      </div>
    </div>
  )
}

/** Barre fine de progression d'une session (test, serie d'exercices). */
export function StepProgress({
  current,
  total,
  className,
}: {
  current: number
  total: number
  className?: string
}) {
  return (
    <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${total === 0 ? 0 : (current / total) * 100}%` }}
      />
    </div>
  )
}
