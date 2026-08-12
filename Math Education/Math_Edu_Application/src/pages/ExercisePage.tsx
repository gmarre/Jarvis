import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { getExercisesForSkill, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { exerciseLevelLabel } from '@/lib/exercise'
import { formatDuration } from '@/lib/format'
import { AnswerInput } from '@/components/exercise/AnswerInput'
import { Wordmark } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Level } from '@/components/ui/Misc'
import { StepProgress } from '@/components/ui/Progress'
import { RichText } from '@/components/ui/RichText'
import { IconCheck, IconClose, IconHint } from '@/components/ui/icons'
import { useAuthenticatedSession, type AnswerResult } from '@/state/session'

// Ecran 5 : lecteur d'exercice. Absent des maquettes Claude Design, dessine
// ici dans le meme systeme (memes couleurs, meme typo, memes cartes).
//
// Deux partis pris pedagogiques :
//  - la correction n'est jamais une sanction : on montre le corrige etape par
//    etape, et la mauvaise reponse d'un QCM explique l'erreur de raisonnement ;
//  - trois echecs de suite ne s'acharnent pas : le moteur propose de redescendre
//    sur le prerequis fautif, c'est la regle 3 du DAG.

type Phase = 'question' | 'correction' | 'bilan'

export default function ExercisePage() {
  const { skillId = '' } = useParams()
  const navigate = useNavigate()
  const { answerExercise } = useAuthenticatedSession()

  const skill = getSkill(skillId)
  const exercises = useMemo(() => getExercisesForSkill(skillId), [skillId])

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('question')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [masteredDuringSession, setMasteredDuringSession] = useState(false)
  const [descendTo, setDescendTo] = useState<string[]>([])
  const startedAt = useRef(Date.now())

  const exercise = exercises[index]

  useEffect(() => {
    startedAt.current = Date.now()
  }, [index])

  if (!skill) return <Navigate to="/parcours" replace />

  if (exercises.length === 0) {
    return (
      <FocusFrame title={skill.label} onQuit={() => navigate('/parcours')}>
        <Card tone="dashed" className="py-12">
          <EmptyState
            title="Pas encore d'exercices"
            description="Cette compétence attend sa banque d'exercices. Le contenu pilote couvre pour l'instant la numération et les fractions."
            action={
              <ButtonLink to="/parcours" variant="secondary" size="lg">
                Retour au parcours
              </ButtonLink>
            }
          />
        </Card>
      </FocusFrame>
    )
  }

  const validate = () => {
    if (!exercise || answer === '') return
    const durationS = Math.round((Date.now() - startedAt.current) / 1000)
    const outcome = answerExercise(exercise, answer, durationS)

    setResult(outcome)
    setScore((current) => ({
      correct: current.correct + (outcome.isCorrect ? 1 : 0),
      total: current.total + 1,
    }))
    if (outcome.justMastered) setMasteredDuringSession(true)
    if (outcome.shouldDescend) setDescendTo(outcome.descendTo)
    setPhase('correction')
  }

  const next = () => {
    if (index + 1 >= exercises.length) {
      setPhase('bilan')
      return
    }
    setIndex((current) => current + 1)
    setAnswer('')
    setResult(null)
    setShowHint(false)
    setPhase('question')
  }

  if (phase === 'bilan') {
    return (
      <SessionSummary
        skillLabel={skill.label}
        score={score}
        mastered={masteredDuringSession}
        descendTo={descendTo}
        mindmapId={skill.mindmap_id}
      />
    )
  }

  return (
    <FocusFrame
      title={skill.label}
      onQuit={() => navigate('/travail')}
      progress={{ current: index + (phase === 'correction' ? 1 : 0), total: exercises.length }}
      counter={`Exercice ${index + 1} / ${exercises.length}`}
    >
      <Card className="animate-fade-in p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{skill.domain_name}</Badge>
          <Badge tone="neutral">{exerciseLevelLabel(exercise.level)}</Badge>
          <Badge tone="neutral">
            Niveau <Level value={skill.school_level} />
          </Badge>
          <span className="ml-auto text-[11.5px] text-ink-faint">
            ≈ {formatDuration(exercise.estimated_duration_s)}
          </span>
        </div>

        <RichText className="mb-7 font-display text-[20px] font-medium leading-snug text-ink sm:text-[24px]">
          {exercise.statement}
        </RichText>

        <AnswerInput
          exercise={exercise}
          value={answer}
          onChange={setAnswer}
          onSubmit={validate}
          disabled={phase === 'correction'}
          feedback={
            phase === 'correction' ? (result?.isCorrect ? 'correct' : 'wrong') : 'none'
          }
        />

        {phase === 'question' && (
          <>
            {exercise.hint && (
              <div className="mt-5">
                {showHint ? (
                  <div className="flex items-start gap-3 rounded-card border border-progress-200 bg-progress-50 p-4">
                    <IconHint size={18} className="mt-px shrink-0 text-progress-700" />
                    <RichText className="text-[13px] leading-relaxed text-progress-900">
                      {exercise.hint}
                    </RichText>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-subtle underline underline-offset-4 hover:text-ink"
                  >
                    <IconHint size={16} />
                    Un coup de pouce
                  </button>
                )}
              </div>
            )}

            <div className="mt-7 flex justify-end">
              <Button size="lg" onClick={validate} disabled={answer === ''}>
                Valider
              </Button>
            </div>
          </>
        )}

        {phase === 'correction' && result && (
          <CorrectionPanel
            result={result}
            solutionSteps={exercise.solution_steps}
            onNext={next}
            isLast={index + 1 >= exercises.length}
          />
        )}
      </Card>
    </FocusFrame>
  )
}

/** Cadre plein ecran des modes concentres : test, exercice, carte mentale. */
function FocusFrame({
  title,
  onQuit,
  progress,
  counter,
  children,
}: {
  title: string
  onQuit: () => void
  progress?: { current: number; total: number }
  counter?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex items-center gap-4 border-b border-divider bg-surface px-5 py-3.5 sm:px-8">
        <Wordmark className="hidden text-base sm:block" />
        <span className="truncate text-[13px] font-semibold text-ink sm:hidden">{title}</span>
        {progress && <StepProgress current={progress.current} total={progress.total} />}
        {counter && (
          <span className="shrink-0 text-[12.5px] font-semibold text-ink-subtle">{counter}</span>
        )}
        <button
          type="button"
          onClick={onQuit}
          aria-label="Quitter"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line text-ink-muted transition hover:bg-muted"
        >
          <IconClose size={17} />
        </button>
      </header>

      <div className="flex flex-1 justify-center px-5 py-7 sm:px-8 sm:py-10">
        <div className="w-full max-w-[680px]">{children}</div>
      </div>
    </div>
  )
}

/** Correction : verdict, erreur de raisonnement, puis corrige detaille. */
function CorrectionPanel({
  result,
  solutionSteps,
  onNext,
  isLast,
}: {
  result: AnswerResult
  solutionSteps: string[]
  onNext: () => void
  isLast: boolean
}) {
  return (
    <div className="mt-6 animate-fade-up">
      <div
        className={cn(
          'flex items-start gap-3 rounded-card border p-4',
          result.isCorrect
            ? 'border-mastered-200 bg-mastered-50'
            : 'border-progress-200 bg-progress-50',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full text-white',
            result.isCorrect ? 'bg-mastered' : 'bg-progress',
          )}
        >
          {result.isCorrect ? <IconCheck size={15} /> : <IconClose size={15} />}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-semibold leading-snug',
              result.isCorrect ? 'text-mastered-900' : 'text-progress-900',
            )}
          >
            {result.isCorrect ? "C'est juste." : `Pas encore. La réponse était : ${result.expected}`}
          </p>
          {result.misconception && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-progress-900/80">
              {result.misconception}
            </p>
          )}
          {result.justMastered && (
            <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-mastered-700">
              Compétence acquise. Elle passe en révision espacée, tu la reverras dans un jour.
            </p>
          )}
        </div>
      </div>

      <details className="mt-4 rounded-card border border-divider bg-canvas p-4" open={!result.isCorrect}>
        <summary className="cursor-pointer text-[13px] font-semibold text-ink marker:text-ink-faint">
          Le corrigé, étape par étape
        </summary>
        <ol className="mt-3 flex flex-col gap-2.5">
          {solutionSteps.map((step, stepIndex) => (
            <li key={stepIndex} className="flex gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-ink-muted">
                {stepIndex + 1}
              </span>
              <RichText className="text-[13px] leading-relaxed text-ink-muted">{step}</RichText>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={onNext}>
          {isLast ? 'Voir le bilan' : 'Exercice suivant'}
        </Button>
      </div>
    </div>
  )
}

/** Bilan de seance : ce qui a bouge, et la suite proposee. */
function SessionSummary({
  skillLabel,
  score,
  mastered,
  descendTo,
  mindmapId,
}: {
  skillLabel: string
  score: { correct: number; total: number }
  mastered: boolean
  descendTo: string[]
  mindmapId: string | null
}) {
  const navigate = useNavigate()
  const prerequisite = descendTo[0] ? getSkill(descendTo[0]) : null

  return (
    <FocusFrame title={skillLabel} onQuit={() => navigate('/travail')}>
      <Card className="animate-fade-up p-7 text-center sm:p-9">
        <Badge tone={mastered ? 'mastered' : 'accent'} className="mb-4">
          {mastered ? 'Compétence acquise' : 'Séance terminée'}
        </Badge>

        <h1 className="font-display text-[24px] font-medium leading-snug text-ink sm:text-[28px]">
          {skillLabel}
        </h1>
        <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-relaxed text-ink-subtle">
          {score.correct} bonne{score.correct > 1 ? 's' : ''} réponse
          {score.correct > 1 ? 's' : ''} sur {score.total}.{' '}
          {mastered
            ? 'Le seuil de maîtrise est atteint : la compétence passe au vert et débloque la suite.'
            : "Ce n'est pas encore solide, on y revient bientôt."}
        </p>

        {prerequisite && (
          <div className="mt-6 rounded-card border border-accent-100 bg-accent-50 p-4 text-left">
            <p className="text-[12.5px] font-semibold text-accent-700">
              On remonte d'un cran plutôt que d'insister
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-accent-700/80">
              Les erreurs viennent probablement de « {prerequisite.label} » (
              {prerequisite.school_level}). C'est là qu'il faut travailler d'abord.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => navigate(`/exercice/${prerequisite.id}`)}
            >
              Travailler ce prérequis
            </Button>
          </div>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/travail" size="lg">
            Retour à mon espace
          </ButtonLink>
          {mindmapId && (
            <ButtonLink to={`/cartes/${mindmapId}`} variant="secondary" size="lg">
              Revoir la carte mentale
            </ButtonLink>
          )}
        </div>

        <Link
          to="/parcours"
          className="mt-5 inline-block text-[13px] font-semibold text-accent hover:text-accent-600"
        >
          Voir l'effet sur mon graphe
        </Link>
      </Card>
    </FocusFrame>
  )
}
