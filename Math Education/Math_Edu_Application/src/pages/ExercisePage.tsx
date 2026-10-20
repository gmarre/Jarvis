import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { getExercisesForSkill, getFlashcardsForSkill, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { exerciseLevelLabel } from '@/lib/exercise'
import { formatDateLong, formatDuration } from '@/lib/format'
import { controleDu, exerciceDeControle } from '@/lib/maitrise'
import { AnswerInput } from '@/components/exercise/AnswerInput'
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure'
import { RecettePanel } from '@/components/recette/RecettePanel'
import { FocusFrame } from '@/components/layout/FocusFrame'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Level } from '@/components/ui/Misc'
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

/**
 * La seance est rejouee par une cle : « Consolider maintenant » apres un
 * controle rate repart d'une seance neuve (toute la banque), sur la meme
 * adresse, que React Router ne remonterait pas de lui-meme.
 */
export default function ExercisePage() {
  const { skillId = '' } = useParams()
  const [seance, setSeance] = useState(0)
  return (
    <ExerciseSession
      key={`${skillId}-${seance}`}
      skillId={skillId}
      onReprendre={() => setSeance((n) => n + 1)}
    />
  )
}

function ExerciseSession({ skillId, onReprendre }: { skillId: string; onReprendre: () => void }) {
  const navigate = useNavigate()
  const { answerExercise, session } = useAuthenticatedSession()

  const skill = getSkill(skillId)
  // Controle d'une competence acquise (niveau 4, echeance passee) : un seul
  // exercice, fige a l'ouverture de l'ecran. Sinon, toute la banque.
  const [modeControle] = useState(() => {
    const entree = session.progress[skillId]
    return entree !== undefined && controleDu(entree, new Date())
  })
  const exercises = useMemo(() => {
    const tous = getExercisesForSkill(skillId)
    if (!modeControle) return tous
    const choisi = exerciceDeControle(
      tous,
      session.attempts.filter((a) => a.skill_id === skillId),
    )
    return choisi ? [choisi] : tous
    // Les tentatives changent a chaque reponse : la liste, elle, reste celle de
    // l'ouverture de l'ecran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, modeControle])

  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('question')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [showHint, setShowHint] = useState(false)
  /** Correction en cours : le serveur n'a pas encore repondu. */
  const [correcting, setCorrecting] = useState(false)
  const [correctionError, setCorrectionError] = useState<string | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [masteredDuringSession, setMasteredDuringSession] = useState(false)
  const [descendTo, setDescendTo] = useState<string[]>([])
  /** Dernier resultat utile au bilan : controle et niveau atteint. */
  const [dernier, setDernier] = useState<AnswerResult | null>(null)
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

  const validate = async () => {
    if (!exercise || answer === '' || correcting) return
    const durationS = Math.round((Date.now() - startedAt.current) / 1000)

    setCorrecting(true)
    setCorrectionError(null)
    let outcome: AnswerResult
    try {
      outcome = await answerExercise(exercise, answer, durationS)
    } catch (cause) {
      // La reponse reste saisie : l'eleve n'a qu'a valider a nouveau.
      setCorrectionError(cause instanceof Error ? cause.message : String(cause))
      return
    } finally {
      setCorrecting(false)
    }

    setResult(outcome)
    setScore((current) => ({
      correct: current.correct + (outcome.isCorrect ? 1 : 0),
      total: current.total + 1,
    }))
    if (outcome.justMastered) setMasteredDuringSession(true)
    setDernier(outcome)
    if (outcome.shouldDescend) setDescendTo(outcome.descendTo)
    setPhase('correction')
  }

  const next = () => {
    // Une competence qui vient d'etre acquise termine la seance : une erreur
    // juste apres la rouvrirait avant meme son premier controle (J+3).
    if (index + 1 >= exercises.length || result?.justMastered) {
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
        defiSkillId={getFlashcardsForSkill(skill.id).length > 0 ? skill.id : null}
        dernier={dernier}
        onReprendre={onReprendre}
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

        <ExerciseFigure image={exercise.image} className="-mt-3 mb-6" />

        <AnswerInput
          exercise={exercise}
          value={answer}
          onChange={setAnswer}
          onSubmit={() => void validate()}
          disabled={phase === 'correction' || correcting}
          feedback={
            phase === 'correction' ? (result?.isCorrect ? 'correct' : 'wrong') : 'none'
          }
          expectedKey={result?.expectedKey ?? null}
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

            {correctionError && (
              <p role="alert" className="mt-5 text-[13px] font-medium text-wrong">
                {correctionError}
              </p>
            )}

            <div className="mt-7 flex justify-end">
              <Button
                size="lg"
                onClick={() => void validate()}
                disabled={answer === '' || correcting}
              >
                {correcting ? 'Correction…' : 'Valider'}
              </Button>
            </div>
          </>
        )}

        {phase === 'correction' && result && (
          <CorrectionPanel
            result={result}
            solutionSteps={result.solutionSteps}
            onNext={next}
            isLast={index + 1 >= exercises.length || result.justMastered}
          />
        )}
      </Card>

      {/* Relecteurs seulement : ne rend rien pour un eleve. */}
      <RecettePanel itemType="exercise" itemId={exercise.id} className="mt-4" />
    </FocusFrame>
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
              Compétence acquise : niveau 4 sur 5. Un premier contrôle dans 3 jours vérifiera
              qu'elle tient.
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
  defiSkillId,
  dernier,
  onReprendre,
}: {
  skillLabel: string
  score: { correct: number; total: number }
  mastered: boolean
  descendTo: string[]
  mindmapId: string | null
  /** Competence dont les cartes defi sont a proposer ensuite, ou null. */
  defiSkillId: string | null
  dernier: AnswerResult | null
  onReprendre: () => void
}) {
  const navigate = useNavigate()
  const prerequisite = descendTo[0] ? getSkill(descendTo[0]) : null

  return (
    <FocusFrame title={skillLabel} onQuit={() => navigate('/travail')}>
      <Card className="animate-fade-up p-7 text-center sm:p-9">
        <Badge tone={mastered || dernier?.controle === 'reussi' ? 'mastered' : 'accent'} className="mb-4">
          {dernier?.controle === 'reussi'
            ? 'Contrôle réussi'
            : dernier?.controle === 'rate'
              ? 'À consolider'
              : mastered
                ? 'Compétence acquise'
                : 'Séance terminée'}
        </Badge>

        <h1 className="font-display text-[24px] font-medium leading-snug text-ink sm:text-[28px]">
          {skillLabel}
        </h1>
        <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-relaxed text-ink-subtle">
          {score.correct} bonne{score.correct > 1 ? 's' : ''} réponse
          {score.correct > 1 ? 's' : ''} sur {score.total}.{' '}
          {dernier?.controle === 'reussi'
            ? dernier.niveau === 5
              ? 'Complètement acquise : niveau 5 sur 5, plus besoin de contrôle.'
              : `C'est toujours acquis. Prochain contrôle le ${
                  dernier.prochainControle ? formatDateLong(dernier.prochainControle) : 'bientôt'
                }.`
            : dernier?.controle === 'rate'
              ? 'Cette compétence a besoin d’être consolidée : elle revient dans ton travail, un exercice de maîtrise réussi la validera de nouveau.'
              : mastered
                ? 'Niveau 4 sur 5 : la compétence passe au vert et débloque la suite. Un premier contrôle dans 3 jours vérifiera qu’elle tient.'
                : "Ce n'est pas encore solide, on y revient bientôt."}
        </p>
        {dernier?.controle === 'rate' && (
          <Button size="sm" className="mt-4" onClick={onReprendre}>
            Consolider maintenant
          </Button>
        )}

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

        {defiSkillId && !prerequisite && (
          <div className="mt-6 rounded-card border border-accent-100 bg-accent-50 p-4 text-left">
            <p className="text-[12.5px] font-semibold text-accent-700">Défi : retrouve-le de tête</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-accent-700/80">
              Quelques cartes question et réponse pour vérifier que l'essentiel tient en mémoire.
            </p>
            <ButtonLink to={`/defi/${defiSkillId}`} size="sm" className="mt-3">
              Faire les cartes défi
            </ButtonLink>
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
