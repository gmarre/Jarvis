import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { domains, exercises, mindmaps } from '@/content'
import { cn } from '@/lib/cn'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Level, LoadingScreen } from '@/components/ui/Misc'
import { IconChevronRight } from '@/components/ui/icons'
import { useRecette } from '@/state/recette'
import type { ContentReview } from '@/types/domain'

// Suivi de la recette du contenu, pour les seuls relecteurs : ce qui reste a
// juger, competence par competence, et un lien direct vers chaque serie
// d'exercices et chaque carte. Le verdict se rend sur l'ecran de l'element
// (RecettePanel), pas ici.

interface Compte {
  total: number
  acceptes: number
  invalides: number
}

function compter(ids: string[], verdict: (id: string) => ContentReview | undefined): Compte {
  let acceptes = 0
  let invalides = 0
  for (const id of ids) {
    const v = verdict(id)
    if (v?.verdict === 'accepte') acceptes += 1
    else if (v?.verdict === 'invalide') invalides += 1
  }
  return { total: ids.length, acceptes, invalides }
}

const restants = (c: Compte) => c.total - c.acceptes - c.invalides

export default function RecettePage() {
  const { relecteur, chargee, verdictDe } = useRecette()
  const [masquerJuges, setMasquerJuges] = useState(true)

  const exercicesParCompetence = useMemo(() => {
    const parSkill = new Map<string, string[]>()
    for (const exercise of exercises) {
      const liste = parSkill.get(exercise.skill_id)
      if (liste) liste.push(exercise.id)
      else parSkill.set(exercise.skill_id, [exercise.id])
    }
    return parSkill
  }, [])

  if (!chargee) return <LoadingScreen label="Chargement de la recette…" />
  if (!relecteur) return <Navigate to="/travail" replace />

  const verdictExercice = (id: string) => verdictDe('exercise', id)
  const verdictCarte = (id: string) => verdictDe('mindmap', id)

  const totalExercices = compter(exercises.map((e) => e.id), verdictExercice)
  const totalCartes = compter(mindmaps.map((m) => m.id), verdictCarte)

  return (
    <AppShell>
      <PageBody>
        <PageHeader
          title="Recette du contenu"
          subtitle="Parcours chaque série comme un élève, puis accepte ou invalide chaque exercice et chaque carte. Les verdicts sont reportés dans le contenu par scripts/recette.py."
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Synthese titre="Exercices" compte={totalExercices} />
          <Synthese titre="Cartes mentales" compte={totalCartes} />
        </div>

        <label className="mb-5 inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
          <input
            type="checkbox"
            checked={masquerJuges}
            onChange={(event) => setMasquerJuges(event.target.checked)}
          />
          Masquer ce qui est entièrement jugé
        </label>

        {domains.map((domain) => {
          const lignes = domain.skills
            .map((skill) => ({
              skill,
              compte: compter(exercicesParCompetence.get(skill.id) ?? [], verdictExercice),
            }))
            .filter(({ compte }) => compte.total > 0 && (!masquerJuges || restants(compte) > 0))
          if (lignes.length === 0) return null

          return (
            <section key={domain.id} className="mb-7">
              <h2 className="mb-3 font-display text-[18px] font-medium text-ink">
                {domain.id} · {domain.name}
              </h2>
              <Card padded={false} className="divide-y divide-divider">
                {lignes.map(({ skill, compte }) => (
                  <Link
                    key={skill.id}
                    to={`/exercice/${skill.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted"
                  >
                    <span className="w-12 shrink-0 font-mono text-[12px] text-ink-faint">{skill.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{skill.label}</span>
                      <span className="block text-[11px] text-ink-faint">
                        <Level value={skill.school_level} />
                      </span>
                    </span>
                    <Compteurs compte={compte} />
                    <IconChevronRight size={16} className="shrink-0 text-ink-faint" />
                  </Link>
                ))}
              </Card>
            </section>
          )
        })}

        <section className="mb-7">
          <h2 className="mb-3 font-display text-[18px] font-medium text-ink">Cartes mentales</h2>
          <Card padded={false} className="divide-y divide-divider">
            {mindmaps
              .filter((mindmap) => !masquerJuges || !verdictCarte(mindmap.id))
              .map((mindmap) => {
                const verdict = verdictCarte(mindmap.id)
                return (
                  <Link
                    key={mindmap.id}
                    to={`/cartes/${mindmap.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted"
                  >
                    <span className="w-16 shrink-0 font-mono text-[12px] text-ink-faint">{mindmap.id}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {mindmap.title}
                    </span>
                    {verdict ? (
                      <Badge tone={verdict.verdict === 'accepte' ? 'mastered' : 'wrong'}>
                        {verdict.verdict === 'accepte' ? 'Acceptée' : 'Invalidée'}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">À juger</Badge>
                    )}
                    <IconChevronRight size={16} className="shrink-0 text-ink-faint" />
                  </Link>
                )
              })}
          </Card>
        </section>
      </PageBody>
    </AppShell>
  )
}

function Synthese({ titre, compte }: { titre: string; compte: Compte }) {
  const juges = compte.acceptes + compte.invalides
  const pourcentage = compte.total === 0 ? 0 : Math.round((100 * juges) / compte.total)
  return (
    <Card>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">{titre}</p>
      <p className="mt-1 font-display text-[26px] font-medium text-ink">
        {juges} / {compte.total}
        <span className="ml-2 text-[14px] text-ink-faint">jugés ({pourcentage} %)</span>
      </p>
      <div className="mt-2">
        <Compteurs compte={compte} />
      </div>
    </Card>
  )
}

function Compteurs({ compte }: { compte: Compte }) {
  return (
    <span className="flex shrink-0 flex-wrap gap-1.5">
      {compte.acceptes > 0 && <Badge tone="mastered">{compte.acceptes} acceptés</Badge>}
      {compte.invalides > 0 && <Badge tone="wrong">{compte.invalides} invalidés</Badge>}
      <Badge tone="neutral" className={cn(restants(compte) === 0 && 'opacity-50')}>
        {restants(compte)} à juger
      </Badge>
    </span>
  )
}
