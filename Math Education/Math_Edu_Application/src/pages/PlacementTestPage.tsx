import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getSkill, requireSkill, skills as allSkills } from '@/content'
import { buildPathToTarget, emptyProgress, findRootGaps, type ProgressMap } from '@/lib/dag'
import { checkAnswer } from '@/lib/exercise'
import {
  answerPlacement,
  estimateWeeks,
  pickObjectif,
  placementExercise,
  startPlacement,
  type PlacementState,
} from '@/lib/placement'
import { cn } from '@/lib/cn'
import { AnswerInput } from '@/components/exercise/AnswerInput'
import { Wordmark } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, SectionLabel } from '@/components/ui/Card'
import { Level } from '@/components/ui/Misc'
import { StepProgress } from '@/components/ui/Progress'
import { RichText } from '@/components/ui/RichText'
import { useAuthenticatedSession } from '@/state/session'
import type { Skill } from '@/types/content'
import type { PlacementResult } from '@/types/domain'

// Ecran 2 des maquettes : 1d (test en cours) et 1e (resultat).
//
// Le test ne cherche pas a noter l'eleve : il cherche ou s'arrete ce qu'il sait
// faire. Une reponse fausse fait descendre d'un cran dans le graphe, jusqu'a la
// premiere competence solide. Rien n'est affiche comme un echec.

type Phase = 'test' | 'resultat'

export default function PlacementTestPage() {
  const { session, completePlacement } = useAuthenticatedSession()
  const navigate = useNavigate()

  const [state, setState] = useState<PlacementState>(() =>
    startPlacement(session.profile.niveau_scolaire),
  )
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('test')
  const [result, setResult] = useState<PlacementResult | null>(null)
  /** Historique affiche dans le panneau lateral "ce que le test cherche". */
  const [trace, setTrace] = useState<{ skillId: string; correct: boolean }[]>([])

  // Selection directe plutot que memoisee : une lecture de tableau indexe, la
  // memoisation couterait plus cher que le calcul.
  const exercise = state.current ? placementExercise(state.current) : null
  const currentSkill = state.current ? getSkill(state.current) : null

  const finish = (finalState: PlacementState) => {
    const progress: ProgressMap = {}
    for (const skill of allSkills) {
      const isMastered = finalState.mastered.includes(skill.id)
      progress[skill.id] = isMastered
        ? {
            ...emptyProgress(skill.id),
            status: 'mastered',
            score: skill.mastery_threshold.required,
            attempts: skill.mastery_threshold.out_of,
            review_box: 1,
            updated_at: new Date().toISOString(),
          }
        : emptyProgress(skill.id)
    }

    const objectif = pickObjectif(finalState.mastered, session.profile.niveau_scolaire)
    const rootGaps = objectif ? findRootGaps(progress, objectif) : []
    const remaining = allSkills.length - finalState.mastered.length

    const placement: PlacementResult = {
      questions_posees: finalState.asked.length,
      competences_maitrisees: finalState.mastered.length,
      competences_totales: allSkills.length,
      lacunes_racines: rootGaps,
      objectif_skill_id: objectif ?? allSkills[allSkills.length - 1].id,
      estimation_semaines: estimateWeeks(remaining),
    }

    setResult(placement)
    completePlacement(placement, progress)
    setPhase('resultat')
  }

  const validate = () => {
    if (!exercise || !state.current || answer === '') return
    const { isCorrect } = checkAnswer(exercise, answer)

    setTrace((current) => [...current, { skillId: state.current as string, correct: isCorrect }])
    const next = answerPlacement(state, isCorrect)
    setAnswer('')
    setState(next)
    if (next.done) finish(next)
  }

  /** "Je ne sais pas encore" compte comme un echec, sans le dire ainsi. */
  const skip = () => {
    if (!state.current) return
    setTrace((current) => [...current, { skillId: state.current as string, correct: false }])
    const next = answerPlacement(state, false)
    setAnswer('')
    setState(next)
    if (next.done) finish(next)
  }

  if (phase === 'resultat' && result) {
    return <PlacementResultView result={result} prenom={session.profile.prenom} />
  }

  if (!exercise || !currentSkill) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center">
        <div>
          <p className="font-display text-xl text-ink">Aucune question disponible</p>
          <p className="mt-2 text-[13px] text-ink-subtle">
            Le contenu pilote ne couvre pas encore ce niveau.
          </p>
          <Button className="mt-5" onClick={() => navigate('/travail')}>
            Aller à mon espace
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex items-center gap-4 border-b border-divider bg-surface px-5 py-3.5 sm:gap-6 sm:px-8">
        <Wordmark className="hidden text-base sm:block" />
        <StepProgress current={state.questionIndex - 1} total={state.maxQuestions} />
        <span className="shrink-0 text-[12.5px] font-semibold text-ink-subtle">
          Question {state.questionIndex} / {state.maxQuestions}
        </span>
        <Link
          to="/travail"
          className="hidden shrink-0 rounded-[10px] border border-line px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-muted hover:bg-muted sm:block"
        >
          Reprendre plus tard
        </Link>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 sm:py-12">
          <div className="w-full max-w-[560px]">
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone="accent">{currentSkill.domain_name}</Badge>
              <Badge tone="neutral">
                Niveau <Level value={currentSkill.school_level} />
              </Badge>
            </div>

            <RichText className="mb-7 font-display text-[22px] font-medium leading-snug text-ink sm:text-[27px]">
              {exercise.statement}
            </RichText>

            <AnswerInput
              exercise={exercise}
              value={answer}
              onChange={setAnswer}
              onSubmit={validate}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={skip}
                className="text-[13px] font-medium text-ink-subtle underline underline-offset-4 hover:text-ink"
              >
                Je ne sais pas encore
              </button>
              <Button size="lg" onClick={validate} disabled={answer === ''}>
                Valider
              </Button>
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 border-t border-divider bg-surface px-6 py-8 lg:w-[360px] lg:border-l lg:border-t-0 lg:px-7">
          <SectionLabel className="mb-4">Ce que le test cherche</SectionLabel>
          <p className="mb-6 text-[13px] leading-relaxed text-ink-muted">
            Chaque réponse fausse fait descendre le test d'un cran dans le graphe, jusqu'à la
            première compétence solide.
          </p>

          <TestTrace trace={trace} currentSkill={currentSkill} />

          <p className="mt-7 rounded-card border border-divider bg-canvas p-4 text-xs leading-relaxed text-ink-subtle">
            Environ 8 minutes. Rien n'est noté, aucun résultat n'est partagé sans ton accord.
          </p>
        </aside>
      </div>
    </div>
  )
}

/** Fil des competences deja evaluees, plus celle en cours. */
function TestTrace({
  trace,
  currentSkill,
}: {
  trace: { skillId: string; correct: boolean }[]
  currentSkill: Skill
}) {
  const recent = trace.slice(-3)

  return (
    <ol className="relative pl-[22px]">
      <span className="absolute bottom-2 left-[5px] top-2 w-0.5 bg-divider" aria-hidden />
      {recent.map((entry, index) => {
        const skill = getSkill(entry.skillId)
        if (!skill) return null
        return (
          <li key={`${entry.skillId}-${index}`} className="relative mb-5">
            <TraceDot color={entry.correct ? '#10B981' : '#EF4444'} />
            <p className="text-[13px] font-semibold leading-snug text-ink">{skill.label}</p>
            <p
              className={cn(
                'text-[11.5px] leading-relaxed',
                entry.correct ? 'text-mastered' : 'text-wrong-600',
              )}
            >
              {entry.correct ? 'Juste' : 'Faux · on remonte'} ·{' '}
              <Level value={skill.school_level} />
            </p>
          </li>
        )
      })}

      <li className="relative mb-5">
        <TraceDot color="#6366F1" />
        <p className="text-[13px] font-semibold leading-snug text-ink">{currentSkill.label}</p>
        <p className="text-[11.5px] leading-relaxed text-accent">
          En cours · <Level value={currentSkill.school_level} />
        </p>
      </li>

      <li className="relative opacity-50">
        <TraceDot color="#CBD5E1" />
        <p className="text-[13px] font-semibold leading-snug text-ink">Prérequis en amont</p>
        <p className="text-[11.5px] leading-relaxed text-ink-faint">À tester si besoin</p>
      </li>
    </ol>
  )
}

function TraceDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="absolute left-[-22px] top-1 h-3 w-3 rounded-full border-2 border-white"
      style={{ background: color, boxShadow: `0 0 0 2px ${color}` }}
    />
  )
}

/** Ecran 1e : la lacune racine est trouvee, on montre la chaine jusqu'a l'objectif. */
function PlacementResultView({ result, prenom }: { result: PlacementResult; prenom: string }) {
  const { session } = useAuthenticatedSession()
  const path = buildPathToTarget(session.progress, result.objectif_skill_id)
  const objectif = requireSkill(result.objectif_skill_id)
  const premiereLacune = result.lacunes_racines[0]
    ? requireSkill(result.lacunes_racines[0])
    : null

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-5 py-12">
      <div className="w-full max-w-[840px] animate-fade-up">
        <div className="mb-8 text-center">
          <Badge tone="accent" className="mb-4">
            Diagnostic terminé · {result.questions_posees} questions
          </Badge>
          <h1 className="font-display text-[28px] font-medium leading-tight tracking-[-0.015em] text-ink sm:text-[34px]">
            {prenom}, on a trouvé le point de départ
          </h1>
          <p className="mx-auto mt-3 max-w-[520px] text-sm leading-relaxed text-ink-subtle">
            {premiereLacune ? (
              <>
                Le blocage sur « {objectif.label} » vient de « {premiereLacune.label} », une
                compétence de <Level value={premiereLacune.school_level} />. On la répare, le
                reste suivra.
              </>
            ) : (
              <>Tout est acquis jusqu'à « {objectif.label} ». On peut attaquer directement.</>
            )}
          </p>
        </div>

        <Card className="mb-6 overflow-x-auto scroll-slim">
          <ol className="flex min-w-[560px] items-start">
            {path.map((step, index) => (
              <li key={step.skill.id} className="flex flex-1 items-center">
                <div className="flex-1 text-center">
                  <PathNodeCircle step={step} />
                  <p className="text-[13px] font-semibold leading-snug text-ink">
                    {step.skill.label}
                  </p>
                  <p className={cn('text-[11.5px] font-semibold leading-relaxed', nodeCaptionTone(step))}>
                    {nodeCaption(step)}
                  </p>
                </div>
                {index < path.length - 1 && (
                  <span className="relative mx-1 h-0.5 w-8 shrink-0 self-start bg-line" style={{ marginTop: 26 }}>
                    <span className="absolute -top-[3px] right-[-1px] h-0 w-0 border-y-4 border-l-[7px] border-y-transparent border-l-line" />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <StatCard
            value={String(result.competences_maitrisees)}
            tone="text-mastered"
            label={`compétences maîtrisées sur ${result.competences_totales}`}
          />
          <StatCard
            value={String(result.lacunes_racines.length)}
            tone="text-progress"
            label="lacune(s) racine à réparer d'abord"
          />
          <StatCard
            value={`~${result.estimation_semaines} sem.`}
            tone="text-ink"
            label="estimation à 15 min / jour"
          />
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/travail" size="lg">
            Commencer mon parcours
          </ButtonLink>
          <ButtonLink to="/parcours" size="lg" variant="secondary">
            Voir tout mon graphe
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

function PathNodeCircle({ step }: { step: ReturnType<typeof buildPathToTarget>[number] }) {
  const tone = step.isTarget
    ? 'border-dashed border-locked-200 bg-surface text-ink-subtle'
    : step.isRootGap
      ? 'border-accent bg-accent-50 text-accent-700'
      : step.status === 'mastered'
        ? 'border-mastered bg-mastered-50 text-mastered-700'
        : step.status === 'in_progress'
          ? 'border-progress bg-progress-50 text-progress-700'
          : 'border-locked-200 bg-muted text-ink-subtle'

  return (
    <span
      className={cn(
        'mx-auto mb-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-[13px] font-semibold',
        tone,
      )}
    >
      <Level value={step.skill.school_level} />
    </span>
  )
}

function nodeCaption(step: ReturnType<typeof buildPathToTarget>[number]): string {
  if (step.isTarget) return 'Objectif'
  if (step.isRootGap) return 'Lacune racine'
  if (step.status === 'mastered') return 'Acquis'
  if (step.status === 'in_progress') return 'Fragile'
  return 'Verrouillé'
}

function nodeCaptionTone(step: ReturnType<typeof buildPathToTarget>[number]): string {
  if (step.isTarget) return 'text-ink-faint'
  if (step.isRootGap) return 'text-accent'
  if (step.status === 'mastered') return 'text-mastered-700'
  if (step.status === 'in_progress') return 'text-progress-700'
  return 'text-ink-faint'
}

function StatCard({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <Card tone="flat" className="p-5">
      <p className={cn('font-display text-[26px] leading-none', tone)}>{value}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-subtle">{label}</p>
    </Card>
  )
}
