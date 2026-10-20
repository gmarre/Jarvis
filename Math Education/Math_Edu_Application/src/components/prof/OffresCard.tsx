import { useMemo, useState } from 'react'

import { repository, RepositoryError } from '@/data'
import { skills } from '@/content'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Checkbox, Field, Select, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Misc'
import { dureeLisible } from '@/lib/schedule'
import { useSession } from '@/state/session'
import type { CourseOffer, NewCourseOffer } from '@/types/domain'

// Offres de cours du professeur (sprint 3, point 1 ; migration 0018) : un type
// de cours avec un titre, des competences, une classe, une duree de 30 min a
// 2 h, 3 places au plus et un prix affiche (rien n'est encaisse pendant la
// beta). Les creneaux s'ouvrent ensuite depuis une offre et en reprennent la
// duree, les places et le prix.

const NIVEAUX = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e']
const DUREES = [30, 45, 60, 90, 120]
const MAX_COMPETENCES = 10

const VIDE: NewCourseOffer = {
  titre: '',
  description: '',
  skill_ids: [],
  niveau: '5e',
  duree_min: 60,
  places: 3,
  prix_eur: 20,
  active: true,
}

export function OffresCard() {
  const { session, catalog, rechargerCatalogue } = useSession()
  const profId = session?.profile.id
  const mesOffres = catalog.offers.filter((o) => o.prof_id === profId)

  const [edition, setEdition] = useState<{ id?: string; offre: NewCourseOffer } | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const competencesDuNiveau = useMemo(
    () => (edition ? skills.filter((s) => s.school_level === edition.offre.niveau) : []),
    [edition],
  )

  const modifier = (patch: Partial<NewCourseOffer>) =>
    setEdition((e) => (e ? { ...e, offre: { ...e.offre, ...patch } } : e))

  const basculer = (id: string) => {
    if (!edition) return
    const ids = edition.offre.skill_ids
    if (ids.includes(id)) modifier({ skill_ids: ids.filter((x) => x !== id) })
    else if (ids.length < MAX_COMPETENCES) modifier({ skill_ids: [...ids, id] })
  }

  const titreValide = edition && edition.offre.titre.trim().length >= 3
  const competencesValides = edition && edition.offre.skill_ids.length > 0

  async function enregistrer() {
    if (!edition || !titreValide || !competencesValides) return
    setEnCours(true)
    setErreur(null)
    try {
      await repository.saveOffer({ ...edition.offre, titre: edition.offre.titre.trim() }, edition.id)
      await rechargerCatalogue()
      setEdition(null)
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : "L'offre n'a pas pu être enregistrée.")
    } finally {
      setEnCours(false)
    }
  }

  async function supprimer(offre: CourseOffer) {
    setEnCours(true)
    setErreur(null)
    try {
      await repository.deleteOffer(offre.id)
      await rechargerCatalogue()
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : "L'offre n'a pas pu être supprimée.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Card>
      <CardTitle
        action={
          !edition && (
            <Button size="sm" variant="secondary" onClick={() => setEdition({ offre: VIDE })}>
              Nouvelle offre
            </Button>
          )
        }
      >
        Mes offres de cours
      </CardTitle>

      {mesOffres.length === 0 && !edition && (
        <p className="text-[12.5px] leading-relaxed text-ink-subtle">
          Une offre décrit un type de cours : les compétences travaillées, la classe, la durée, le nombre
          d'élèves et le prix affiché. Tu ouvres ensuite des créneaux à partir d'elle.
        </p>
      )}

      <ul className="flex flex-col gap-2.5">
        {mesOffres.map((offre) => (
          <li key={offre.id} className="rounded-xl border border-divider px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{offre.titre}</p>
                <p className="text-[11.5px] text-ink-faint">
                  {offre.niveau} · {dureeLisible(offre.duree_min)} · {offre.places} élève{offre.places > 1 ? 's' : ''}{' '}
                  au plus · {offre.prix_eur} €
                </p>
              </div>
              <Badge tone="neutral">{offre.skill_ids.length} comp.</Badge>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" disabled={enCours} onClick={() => setEdition({ id: offre.id, offre })}>
                Modifier
              </Button>
              <Button size="sm" variant="secondary" disabled={enCours} onClick={() => void supprimer(offre)}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {edition && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-accent-100 bg-accent-50/40 p-4">
          <Field label="Titre" htmlFor="offre-titre">
            <TextInput
              id="offre-titre"
              maxLength={80}
              value={edition.offre.titre}
              onChange={(e) => modifier({ titre: e.target.value })}
              placeholder="Fractions de 5e : comparer et additionner"
            />
          </Field>
          <Field label="Description (facultative)" htmlFor="offre-description">
            <textarea
              id="offre-description"
              maxLength={600}
              rows={3}
              value={edition.offre.description}
              onChange={(e) => modifier({ description: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Classe" htmlFor="offre-niveau">
              <Select
                id="offre-niveau"
                value={edition.offre.niveau}
                onChange={(e) => modifier({ niveau: e.target.value, skill_ids: [] })}
              >
                {NIVEAUX.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Durée" htmlFor="offre-duree">
              <Select
                id="offre-duree"
                value={edition.offre.duree_min}
                onChange={(e) => modifier({ duree_min: Number(e.target.value) })}
              >
                {DUREES.map((d) => (
                  <option key={d} value={d}>
                    {dureeLisible(d)}
                    {d === 30 ? ' (aide aux devoirs)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Élèves au plus" htmlFor="offre-places">
              <Select
                id="offre-places"
                value={edition.offre.places}
                onChange={(e) => modifier({ places: Number(e.target.value) })}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prix affiché (€)" htmlFor="offre-prix" hint="Rien n'est encaissé pendant la bêta.">
              <TextInput
                id="offre-prix"
                type="number"
                min={0}
                max={200}
                value={edition.offre.prix_eur}
                onChange={(e) => modifier({ prix_eur: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })}
              />
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-ink-soft">
              Compétences travaillées ({edition.offre.skill_ids.length} / {MAX_COMPETENCES})
            </p>
            <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
              {competencesDuNiveau.map((s) => (
                <Checkbox
                  key={s.id}
                  checked={edition.offre.skill_ids.includes(s.id)}
                  onChange={() => basculer(s.id)}
                >
                  {s.label}
                </Checkbox>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={enCours || !titreValide || !competencesValides} onClick={() => void enregistrer()}>
              {edition.id ? 'Enregistrer' : "Créer l'offre"}
            </Button>
            <Button size="sm" variant="secondary" disabled={enCours} onClick={() => setEdition(null)}>
              Annuler
            </Button>
          </div>
          {!competencesValides && (
            <p className="text-[11.5px] text-ink-faint">Choisis au moins une compétence.</p>
          )}
        </div>
      )}

      {erreur && (
        <Notice tone="progress" className="mt-3">
          {erreur}
        </Notice>
      )}
    </Card>
  )
}
