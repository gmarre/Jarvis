import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Level } from '@/components/ui/Misc'
import { IconCheck } from '@/components/ui/icons'
import type { PathStep } from '@/lib/dag'

// Vue DAG, variante B des maquettes (1j) : la meme donnee que le graphe, mais
// lue de haut en bas. C'est la vue par defaut apres le test.
//
// Pourquoi par defaut : un eleve de CM2 ou un parent lit une liste ordonnee
// sans effort, la ou un graphe demande d'etre dechiffre. Le graphe complet
// reste a un clic pour ceux qui veulent la vue d'ensemble.

interface DagPathProps {
  path: PathStep[]
  onStart?: (skillId: string) => void
}

export function DagPath({ path, onStart }: DagPathProps) {
  if (path.length === 0) {
    return (
      <p className="rounded-panel border border-line bg-surface p-8 text-center text-[13px] text-ink-subtle">
        Aucun objectif défini pour le moment.
      </p>
    )
  }

  return (
    <div className="relative rounded-panel border border-line bg-surface p-5 sm:p-7">
      <span
        aria-hidden
        className="absolute bottom-14 left-[76px] top-14 hidden w-0.5 bg-divider sm:block"
      />

      <ol className="flex flex-col gap-4">
        {path.map((step) => (
          <li key={step.skill.id} className="flex items-center gap-3 sm:gap-5">
            <span className="hidden w-14 shrink-0 text-right text-[11px] font-semibold text-ink-faint sm:block">
              <Level value={step.skill.school_level} />
            </span>
            <StepDot step={step} />
            <StepCard step={step} onStart={onStart} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function StepDot({ step }: { step: PathStep }) {
  const color = step.isTarget
    ? '#0F172A'
    : step.isRootGap
      ? '#6366F1'
      : step.status === 'mastered'
        ? '#10B981'
        : step.status === 'in_progress'
          ? '#F59E0B'
          : '#CBD5E1'

  return (
    <span
      aria-hidden
      className={cn(
        'z-10 -ml-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-white',
        step.isTarget && 'border-2 border-ink bg-surface',
      )}
      style={
        step.isTarget
          ? undefined
          : { background: color, boxShadow: `0 0 0 2px ${color}` }
      }
    />
  )
}

function StepCard({ step, onStart }: { step: PathStep; onStart?: (skillId: string) => void }) {
  const { skill } = step

  if (step.isTarget) {
    return (
      <div className="flex flex-1 items-center justify-between gap-4 rounded-card bg-ink px-4 py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-white">{skill.label}</p>
          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Ton objectif · niveau <Level value={skill.school_level} />
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-accent-300">OBJECTIF</span>
      </div>
    )
  }

  if (step.isRootGap) {
    return (
      <div className="flex-1 rounded-card border-2 border-accent bg-surface p-4 shadow-accent sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge tone="accent" className="mb-2">
              Lacune racine · tu es ici
            </Badge>
            <h3 className="font-display text-[17px] font-medium leading-snug text-ink sm:text-lg">
              {skill.label}
            </h3>
            <p className="mt-1.5 max-w-[380px] text-xs leading-relaxed text-ink-subtle">
              {skill.description}
            </p>
          </div>
          {onStart && (
            <Button className="shrink-0" onClick={() => onStart(skill.id)}>
              Commencer
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (step.status === 'mastered') {
    return (
      <div className="flex flex-1 items-center justify-between gap-3 rounded-card border border-mastered-200 bg-mastered-50 px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-mastered-900">
            {skill.label}
          </p>
          <p className="text-[11.5px] leading-relaxed text-mastered-700">
            Acquis · rien à refaire
          </p>
        </div>
        <IconCheck size={16} className="shrink-0 text-mastered-700" />
      </div>
    )
  }

  if (step.status === 'in_progress') {
    return (
      <div className="flex-1 rounded-card border border-progress-200 bg-progress-50 px-4 py-3.5">
        <p className="text-sm font-semibold leading-snug text-progress-900">{skill.label}</p>
        <p className="text-[11.5px] leading-relaxed text-progress-700">
          Fragile · {skill.exercise_ids.length} exercices prévus
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-card border border-dashed border-locked-200 bg-locked-50 px-4 py-3.5">
      <p className="text-sm font-semibold leading-snug text-ink-muted">{skill.label}</p>
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Verrouillé · dépend de ce qui précède
      </p>
    </div>
  )
}

/** Renvoi vers la vue graphe, affiche sous le chemin. */
export function GraphHint({ onOpen }: { onOpen: () => void }) {
  return (
    <p className="mt-4 rounded-card border border-line bg-surface px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-subtle">
      Vue par défaut après le test. Le graphe complet du domaine reste accessible{' '}
      <button
        type="button"
        onClick={onOpen}
        className="font-semibold text-accent underline underline-offset-2 hover:text-accent-600"
      >
        en un clic
      </button>
      .{' '}
      <Link to="/cartes" className="font-semibold text-accent hover:text-accent-600">
        Voir les cartes mentales
      </Link>
    </p>
  )
}
