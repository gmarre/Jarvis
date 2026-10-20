import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { getExercisesForSkill, getFlashcardsForSkill, getSkill } from '@/content'
import { cartesDeLaSeance } from '@/lib/defis'
import { formatDateLong } from '@/lib/format'
import { FocusFrame } from '@/components/layout/FocusFrame'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Misc'
import { RichText } from '@/components/ui/RichText'
import { useAuthenticatedSession } from '@/state/session'
import type { Flashcard } from '@/types/content'

// Cartes defi, recto et verso (sprint 2, point 4).
//
// L'eleve lit la question, cherche de tete, retourne la carte, puis dit
// honnetement s'il savait. Rien n'est note : c'est un entrainement de memoire,
// et une auto-evaluation sincere vaut mieux qu'un score. Une carte ratee
// revient une fois a la fin de la seance, puis le lendemain (lib/defis.ts).

export default function DefiPage() {
  const { skillId = '' } = useParams()
  const navigate = useNavigate()
  const { session, reviserDefi } = useAuthenticatedSession()
  const skill = getSkill(skillId)

  // La file est figee a l'ouverture : une carte revue pendant la seance ne
  // doit pas disparaitre ou reapparaitre sous les yeux de l'eleve.
  const [file, setFile] = useState<Flashcard[]>(() =>
    cartesDeLaSeance(getFlashcardsForSkill(skillId), session.defis, new Date()),
  )
  const [rejouees] = useState(() => new Set<string>())
  const [index, setIndex] = useState(0)
  const [retournee, setRetournee] = useState(false)
  const [sues, setSues] = useState(0)

  if (!skill) return <Navigate to="/parcours" replace />

  const toutes = getFlashcardsForSkill(skillId)
  const aDesExercices = getExercisesForSkill(skillId).length > 0
  const quitter = () => navigate('/travail')

  if (toutes.length === 0 || file.length === 0) {
    const prochaine = toutes
      .map((c) => session.defis[c.id]?.next_review_at)
      .filter((d): d is string => Boolean(d))
      .sort()[0]
    return (
      <FocusFrame title={skill.label} onQuit={quitter}>
        <EmptyState
          title={toutes.length === 0 ? 'Pas encore de cartes défi ici' : 'Tes cartes tiennent'}
          description={
            toutes.length === 0
              ? 'Les cartes défi de cette compétence ne sont pas encore écrites.'
              : `Rien à revoir aujourd'hui.${prochaine ? ` Prochaine révision le ${formatDateLong(prochaine)}.` : ''}`
          }
          action={
            <ButtonLink to={aDesExercices ? `/exercice/${skillId}` : '/travail'} size="lg">
              {aDesExercices ? 'Faire les exercices' : 'Retour à mon espace'}
            </ButtonLink>
          }
        />
      </FocusFrame>
    )
  }

  if (index >= file.length) {
    const vues = file.length
    return (
      <FocusFrame title={skill.label} onQuit={quitter}>
        <Card className="animate-fade-up p-7 text-center sm:p-9">
          <Badge tone="accent" className="mb-4">
            Défi terminé
          </Badge>
          <h1 className="font-display text-[24px] font-medium leading-snug text-ink sm:text-[28px]">
            {skill.label}
          </h1>
          <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-relaxed text-ink-subtle">
            Tu savais {sues} carte{sues > 1 ? 's' : ''} sur {vues}.{' '}
            {sues === vues
              ? 'Elles reviendront de plus en plus espacées.'
              : 'Celles qui ne tenaient pas encore reviennent dès demain : c’est en les retrouvant plusieurs fois qu’on les retient.'}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {aDesExercices && (
              <ButtonLink to={`/exercice/${skillId}`} size="lg">
                Continuer avec les exercices
              </ButtonLink>
            )}
            <ButtonLink to="/travail" variant={aDesExercices ? 'secondary' : 'primary'} size="lg">
              Terminer pour aujourd'hui
            </ButtonLink>
          </div>
        </Card>
      </FocusFrame>
    )
  }

  const carte = file[index]

  function repondre(savait: boolean) {
    reviserDefi(carte, savait)
    if (savait) setSues((n) => n + 1)
    // Une carte ratee revient une seule fois a la fin de la seance.
    if (!savait && !rejouees.has(carte.id)) {
      rejouees.add(carte.id)
      setFile((f) => [...f, carte])
    }
    setRetournee(false)
    setIndex((i) => i + 1)
  }

  return (
    <FocusFrame
      title={skill.label}
      onQuit={quitter}
      progress={{ current: index + 1, total: file.length }}
      counter={`${index + 1} / ${file.length}`}
    >
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
        Carte défi · {skill.label}
      </p>
      <Card key={`${carte.id}-${index}`} className="animate-fade-up p-6 sm:p-8">
        <RichText className="font-display text-[20px] font-medium leading-snug text-ink sm:text-[24px]">
          {carte.recto}
        </RichText>

        {retournee ? (
          <div className="mt-6 animate-fade-up border-t border-divider pt-5">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-accent">Réponse</p>
            <RichText className="text-[15px] leading-relaxed text-ink">{carte.verso}</RichText>
          </div>
        ) : (
          <p className="mt-6 text-[13px] leading-relaxed text-ink-subtle">
            Cherche la réponse dans ta tête, puis retourne la carte.
          </p>
        )}
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        {retournee ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => repondre(false)}>
              Je ne savais pas
            </Button>
            <Button size="lg" onClick={() => repondre(true)}>
              Je savais
            </Button>
          </>
        ) : (
          <Button size="lg" onClick={() => setRetournee(true)}>
            Retourner la carte
          </Button>
        )}
      </div>
    </FocusFrame>
  )
}
