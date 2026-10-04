import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useRecette } from '@/state/recette'
import type { ReviewItemType, ReviewVerdict } from '@/types/domain'

// Panneau de recette : accepter ou invalider l'element affiche. Visible des
// seuls relecteurs (content_reviewers, migration 0008) ; pour un eleve, ce
// composant ne rend rien.
//
// Le verdict part en base tel quel. scripts/recette.py le reporte ensuite dans
// le contenu : accepte -> valide, invalide -> brouillon, commentaire dans la
// liste de reprise des agents.

const LIBELLES: Record<ReviewVerdict, string> = {
  accepte: 'Accepté',
  invalide: 'Invalidé',
}

export function RecettePanel({
  itemType,
  itemId,
  className,
}: {
  itemType: ReviewItemType
  itemId: string
  className?: string
}) {
  const { relecteur, verdictDe, rendreVerdict } = useRecette()
  const existant = verdictDe(itemType, itemId)

  const [ouvert, setOuvert] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Nouvel element : on repart d'un panneau ferme, prerempli du verdict connu.
  useEffect(() => {
    setOuvert(false)
    setErreur(null)
    setCommentaire(verdictDe(itemType, itemId)?.commentaire ?? '')
  }, [itemType, itemId, verdictDe])

  if (!relecteur) return null

  const envoyer = async (verdict: ReviewVerdict) => {
    if (verdict === 'invalide' && commentaire.trim() === '') {
      setOuvert(true)
      setErreur('Dis ce qui ne va pas : c’est ce que lira celui qui corrige.')
      return
    }
    setEnvoi(true)
    setErreur(null)
    try {
      await rendreVerdict({ item_type: itemType, item_id: itemId, verdict, commentaire })
      setOuvert(false)
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section
      aria-label="Recette du contenu"
      className={cn('rounded-card border border-dashed border-line bg-canvas p-4', className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
          Recette
        </span>
        <span className="font-mono text-[11.5px] text-ink-faint">{itemId}</span>
        {existant ? (
          <Badge tone={existant.verdict === 'accepte' ? 'mastered' : 'wrong'} className="ml-auto">
            {LIBELLES[existant.verdict]}
            {existant.traite_le ? ' · reporté' : ''}
          </Badge>
        ) : (
          <Badge tone="neutral" className="ml-auto">
            À juger
          </Badge>
        )}
      </div>

      {existant?.commentaire && !ouvert && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{existant.commentaire}</p>
      )}

      {ouvert && (
        <div className="mt-3">
          <label htmlFor={`recette-${itemId}`} className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Commentaire (obligatoire pour invalider)
          </label>
          <textarea
            id={`recette-${itemId}`}
            value={commentaire}
            maxLength={2000}
            rows={3}
            onChange={(event) => setCommentaire(event.target.value)}
            placeholder="Ex. : la réponse attendue est fausse, l'énoncé est ambigu, trop difficile pour le CE1…"
            className="w-full rounded-xl border border-line bg-surface p-3 text-[13px] text-ink focus:border-accent focus:shadow-focus focus:outline-none"
          />
        </div>
      )}

      {erreur && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-wrong">
          {erreur}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void envoyer('accepte')} disabled={envoi}>
          Accepter
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => (ouvert ? void envoyer('invalide') : setOuvert(true))}
          disabled={envoi}
        >
          {ouvert ? 'Confirmer l’invalidation' : 'Invalider…'}
        </Button>
        {ouvert && (
          <Button size="sm" variant="ghost" onClick={() => setOuvert(false)} disabled={envoi}>
            Annuler
          </Button>
        )}
      </div>
    </section>
  )
}
