import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

// Conteneur standard de tous les ecrans (maquette 1a) : fond blanc, bordure
// discrete, rayon 16 a 18, ombre douce.

type CardTone = 'default' | 'flat' | 'dark' | 'accent' | 'dashed'

const TONES: Record<CardTone, string> = {
  default: 'bg-surface border border-line shadow-card',
  flat: 'bg-surface border border-line',
  dark: 'bg-ink border border-ink',
  accent: 'bg-accent-50 border border-accent-100',
  dashed: 'bg-surface border border-dashed border-locked-200',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone
  padded?: boolean
}

export function Card({ tone = 'default', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-panel', TONES[tone], padded && 'p-5 sm:p-6', className)}
      {...props}
    />
  )
}

interface CardTitleProps {
  children: ReactNode
  /** Action secondaire alignee a droite du titre. */
  action?: ReactNode
  className?: string
  invert?: boolean
}

export function CardTitle({ children, action, className, invert }: CardTitleProps) {
  return (
    <div className={cn('mb-4 flex items-baseline justify-between gap-3', className)}>
      <h2
        className={cn(
          'font-display text-[17px] font-medium leading-tight',
          invert ? 'text-white' : 'text-ink',
        )}
      >
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Intitule de section en petites capitales, tres present dans les maquettes. */
export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-ink-faint',
        className,
      )}
    >
      {children}
    </div>
  )
}
