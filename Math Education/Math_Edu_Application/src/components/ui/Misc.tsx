import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { splitLevel } from '@/lib/format'
import type { SchoolLevel } from '@/types/content'

/** Niveau scolaire avec son exposant : 4e, 1re, 2nde. */
export function Level({ value, className }: { value: SchoolLevel | null; className?: string }) {
  if (!value) return null
  const { base, sup } = splitLevel(value)
  return (
    <span className={className}>
      {base}
      {sup && <sup className="sup">{sup}</sup>}
    </span>
  )
}

interface AvatarProps {
  initials: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'accent' | 'neutral'
  className?: string
}

const AVATAR_SIZES = {
  sm: 'h-9 w-9 text-[12px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-16 w-16 font-display text-xl',
}

export function Avatar({ initials, size = 'md', tone = 'accent', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none',
        AVATAR_SIZES[size],
        tone === 'accent' ? 'bg-accent-50 text-accent-700' : 'bg-muted text-ink-muted',
        className,
      )}
    >
      {initials}
    </span>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
  secondaryAction?: ReactNode
  tone?: 'mastered' | 'accent'
  className?: string
}

/**
 * Etat vide. Les maquettes en prevoient sur presque tous les ecrans : un compte
 * neuf ne doit jamais tomber sur une page blanche.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  tone = 'accent',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 text-center', className)}>
      <div
        className={cn(
          'mb-5 flex h-16 w-16 items-center justify-center rounded-full',
          tone === 'mastered' ? 'bg-mastered-50' : 'bg-accent-50',
        )}
      >
        {icon ?? (
          <span
            className={cn(
              'block h-[22px] w-[22px] rounded-full border-[3px]',
              tone === 'mastered' ? 'border-mastered' : 'border-accent',
            )}
          />
        )}
      </div>
      <h2 className="max-w-[280px] font-display text-[22px] font-medium leading-snug text-ink">
        {title}
      </h2>
      <p className="mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-ink-subtle">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  )
}

/** Chargement : on annonce ce qu'on attend plutot qu'un spinner muet. */
export function LoadingScreen({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent"
        aria-hidden
      />
      <p className="text-[13px] text-ink-subtle">{label}</p>
      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  )
}

/** Bandeau d'information contextuel (RGPD, consentement, rappel de seance). */
export function Notice({
  tone = 'accent',
  icon,
  children,
  className,
}: {
  tone?: 'accent' | 'mastered' | 'progress'
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  const tones = {
    accent: 'bg-accent-50 border-accent-100 text-accent-700',
    mastered: 'bg-mastered-50 border-mastered-200 text-mastered-900',
    progress: 'bg-progress-50 border-progress-200 text-progress-900',
  } as const

  const marks = {
    accent: 'bg-accent',
    mastered: 'bg-mastered',
    progress: 'bg-progress',
  } as const

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-card border p-4 text-xs leading-relaxed',
        tones[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white',
          marks[tone],
        )}
      >
        {icon ?? (tone === 'progress' ? '!' : '✓')}
      </span>
      <div>{children}</div>
    </div>
  )
}
