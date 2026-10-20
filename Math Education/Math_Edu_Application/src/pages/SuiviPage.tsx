import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'

import { repository, RepositoryError } from '@/data'
import { formatDateShort } from '@/lib/format'
import { cn } from '@/lib/cn'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, LoadingScreen, Notice } from '@/components/ui/Misc'
import { useAuthenticatedSession } from '@/state/session'
import type { MessageSuivi, Suivi, SuiviProf } from '@/types/domain'

// Fil de messages d'un suivi (sprint 5, migration 0020), le meme ecran pour
// le professeur, l'eleve et son parent. Le parent voit tous les echanges et
// peut ecrire : jamais d'echange prive entre un adulte et un mineur hors de sa
// vue. Pas de piece jointe ; un message se signale, il ne se modifie pas.

const MAX = 2000

export default function SuiviPage() {
  const { suiviId = '' } = useParams()
  const { session, catalog } = useAuthenticatedSession()
  const moi = session.profile
  const [suivi, setSuivi] = useState<(Suivi | (SuiviProf & { prof_id: string })) | null | undefined>(undefined)
  const [messages, setMessages] = useState<MessageSuivi[]>([])
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    const lireSuivi =
      moi.role === 'prof'
        ? repository
            .getSuivisProf()
            .then((l) => l.find((s) => s.suivi_id === suiviId))
            .then((s) => (s ? { ...s, id: s.suivi_id, prof_id: moi.id } : null))
        : repository.getMesSuivis().then((l) => l.find((s) => s.id === suiviId) ?? null)
    Promise.all([lireSuivi, repository.getMessages(suiviId)])
      .then(([s, m]) => {
        if (annule) return
        setSuivi(s as Suivi | null)
        setMessages(m)
      })
      .catch((cause) => {
        if (annule) return
        setSuivi(null)
        setErreur(cause instanceof RepositoryError ? cause.message : 'Le fil n’a pas pu être lu.')
      })
    return () => {
      annule = true
    }
  }, [suiviId, moi.id, moi.role])

  if (suivi === undefined) return <LoadingScreen label="Ouverture du fil…" />

  const prof = suivi ? catalog.teachers.find((t) => t.id === suivi.prof_id) : undefined
  const qui = (m: MessageSuivi) => {
    if (m.auteur_id === moi.id) return 'Moi'
    if (suivi && m.auteur_id === suivi.prof_id) return prof?.nom_court ?? 'Professeur'
    if (suivi && m.auteur_id === suivi.eleve_id) return 'prenom' in suivi ? suivi.prenom : 'Élève'
    return 'Parent'
  }
  const actif = suivi?.etat === 'actif'

  async function envoyer(event: FormEvent) {
    event.preventDefault()
    const propre = texte.trim()
    if (!propre || envoi) return
    setEnvoi(true)
    setErreur(null)
    try {
      const m = await repository.envoyerMessage(suiviId, propre)
      setMessages((l) => [...l, m])
      setTexte('')
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'Le message n’est pas parti. Réessaie.')
    } finally {
      setEnvoi(false)
    }
  }

  async function signaler(m: MessageSuivi) {
    try {
      await repository.signalerMessage(m.id)
      setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, signale_le: new Date().toISOString() } : x)))
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'Le signalement a échoué.')
    }
  }

  return (
    <AppShell>
      <PageBody className="max-w-[760px]">
        <PageHeader
          title="Messages du suivi"
          subtitle={
            moi.role === 'parent'
              ? 'Vous voyez tous les échanges entre votre enfant et son professeur, et vous pouvez écrire.'
              : 'Le parent de l’élève voit tous les échanges et peut y écrire.'
          }
        />
        {suivi === null ? (
          <Card tone="dashed" className="py-10">
            <EmptyState title="Fil introuvable" description="Ce suivi n'existe pas ou ne vous concerne pas." />
          </Card>
        ) : (
          <>
            {!actif && (
              <Notice tone="progress" className="mb-4">
                {suivi.etat === 'demande'
                  ? 'Le fil s’ouvrira quand le professeur aura accepté le suivi.'
                  : 'Ce suivi est terminé : le fil reste lisible, en archive.'}
              </Notice>
            )}
            <Card>
              {messages.length === 0 ? (
                <p className="text-[12.5px] text-ink-subtle">Aucun message pour l’instant.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        'rounded-xl px-3.5 py-2.5',
                        m.auteur_id === moi.id ? 'ml-8 bg-accent-50' : 'mr-8 bg-canvas',
                      )}
                    >
                      <p className="text-[11.5px] font-semibold text-ink-soft">
                        {qui(m)} · {formatDateShort(m.cree_le)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink">{m.texte}</p>
                      {m.auteur_id !== moi.id &&
                        (m.signale_le ? (
                          <p className="mt-1 text-[11px] text-ink-faint">Signalé à l’équipe.</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void signaler(m)}
                            className="mt-1 text-[11px] font-semibold text-ink-faint underline"
                          >
                            Signaler ce message
                          </button>
                        ))}
                    </li>
                  ))}
                </ul>
              )}

              {actif && (
                <form onSubmit={(e) => void envoyer(e)} className="mt-4 flex flex-col gap-2 border-t border-divider pt-4">
                  <label htmlFor="message" className="text-xs font-semibold text-ink-soft">
                    Ton message
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    maxLength={MAX}
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink"
                  />
                  <div>
                    <Button type="submit" size="sm" disabled={envoi || texte.trim() === ''}>
                      {envoi ? 'Envoi…' : 'Envoyer'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </>
        )}
        {erreur && (
          <Notice tone="progress" className="mt-4">
            {erreur}
          </Notice>
        )}
      </PageBody>
    </AppShell>
  )
}
