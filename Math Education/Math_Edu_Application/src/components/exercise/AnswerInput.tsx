import { cn } from '@/lib/cn'
import { RichText } from '@/components/ui/RichText'
import type { Exercise } from '@/types/content'

// Saisie de la reponse, pour les 4 types du schema : QCM, vrai/faux, numerique
// et texte libre. Le meme composant sert au test de positionnement et au
// lecteur d'exercice, pour que l'eleve retrouve exactement les memes gestes.

export type AnswerFeedback = 'none' | 'correct' | 'wrong'

interface AnswerInputProps {
  exercise: Exercise
  value: string
  onChange: (value: string) => void
  /** Verrouille la saisie une fois la reponse validee. */
  disabled?: boolean
  /** Apres validation : met en evidence la bonne et la mauvaise reponse. */
  feedback?: AnswerFeedback
  /** Soumission au clavier depuis un champ de saisie. */
  onSubmit?: () => void
}

export function AnswerInput({
  exercise,
  value,
  onChange,
  disabled = false,
  feedback = 'none',
  onSubmit,
}: AnswerInputProps) {
  const expected = String(exercise.answer.value)
  const revealed = feedback !== 'none'

  if (exercise.type === 'qcm') {
    return (
      <div role="radiogroup" aria-label="Réponses possibles" className="grid gap-3 sm:grid-cols-2">
        {(exercise.choices ?? []).map((choice) => {
          const selected = value === choice.key
          const isExpected = choice.key === expected
          return (
            <button
              key={choice.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(choice.key)}
              className={cn(
                'flex min-h-[64px] items-center gap-3 rounded-[14px] border p-4 text-left transition',
                choiceTone(selected, isExpected, revealed),
                disabled && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[12px] font-semibold uppercase leading-none',
                  selected ? 'border-transparent bg-accent text-white' : 'border-line text-ink-faint',
                  revealed && isExpected && 'border-transparent bg-mastered text-white',
                )}
              >
                {choice.key}
              </span>
              <RichText as="inline" className="text-[15px] font-medium text-ink">
                {choice.text}
              </RichText>
            </button>
          )
        })}
      </div>
    )
  }

  if (exercise.type === 'vrai_faux') {
    return (
      <div role="radiogroup" aria-label="Vrai ou faux" className="grid grid-cols-2 gap-3">
        {[
          { key: 'true', label: 'Vrai' },
          { key: 'false', label: 'Faux' },
        ].map((option) => {
          const selected = value === option.key
          const isExpected = option.key === String(Boolean(exercise.answer.value))
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.key)}
              className={cn(
                'min-h-[68px] rounded-[14px] border text-[17px] font-semibold transition',
                choiceTone(selected, isExpected, revealed),
                disabled && 'cursor-default',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  // numerique et texte : un seul champ, volontairement large.
  return (
    <div>
      <label htmlFor="reponse" className="sr-only">
        Ta réponse
      </label>
      <div className="flex items-center gap-3">
        <input
          id="reponse"
          value={value}
          disabled={disabled}
          autoComplete="off"
          inputMode={exercise.type === 'numerique' ? 'decimal' : 'text'}
          placeholder={exercise.type === 'numerique' ? 'Ta réponse en chiffres' : 'Ta réponse'}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onSubmit) {
              event.preventDefault()
              onSubmit()
            }
          }}
          className={cn(
            'min-h-[64px] w-full rounded-[14px] border bg-surface px-5 font-mono text-[20px] text-ink transition placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-faint focus:outline-none',
            revealed
              ? feedback === 'correct'
                ? 'border-mastered bg-mastered-50'
                : 'border-wrong bg-red-50'
              : 'border-line focus:border-accent focus:shadow-focus',
          )}
        />
        {exercise.answer.unit && (
          <span className="shrink-0 text-[15px] font-medium text-ink-subtle">
            {exercise.answer.unit}
          </span>
        )}
      </div>
    </div>
  )
}

/** Couleur d'une proposition selon la selection et l'etat de correction. */
function choiceTone(selected: boolean, isExpected: boolean, revealed: boolean): string {
  if (!revealed) {
    return selected
      ? 'border-[1.5px] border-accent bg-surface shadow-focus'
      : 'border-line bg-surface hover:bg-muted'
  }
  if (isExpected) return 'border-[1.5px] border-mastered bg-mastered-50'
  if (selected) return 'border-[1.5px] border-wrong bg-red-50'
  return 'border-line bg-surface opacity-60'
}
