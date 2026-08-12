import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { cn } from '@/lib/cn'

// Boutons du design system (maquette 1a).
// Hauteur minimale 44px sur toutes les variantes : le public commence a 6 ans,
// on ne descend jamais sous la cible tactile recommandee.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'disabled'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-600 active:bg-accent-700',
  secondary: 'bg-surface border border-line text-ink hover:bg-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-muted',
  dark: 'bg-ink text-white hover:bg-ink-soft',
  disabled: 'bg-muted text-ink-faint cursor-not-allowed',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-4 text-[12.5px] rounded-[10px]',
  md: 'min-h-[44px] px-5 text-[13.5px] rounded-xl',
  lg: 'min-h-[52px] px-7 text-[15px] rounded-[14px]',
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
})

export type ButtonLinkProps = CommonProps & LinkProps

/** Meme apparence, mais c'est une navigation : le lien reste un lien. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    />
  )
}
