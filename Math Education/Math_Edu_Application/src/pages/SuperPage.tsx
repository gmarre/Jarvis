import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { getSkill, getSuper } from '@/content'
import { cn } from '@/lib/cn'
import { resultatSuper, type ResultatQuestion } from '@/lib/super'
import { AnswerInput } from '@/components/exercise/AnswerInput'
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure'
import { FocusFrame } from '@/components/layout/FocusFrame'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RichText } from '@/components/ui/RichText'
import { IconCheck, IconClose, IconHint } from '@/components/ui/icons'
import { NiveauMaitrise } from '@/components/ui/NiveauMaitrise'
import type { Niveau } from '@/lib/maitrise'
import { useAuthenticatedSession, type EffetSuper } from '@/state/session'
import { questionCommeExercice, type SuperExercise } from '@/types/content'

// Super exercice (sprint 2, point 7) : un probleme long porte par une
// competence, qui en est l'epreuve finale. Ce qu'il travaille d'abord : lire
// un enonce long, trier les donnees (certaines ne servent a rien), et faire
// converger des notions de plusieurs domaines.
//
// Deroule d'examen : l'enonce reste visible, les questions s'enchainent, on
// peut revenir en arriere, et la copie se rend d'un bloc. La correction
// (serveur) arrive ensuite, question par question, avec le bareme.

type Phase = 'consigne' | 'epreuve' | 'correction'

export default function SuperPage() {
  const { superId = '' } = useParams()
  const sx = getSuper(superId)
  if (!sx) return <Navigate to="/parcours" replace />
  return <SuperEpreuve key={sx.id} sx={sx} />
}

function SuperEpreuve({ sx }: { sx: SuperExercise }) {
  const navigate = useNavigate()
  const { rendreSuper } = useAuthenticatedSession()
  const [phase, setPhase] = useState<Phase>('consigne')
  const [index, setIndex] = useState(0)
  const [reponses, setReponses] = useState<Record<string, string>>({})
  const [enCorrection, setEnCorrection] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [resultats, setResultats] = useState<ResultatQuestion[] | null>(null)
  /** Ce que le passage a change pour la competence porteuse (niveau sur 5). */
  const [effet, setEffet] = useState<EffetSuper | null>(null)
  /** Indices deplies, par question : ils restent ouverts quand on revient en arriere. */
  const [indices, setIndices] = useState<Record<string, boolean>>({})
  const debut = useRef(Date.now())

  const porteuse = getSkill(sx.skill_id)
  const total = sx.questions.reduce((n, q) => n + q.points, 0)
  const quitter = () => navigate('/travail')

  if (phase === 'consigne') {
    const autres = sx.skill_ids.filter((id) => id !== sx.skill_id).map((id) => getSkill(id))
    return (
      <FocusFrame title={sx.title} onQuit={quitter}>
        <Card className="animate-fade-up p-7 sm:p-9">
          <Badge tone="accent" className="mb-4">
            Super exercice · épreuve finale
          </Badge>
          <h1 className="font-display text-[24px] font-medium leading-snug text-ink sm:text-[28px]">
            {sx.title}
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-subtle">
            Un problème d'environ {sx.duree_estimee_min} minutes, en {sx.questions.length} questions
            notées sur {total} points. Il porte sur « {porteuse?.label ?? sx.skill_id} » et fait aussi appel
            à {autres.length === 1 ? 'une autre compétence' : `${autres.length} autres compétences`} :{' '}
            {autres.map((s) => s?.label).filter(Boolean).join(', ')}.
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-[13px] leading-relaxed text-ink-muted">
            <li>Lis tout l'énoncé avant de commencer : certaines informations ne servent à rien.</li>
            <li>L'énoncé reste affiché pendant toutes les questions.</li>
            <li>Tu peux revenir sur une question avant de rendre ta copie.</li>
            <li>Une calculatrice n'est pas nécessaire ; un brouillon, si.</li>
          </ul>
          <div className="mt-7 flex justify-end">
            <Button
              size="lg"
              onClick={() => {
                debut.current = Date.now()
                setPhase('epreuve')
              }}
            >
              Commencer
            </Button>
          </div>
        </Card>
      </FocusFrame>
    )
  }

  if (phase === 'correction' && resultats) {
    const bilan = resultatSuper(sx, resultats)
    return (
      <FocusFrame title={sx.title} onQuit={quitter}>
        <Card className="animate-fade-up p-7 text-center sm:p-9">
          <Badge tone={bilan.reussi ? 'mastered' : 'accent'} className="mb-4">
            {bilan.reussi ? 'Épreuve réussie' : 'Pas encore'}
          </Badge>
          <h1 className="font-display text-[24px] font-medium leading-snug text-ink sm:text-[28px]">
            {bilan.score} / {bilan.total} points
          </h1>
          <p className="mx-auto mt-3 max-w-[460px] text-[13.5px] leading-relaxed text-ink-subtle">
            {bilan.reussi
              ? 'Tu as su lire un énoncé long et faire travailler ensemble plusieurs notions : c’est exactement ce qui est demandé.'
              : `Il faut ${bilan.seuil} points pour réussir. Relis les corrigés ci-dessous, puis retravaille ${
                  bilan.aRetravailler.length === 1 ? 'la compétence' : 'les compétences'
                } en cause avant de retenter.`}
          </p>
          {effet && effet.niveauApres !== effet.niveauAvant && (
            <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[13px] font-semibold text-ink">
              <NiveauMaitrise niveau={effet.niveauApres as Niveau} />
              <span>
                « {porteuse?.label ?? sx.skill_id} » : niveau {effet.niveauAvant} → {effet.niveauApres} sur 5
              </span>
            </div>
          )}
          {effet?.justMastered && (
            <p className="mx-auto mt-1.5 max-w-[460px] text-[12.5px] font-medium leading-relaxed text-mastered-700">
              Compétence acquise : elle ouvre la voie aux suivantes. Un premier contrôle dans 3 jours
              vérifiera qu'elle tient.
            </p>
          )}
          {effet?.niveauApres === 5 && effet.niveauAvant !== 5 && (
            <p className="mx-auto mt-1.5 max-w-[460px] text-[12.5px] font-medium leading-relaxed text-mastered-700">
              Sans faute, après tous les contrôles : complètement acquise.
            </p>
          )}
          {bilan.reussi && bilan.score < bilan.total && effet && effet.niveauApres >= 4 && effet.niveauApres < 5 && (
            <p className="mx-auto mt-1.5 max-w-[460px] text-[12.5px] leading-relaxed text-ink-subtle">
              Pour le niveau 5 sur 5, il faudra un jour le réussir sans aucune faute.
            </p>
          )}
          {!bilan.reussi && bilan.aRetravailler.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {bilan.aRetravailler.map((id) => (
                <ButtonLink key={id} to={`/exercice/${id}`} variant="secondary" size="sm">
                  {getSkill(id)?.label ?? id}
                </ButtonLink>
              ))}
            </div>
          )}
        </Card>

        <ol className="mt-6 flex flex-col gap-4">
          {sx.questions.map((q, i) => {
            const r = resultats[i]
            return (
              <li key={q.key}>
                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-white',
                        r.correction.isCorrect ? 'bg-mastered' : 'bg-progress',
                      )}
                    >
                      {r.correction.isCorrect ? <IconCheck size={15} /> : <IconClose size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-ink-subtle">
                        Question {i + 1} · {r.correction.isCorrect ? q.points : 0} / {q.points} point
                        {q.points > 1 ? 's' : ''}
                      </p>
                      <RichText className="mt-1 text-[14px] leading-snug text-ink">{q.statement}</RichText>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
                        Ta réponse :{' '}
                        {r.reponse.trim() === '' ? 'aucune' : <RichText as="inline">{r.affichee}</RichText>}
                        {!r.correction.isCorrect && (
                          <>
                            {' '}· attendue : <RichText as="inline">{r.correction.expected}</RichText>
                          </>
                        )}
                      </p>
                      {r.correction.misconception && (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-progress-900/80">
                          {r.correction.misconception}
                        </p>
                      )}
                      <details className="mt-3" open={!r.correction.isCorrect}>
                        <summary className="cursor-pointer text-[12.5px] font-semibold text-ink marker:text-ink-faint">
                          Le corrigé
                        </summary>
                        <ol className="mt-2 flex flex-col gap-2">
                          {r.correction.solutionSteps.map((step, n) => (
                            <li key={n}>
                              <RichText className="text-[12.5px] leading-relaxed text-ink-muted">{step}</RichText>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ol>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/travail" size="lg">
            Retour à mon espace
          </ButtonLink>
          <ButtonLink to="/parcours" variant="secondary" size="lg">
            Voir mon parcours
          </ButtonLink>
        </div>
      </FocusFrame>
    )
  }

  const q = sx.questions[index]
  const exercice = questionCommeExercice(sx, q)
  const derniere = index === sx.questions.length - 1
  const valeur = reponses[q.key] ?? ''

  async function rendre() {
    setEnCorrection(true)
    setErreur(null)
    try {
      // Toute la copie part au serveur, qui corrige et compte les points
      // (sprint 6). Une question laissee vide y est comptee fausse, et sa
      // correction rapporte le corrige a afficher.
      const { corrections: parCle, effet: changement } = await rendreSuper(
        sx,
        Object.fromEntries(sx.questions.map((question) => [question.key, reponses[question.key] ?? ''])),
        Math.round((Date.now() - debut.current) / 1000),
      )
      const corrections = sx.questions.map((question) => {
        const reponse = reponses[question.key] ?? ''
        const exo = questionCommeExercice(sx, question)
        const correction = parCle[question.key]
        if (!correction) throw new Error(`Correction absente pour ${question.key}`)
        return {
          key: question.key,
          reponse,
          affichee: afficherReponse(exo.choices, question.type, reponse),
          correction,
        }
      })
      setEffet(changement)
      setResultats(corrections)
      setPhase('correction')
    } catch {
      setErreur('La correction n’a pas pu se faire. Vérifie ta connexion, puis rends ta copie de nouveau : tes réponses sont gardées.')
    } finally {
      setEnCorrection(false)
    }
  }

  return (
    <FocusFrame
      title={sx.title}
      onQuit={quitter}
      progress={{ current: index + 1, total: sx.questions.length }}
      counter={`${index + 1} / ${sx.questions.length}`}
    >
      <details open className="mb-5 rounded-card border border-divider bg-surface p-4 sm:p-5">
        <summary className="cursor-pointer text-[12px] font-semibold uppercase tracking-wide text-ink-subtle marker:text-ink-faint">
          L'énoncé
        </summary>
        <RichText className="mt-3 text-[14.5px] leading-relaxed text-ink">{sx.contexte}</RichText>
        {sx.image && <ExerciseFigure image={sx.image} className="mt-4" />}
      </details>

      <Card key={q.key} className="animate-fade-up p-6 sm:p-7">
        <p className="mb-2 text-[12px] font-semibold text-ink-subtle">
          Question {index + 1} · {q.points} point{q.points > 1 ? 's' : ''}
        </p>
        <RichText className="mb-6 font-display text-[19px] font-medium leading-snug text-ink sm:text-[22px]">
          {q.statement}
        </RichText>
        <AnswerInput
          exercise={exercice}
          value={valeur}
          onChange={(v) => setReponses((r) => ({ ...r, [q.key]: v }))}
          disabled={enCorrection}
          onSubmit={() => (derniere ? undefined : setIndex((i) => i + 1))}
        />

        {q.hint && (
          <div className="mt-5">
            {indices[q.key] ? (
              <div className="flex items-start gap-3 rounded-card border border-progress-200 bg-progress-50 p-4">
                <IconHint size={18} className="mt-px shrink-0 text-progress-700" />
                <RichText className="text-[13px] leading-relaxed text-progress-900">{q.hint}</RichText>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIndices((v) => ({ ...v, [q.key]: true }))}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-subtle underline underline-offset-4 hover:text-ink"
              >
                <IconHint size={16} />
                Un coup de pouce
              </button>
            )}
          </div>
        )}
      </Card>

      {erreur && (
        <p role="alert" className="mt-4 rounded-card border border-progress-200 bg-progress-50 p-3 text-[12.5px] text-progress-900">
          {erreur}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="lg" disabled={index === 0 || enCorrection} onClick={() => setIndex((i) => i - 1)}>
          Précédente
        </Button>
        {derniere ? (
          <Button size="lg" disabled={enCorrection} onClick={() => void rendre()}>
            {enCorrection ? 'Correction…' : 'Rendre ma copie'}
          </Button>
        ) : (
          <Button size="lg" onClick={() => setIndex((i) => i + 1)}>
            Question suivante
          </Button>
        )}
      </div>
    </FocusFrame>
  )
}

/** Reponse telle que l'eleve l'a donnee : le texte d'une proposition, « Vrai »… */
function afficherReponse(
  choices: { key: string; text: string }[] | undefined,
  type: string,
  reponse: string,
): string {
  if (type === 'vrai_faux') return reponse === 'true' ? 'Vrai' : 'Faux'
  if (type === 'qcm') return choices?.find((c) => c.key === reponse)?.text ?? reponse
  return reponse
}
