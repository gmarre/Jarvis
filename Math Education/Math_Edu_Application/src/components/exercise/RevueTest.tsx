import { cn } from '@/lib/cn'
import { reponseLisible, type QuestionRevue } from '@/lib/revue'
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure'
import { Card, CardTitle } from '@/components/ui/Card'
import { IconCheck, IconClose } from '@/components/ui/icons'
import { RichText } from '@/components/ui/RichText'

// Correction du test de positionnement, montree a la fin du test seulement
// (sprint 2, point 1) : pendant le test, le corrige casserait le rythme et
// ferait du diagnostic une lecon. A la fin, l'eleve revoit chaque question, sa
// reponse, la bonne reponse et le corrige.
//
// Aucune cle ne transite en plus : la correction est celle que le serveur rend
// apres chaque reponse (fonction `corriger`). Pour une question passee avec
// « Je ne sais pas encore », elle est demandee au serveur en fond, et n'est
// affichee qu'ici.

export function RevueTest({ questions }: { questions: QuestionRevue[] }) {
  if (questions.length === 0) return null
  const justes = questions.filter((q) => q.correction?.isCorrect).length

  return (
    <Card className="mb-7 text-left">
      <CardTitle>Revoir tes réponses</CardTitle>
      <p className="mb-4 text-[13px] leading-relaxed text-ink-subtle">
        {justes} réponse{justes > 1 ? 's' : ''} juste{justes > 1 ? 's' : ''} sur {questions.length}.
        Le test ne note rien : chaque erreur a seulement montré par où commencer.
      </p>
      <ol className="flex flex-col gap-3">
        {questions.map((q, index) => (
          <li key={`${q.exercise.id}-${index}`}>
            <QuestionDetail numero={index + 1} question={q} />
          </li>
        ))}
      </ol>
    </Card>
  )
}

function QuestionDetail({ numero, question }: { numero: number; question: QuestionRevue }) {
  const { exercise, reponse, correction } = question
  const juste = correction?.isCorrect === true

  return (
    <details className="rounded-card border border-divider bg-canvas p-4">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full text-white',
            juste ? 'bg-mastered' : 'bg-progress',
          )}
        >
          {juste ? <IconCheck size={15} /> : <IconClose size={15} />}
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-ink">
          Question {numero}
          <span className="ml-2 font-medium text-ink-subtle">
            {juste ? 'juste' : reponse === null ? 'passée' : 'à revoir'}
          </span>
        </span>
      </summary>

      <div className="mt-3">
        <RichText className="text-[14px] leading-relaxed text-ink">{exercise.statement}</RichText>
        <ExerciseFigure image={exercise.image} className="mt-3" />

        <dl className="mt-3 grid gap-1.5 text-[13px] leading-relaxed">
          <div>
            <dt className="inline font-semibold text-ink-muted">Ta réponse : </dt>
            <dd className="inline text-ink">
              {reponse === null ? (
                'aucune, tu as passé la question'
              ) : (
                <RichText as="inline">{reponseLisible(exercise, reponse)}</RichText>
              )}
            </dd>
          </div>
          {correction && !juste && (
            <div>
              <dt className="inline font-semibold text-ink-muted">Bonne réponse : </dt>
              <dd className="inline text-ink">
                <RichText as="inline">{correction.expected}</RichText>
              </dd>
            </div>
          )}
        </dl>

        {correction?.misconception && reponse !== null && !juste && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-progress-900/80">
            {correction.misconception}
          </p>
        )}

        {correction ? (
          <ol className="mt-3 flex flex-col gap-2">
            {correction.solutionSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-ink-muted">
                  {i + 1}
                </span>
                <RichText className="text-[13px] leading-relaxed text-ink-muted">{step}</RichText>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-subtle">
            Le corrigé n'a pas pu être chargé. Tu retrouveras cet exercice dans ton parcours.
          </p>
        )}
      </div>
    </details>
  )
}
