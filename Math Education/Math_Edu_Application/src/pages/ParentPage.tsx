import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { domains, getSkill } from '@/content'
import { repository, RepositoryError } from '@/data'
import { domainProgress, type ProgressMap } from '@/lib/dag'
import { seancesCetteSemaine } from '@/lib/serie'
import { telechargerJson } from '@/lib/telecharger'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { TextInput, Toggle } from '@/components/ui/Field'
import { EmptyState, LoadingScreen, Notice } from '@/components/ui/Misc'
import { ProgressBar } from '@/components/ui/Progress'
import { useAuthenticatedSession } from '@/state/session'
import type { Enfant, ExerciseAttempt, Suivi } from '@/types/domain'

// Espace parent (sprint 4, migration 0019).
//
// A l'ouverture, le compte recupere les enfants dont le parent a donne le
// consentement avec la meme adresse (rattacher_mes_enfants). Pour chacun :
// progression par domaine, regularite de la semaine, competences en cours avec
// leurs exercices, reponses et corriges (decision de Gauthier : visibles
// librement ici), resume hebdomadaire par email, export et suppression (RGPD).
// En lecture seule, sans note ni classement.

export default function ParentPage() {
  const { session, signOut, isDemo } = useAuthenticatedSession()
  const { profile } = session
  const [enfants, setEnfants] = useState<Enfant[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    repository
      .rattacherEnfants()
      .then(() => repository.getEnfants())
      .then((e) => !annule && setEnfants(e))
      .catch((cause) => {
        if (annule) return
        setEnfants([])
        setErreur(cause instanceof RepositoryError ? cause.message : 'Vos enfants n’ont pas pu être chargés.')
      })
    return () => {
      annule = true
    }
  }, [])

  if (enfants === null) return <LoadingScreen label="Ouverture de votre espace…" />

  return (
    <AppShell>
      <PageBody className="max-w-[820px]">
        <PageHeader
          title={`Bonjour ${profile.prenom}`}
          subtitle="Le suivi de vos enfants, en lecture seule, sans note ni classement."
        />

        {erreur && (
          <Notice tone="progress" className="mb-5">
            {erreur}
          </Notice>
        )}

        {enfants.length === 0 ? (
          <Card tone="dashed" className="mb-5 py-10">
            <EmptyState
              title="Aucun enfant rattaché"
              description={
                isDemo
                  ? 'Mode démonstration : aucun enfant n’est rattaché.'
                  : `Un enfant se rattache à votre compte quand vous avez donné votre accord, par le lien reçu à ${profile.email}, avec cette même adresse.`
              }
            />
          </Card>
        ) : (
          <div className="mb-5 flex flex-col gap-5">
            {enfants.map((e) => (
              <EnfantCard key={e.eleve_id} enfant={e} onSupprime={() => setEnfants((l) => (l ?? []).filter((x) => x.eleve_id !== e.eleve_id))} />
            ))}
          </div>
        )}

        <Card>
          <CardTitle>Vos droits</CardTitle>
          <p className="text-[12.5px] leading-relaxed text-ink-subtle">
            En dessous de 15 ans, le compte de votre enfant nécessite votre accord. Vous pouvez exporter ses
            données ou supprimer son compte à tout moment, depuis sa carte ci-dessus, sans avoir à vous justifier.
            Les données sont hébergées dans l'Union européenne et limitées à ce qui sert le suivi pédagogique.
          </p>
          <SectionLabel className="mb-2 mt-5">Nous écrire</SectionLabel>
          <p className="text-[13px] font-medium text-ink">gauthier.marre40@gmail.com</p>
        </Card>

        <Card tone="flat" className="mt-5">
          <p className="mb-3 text-[12.5px] leading-relaxed text-ink-subtle">Connecté en tant que {profile.email}.</p>
          <Button variant="secondary" onClick={() => void signOut()}>
            Se déconnecter
          </Button>
        </Card>
      </PageBody>
    </AppShell>
  )
}

function EnfantCard({ enfant, onSupprime }: { enfant: Enfant; onSupprime: () => void }) {
  const { catalog } = useAuthenticatedSession()
  const [progress, setProgress] = useState<ProgressMap | null>(null)
  const [suivis, setSuivis] = useState<Suivi[]>([])
  const [tentatives, setTentatives] = useState<ExerciseAttempt[]>([])
  const [rapport, setRapport] = useState(enfant.rapport_hebdo)
  const [message, setMessage] = useState<{ ton: 'mastered' | 'progress'; texte: string } | null>(null)
  const [suppression, setSuppression] = useState(false)
  const [mot, setMot] = useState('')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    let annule = false
    Promise.all([
      repository.getProgressionEleve(enfant.eleve_id),
      repository.getTentativesEleve(enfant.eleve_id),
      repository.getMesSuivis(),
    ])
      .then(([p, t, s]) => {
        if (annule) return
        setProgress(p ?? {})
        setTentatives(t)
        setSuivis(s.filter((x) => x.eleve_id === enfant.eleve_id && (x.etat === 'actif' || x.etat === 'termine')))
      })
      .catch(() => !annule && setMessage({ ton: 'progress', texte: 'La progression n’a pas pu être lue.' }))
    return () => {
      annule = true
    }
  }, [enfant.eleve_id])

  const enCoursDeTravail = Object.values(progress ?? {})
    .filter((p) => p.niveau >= 1 && p.niveau <= 3)
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .slice(0, 5)
  const semaine = seancesCetteSemaine(tentatives.map((t) => t.created_at))

  async function agir(action: () => Promise<void>, ok: string) {
    setEnCours(true)
    setMessage(null)
    try {
      await action()
      setMessage({ ton: 'mastered', texte: ok })
    } catch (cause) {
      setMessage({ ton: 'progress', texte: cause instanceof RepositoryError ? cause.message : 'L’opération a échoué.' })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card>
      <CardTitle>
        {enfant.prenom}
        {enfant.niveau_scolaire ? ` · ${enfant.niveau_scolaire}` : ''}
      </CardTitle>

      <p className="mb-4 text-[12.5px] text-ink-subtle">
        {semaine === 0
          ? 'Pas encore de séance cette semaine.'
          : `${semaine} jour${semaine > 1 ? 's' : ''} de travail depuis lundi.`}
      </p>

      {progress && (
        <div className="mb-4 flex flex-col gap-2.5">
          {domains.map((d) => {
            const dp = domainProgress(progress, d.id)
            if (dp.mastered === 0 && dp.inProgress === 0) return null
            return (
              <div key={d.id}>
                <div className="mb-1 flex justify-between text-[12px] text-ink-soft">
                  <span>{d.name}</span>
                  <span className="text-ink-faint">
                    {dp.mastered} / {dp.total} acquises
                  </span>
                </div>
                <ProgressBar value={dp.total === 0 ? 0 : dp.mastered / dp.total} />
              </div>
            )
          })}
        </div>
      )}

      {enCoursDeTravail.length > 0 && (
        <div className="mb-4">
          <SectionLabel className="mb-2">En cours de travail</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {enCoursDeTravail.map((p) => (
              <li key={p.skill_id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="text-ink-soft">{getSkill(p.skill_id)?.label ?? p.skill_id}</span>
                <Link to={`/parent/revision/${p.skill_id}`} className="font-semibold text-accent hover:text-accent-600">
                  Exercices et corrigés
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suivis.length > 0 && (
        <div className="mb-4">
          <SectionLabel className="mb-2">Professeurs qui le suivent</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {suivis.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="text-ink-soft">
                  {catalog.teachers.find((t) => t.id === s.prof_id)?.nom_court ?? 'Professeur'}
                  {s.etat === 'termine' ? ' (terminé)' : ''}
                </span>
                <Link to={`/suivi/${s.id}`} className="font-semibold text-accent hover:text-accent-600">
                  Lire et écrire les messages
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-divider pt-3">
        <Toggle
          label="Recevoir un résumé chaque dimanche par email"
          checked={rapport}
          onChange={(valeur) => {
            const avant = rapport
            setRapport(valeur)
            void agir(
              () => repository.reglerRapport(enfant.lien_id, valeur).catch((e) => {
                setRapport(avant)
                throw e
              }),
              valeur ? 'Résumé hebdomadaire activé.' : 'Résumé hebdomadaire arrêté.',
            )
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-divider pt-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={enCours}
          onClick={() =>
            void agir(async () => {
              const donnees = await repository.exporterDonnees(enfant.eleve_id)
              telechargerJson(`racine-${enfant.prenom || 'enfant'}-${new Date().toISOString().slice(0, 10)}.json`, donnees)
            }, 'Fichier téléchargé.')
          }
        >
          Exporter ses données
        </Button>
        {!suppression ? (
          <Button size="sm" variant="ghost" disabled={enCours} onClick={() => setSuppression(true)}>
            Supprimer son compte
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <p role="alert" className="text-[11.5px] leading-relaxed text-wrong-600">
              Le compte de {enfant.prenom} et toutes ses données seront effacés définitivement. Tapez SUPPRIMER pour
              confirmer.
            </p>
            <div className="flex flex-wrap gap-2">
              <TextInput aria-label="Confirmation" value={mot} onChange={(e) => setMot(e.target.value)} className="max-w-[180px]" />
              <Button
                size="sm"
                disabled={enCours || mot !== 'SUPPRIMER'}
                className="bg-wrong-600 hover:bg-wrong-600"
                onClick={() => void agir(async () => {
                  await repository.supprimerCompte(enfant.eleve_id)
                  onSupprime()
                }, 'Compte supprimé.')}
              >
                Supprimer définitivement
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSuppression(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <Notice tone={message.ton} className="mt-3">
          {message.texte}
        </Notice>
      )}
    </Card>
  )
}
