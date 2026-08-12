import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

// Champs de formulaire (maquette 1a) : fond blanc, bordure #E2E0D9, rayon 12,
// anneau indigo au focus. Hauteur confortable, on saisit souvent au pouce.

const CONTROL =
  'w-full min-h-[48px] rounded-xl border border-line bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint transition focus:border-accent focus:shadow-focus focus:outline-none'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11.5px] leading-snug text-ink-faint">{hint}</p>}
      {error && (
        <p role="alert" className="text-[11.5px] font-medium leading-snug text-wrong-600">
          {error}
        </p>
      )}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(CONTROL, 'appearance-none bg-[right_0.9rem_center] bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")",
        }}
        {...props}
      />
    )
  },
)

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, children, className }: CheckboxProps) {
  const id = useId()

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        aria-hidden
        className={cn(
          'mt-0.5 grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[5px] border text-[11px] font-bold leading-none transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2',
          checked ? 'border-accent bg-accent text-white' : 'border-locked-200 bg-surface',
        )}
      >
        {checked ? '✓' : ''}
      </label>
      <label htmlFor={id} className="cursor-pointer text-[11.5px] leading-relaxed text-ink-muted">
        {children}
      </label>
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** Interrupteur des preferences de confidentialite (ecran Profil). */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="max-w-[220px] text-[12.5px] font-medium leading-snug text-ink-soft">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/** Groupe de choix exclusifs en pastilles (role a l'inscription, vues). */
interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  ariaLabel: string
  className?: string
  size?: 'md' | 'sm'
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-xl border text-center font-semibold leading-none transition',
              size === 'md' ? 'min-h-[48px] px-3 text-[13.5px]' : 'min-h-[40px] px-3 text-xs',
              selected
                ? 'border-[1.5px] border-accent bg-accent-50 text-accent-700'
                : 'border-line bg-surface text-ink-muted hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
