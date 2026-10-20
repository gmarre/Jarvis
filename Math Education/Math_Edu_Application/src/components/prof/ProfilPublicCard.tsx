import { useState } from 'react'

import { domains } from '@/content'
import { repository, RepositoryError } from '@/data'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Field, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'
import { useSession } from '@/state/session'
import type { ProfilProf } from '@/types/domain'

// Profil public du professeur (sprint 3, point 3 ; migration 0018) : ce que
// l'eleve lit avant de reserver, en touchant l'icone du professeur. La photo
// viendra avec le stockage de fichiers ; d'ici la, des initiales.

const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e']

export function ProfilPublicCard() {
  const { session, catalog, rechargerCatalogue } = useSession()
  const moi = catalog.teachers.find((t) => t.id === session?.profile.id)
  const [profil, setProfil] = useState<ProfilProf>({
    titre: moi?.titre ?? '',
    experience: moi?.experience ?? '',
    methode: moi?.methode ?? '',
    niveaux: moi?.niveaux ?? [],
    domaines: moi?.domaines ?? [],
  })
  const [enCours, setEnCours] = useState(false)
  const [retour, setRetour] = useState<{ ton: 'mastered' | 'progress'; texte: string } | null>(null)

  const basculer = (cle: 'niveaux' | 'domaines', valeur: string) =>
    setProfil((p) => ({
      ...p,
      [cle]: p[cle].includes(valeur) ? p[cle].filter((v) => v !== valeur) : [...p[cle], valeur],
    }))

  async function enregistrer() {
    setEnCours(true)
    setRetour(null)
    try {
      await repository.saveProfilProf({ ...profil, titre: profil.titre.trim() })
      await rechargerCatalogue()
      setRetour({ ton: 'mastered', texte: 'Profil public enregistré.' })
    } catch (cause) {
      setRetour({
        ton: 'progress',
        texte: cause instanceof RepositoryError ? cause.message : 'Le profil n’a pas pu être enregistré.',
      })
    } finally {
      setEnCours(false)
    }
  }

  const puce = (actif: boolean) =>
    cn(
      'inline-flex min-h-[36px] items-center rounded-full px-3.5 text-xs font-semibold transition',
      actif ? 'bg-accent-50 text-accent-700' : 'border border-dashed border-locked-200 text-ink-faint hover:bg-muted',
    )

  return (
    <Card>
      <CardTitle>Mon profil public</CardTitle>
      {moi && !moi.verifie && (
        <Notice tone="progress" className="mb-4">
          Ton profil attend la vérification de l'équipe. Tant qu'il n'est pas vérifié, les élèves ne voient ni ton
          profil, ni tes offres, ni tes créneaux.
        </Notice>
      )}
      <div className="flex flex-col gap-3">
        <Field label="Titre" htmlFor="prof-titre" hint="Par exemple : professeure certifiée, étudiant en master MEEF.">
          <TextInput
            id="prof-titre"
            maxLength={80}
            value={profil.titre}
            onChange={(e) => setProfil((p) => ({ ...p, titre: e.target.value }))}
          />
        </Field>
        <Field label="Expérience" htmlFor="prof-experience">
          <textarea
            id="prof-experience"
            maxLength={600}
            rows={3}
            value={profil.experience}
            onChange={(e) => setProfil((p) => ({ ...p, experience: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink"
          />
        </Field>
        <Field label="Méthode" htmlFor="prof-methode">
          <textarea
            id="prof-methode"
            maxLength={600}
            rows={3}
            value={profil.methode}
            onChange={(e) => setProfil((p) => ({ ...p, methode: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink"
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-soft">Classes</p>
          <div className="flex flex-wrap gap-2">
            {NIVEAUX.map((n) => (
              <button key={n} type="button" aria-pressed={profil.niveaux.includes(n)} onClick={() => basculer('niveaux', n)} className={puce(profil.niveaux.includes(n))}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-soft">Domaines</p>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <button key={d.id} type="button" aria-pressed={profil.domaines.includes(d.id)} onClick={() => basculer('domaines', d.id)} className={puce(profil.domaines.includes(d.id))}>
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Button size="sm" disabled={enCours} onClick={() => void enregistrer()}>
            Enregistrer
          </Button>
        </div>
        {retour && <Notice tone={retour.ton}>{retour.texte}</Notice>}
      </div>
    </Card>
  )
}
