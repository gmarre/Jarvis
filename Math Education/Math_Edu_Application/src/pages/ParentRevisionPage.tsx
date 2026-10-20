import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { getExercisesForSkill, getSkill } from '@/content'
import { repository, RepositoryError } from '@/data'
import { exerciseLevelLabel, formatExpected } from '@/lib/exercise'
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingScreen, Notice } from '@/components/ui/Misc'
import { RichText } from '@/components/ui/RichText'
import type { CorrigeParent } from '@/types/domain'

// Revision avec le parent (sprint 4, point 3) : les exercices d'une
// competence, avec reponses et corriges. Decision de Gauthier : on part du
// principe que l'enfant ne va pas dans l'espace parent, les corriges y sont
// donc lisibles librement. La base ne les rend qu'a un parent rattache
// (corriges_pour_parent, migration 0019).

export default function ParentRevisionPage() {
  const { skillId = '' } = useParams()
  const skill = getSkill(skillId)
  const [corriges, setCorriges] = useState<CorrigeParent[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    repository
      .getCorrigesParent(skillId)
      .then((c) => !annule && setCorriges(c))
      .catch((cause) => {
        if (annule) return
        setCorriges([])
        setErreur(cause instanceof RepositoryError ? cause.message : 'Les corrigés n’ont pas pu être lus.')
      })
    return () => {
      annule = true
    }
  }, [skillId])

  if (!skill) return <Navigate to="/parent" replace />
  if (corriges === null) return <LoadingScreen label="Lecture des corrigés…" />

  const exercices = getExercisesForSkill(skillId)

  return (
    <AppShell>
      <PageBody className="max-w-[820px]">
        <PageHeader
          title={skill.label}
          subtitle={`${skill.school_level} · les exercices de cette compétence, avec leurs réponses et leurs corrigés, pour réviser avec votre enfant.`}
          actions={
            <ButtonLink to="/parent" variant="secondary" size="sm">
              Retour
            </ButtonLink>
          }
        />
        {erreur && (
          <Notice tone="progress" className="mb-4">
            {erreur}
          </Notice>
        )}
        <div className="flex flex-col gap-4">
          {exercices.map((ex) => {
            const c = corriges.find((x) => x.exercise_id === ex.id)
            const attendu = c
              ? formatExpected({
                  type: ex.type,
                  choices: ex.choices?.map((ch) => ({ ...ch, misconception: c.misconceptions[ch.key] ?? null })),
                  answer: c.answer,
                  solution_steps: c.solution_steps,
                })
              : null
            return (
              <Card key={ex.id}>
                <Badge tone="neutral" className="mb-3">
                  {exerciseLevelLabel(ex.level)}
                </Badge>
                <RichText className="text-[15px] leading-snug text-ink">{ex.statement}</RichText>
                <ExerciseFigure image={ex.image} className="mt-3" />
                {ex.choices && (
                  <ul className="mt-3 flex flex-col gap-1 text-[13px] text-ink-muted">
                    {ex.choices.map((ch) => (
                      <li key={ch.key}>
                        {ch.key}. <RichText as="inline">{ch.text}</RichText>
                      </li>
                    ))}
                  </ul>
                )}
                {c ? (
                  <details className="mt-3 rounded-xl border border-divider bg-canvas p-3">
                    <summary className="cursor-pointer text-[13px] font-semibold text-ink">
                      Réponse : <RichText as="inline">{attendu ?? ''}</RichText>
                    </summary>
                    <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[12.5px] text-ink-muted">
                      {c.solution_steps.map((step, i) => (
                        <li key={i}>
                          <RichText as="inline">{step}</RichText>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <p className="mt-3 text-[12px] text-ink-faint">Corrigé indisponible.</p>
                )}
              </Card>
            )
          })}
        </div>
      </PageBody>
    </AppShell>
  )
}
