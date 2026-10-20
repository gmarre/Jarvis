import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getSkill } from '@/content'
import { repository, RepositoryError } from '@/data'
import { addDays, formatDateShort, formatWeekday, isSameDay, startOfDay } from '@/lib/format'
import { dureeLisible, formatMinutes, minutesOf } from '@/lib/schedule'
import { lacunesCommunes, type Suggestion } from '@/lib/suggestions'
import type { ProgressMap } from '@/lib/dag'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Field'
import { EmptyState, Notice } from '@/components/ui/Misc'
import { useSession } from '@/state/session'
import type { AvailabilitySlot, CourseOffer, Inscrit } from '@/types/domain'

// Agenda du professeur (sprint 3, points 2, 4 et 5) : ses cours a venir, en
// semaine ou en mois, avec les inscrits, le lien de visio (Jitsi, un par
// seance) et, pour le groupe, les lacunes communes a travailler. Le graphe d'un
// eleve n'est ouvert que s'il partage sa progression (est_prof_de).

type Vue = 'semaine' | 'mois'

export default function TeacherAgendaPage() {
  const { session, catalog } = useSession()
  const profId = session?.profile.id
  const [vue, setVue] = useState<Vue>('semaine')

  const aVenir = useMemo(() => {
    const maintenant = Date.now()
    const fin = addDays(startOfDay(new Date()), vue === 'semaine' ? 7 : 31).getTime()
    return catalog.slots
      .filter((s) => s.prof_id === profId)
      .filter((s) => {
        const debut = new Date(s.start_at).getTime()
        return debut + s.duree_min * 60_000 >= maintenant && debut < fin
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [catalog.slots, profId, vue])

  const jours = useMemo(() => {
    const parJour: { jour: Date; slots: AvailabilitySlot[] }[] = []
    for (const slot of aVenir) {
      const d = new Date(slot.start_at)
      const dernier = parJour[parJour.length - 1]
      if (dernier && isSameDay(dernier.jour, d)) dernier.slots.push(slot)
      else parJour.push({ jour: d, slots: [slot] })
    }
    return parJour
  }, [aVenir])

  const verifie = catalog.teachers.find((t) => t.id === profId)?.verifie ?? false

  return (
    <AppShell>
      <PageBody className="max-w-[900px]">
        <PageHeader title="Mon agenda" subtitle="Tes cours à venir, avec les inscrits et le lien de la visio." />

        {!verifie && (
          <Notice tone="progress" className="mb-5">
            Ton profil attend la vérification de l'équipe : tant qu'il n'est pas vérifié, les élèves ne voient ni tes
            offres ni tes créneaux.
          </Notice>
        )}

        <Segmented
          className="mb-5 max-w-[320px]"
          ariaLabel="Période"
          value={vue}
          onChange={setVue}
          options={[
            { value: 'semaine', label: '7 jours' },
            { value: 'mois', label: '31 jours' },
          ]}
          size="sm"
        />

        {jours.length === 0 ? (
          <Card tone="dashed" className="py-10">
            <EmptyState
              title="Aucun cours à venir sur cette période"
              description="Ouvre des créneaux depuis « Mes créneaux » : ils apparaîtront ici avec leurs inscrits."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {jours.map(({ jour, slots }) => (
              <section key={jour.toISOString()}>
                <h2 className="mb-2.5 text-[13px] font-semibold text-ink">
                  {formatWeekday(jour.toISOString())} {formatDateShort(jour.toISOString())}
                </h2>
                <div className="flex flex-col gap-3">
                  {slots.map((slot) => (
                    <Seance key={slot.id} slot={slot} offre={catalog.offers.find((o) => o.id === slot.offer_id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageBody>
    </AppShell>
  )
}

function Seance({ slot, offre }: { slot: AvailabilitySlot; offre?: CourseOffer }) {
  const [inscrits, setInscrits] = useState<Inscrit[] | null>(null)
  const [lien, setLien] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [calcul, setCalcul] = useState(false)

  useEffect(() => {
    let annule = false
    Promise.all([repository.getInscrits(slot.id), repository.getLienVisio(slot.id)])
      .then(([i, l]) => {
        if (annule) return
        setInscrits(i)
        setLien(l)
      })
      .catch((cause) => {
        if (!annule) setErreur(cause instanceof RepositoryError ? cause.message : 'Les inscrits n’ont pas pu être lus.')
      })
    return () => {
      annule = true
    }
  }, [slot.id])

  const debut = minutesOf(new Date(slot.start_at))
  const cibles = offre?.skill_ids ?? [...new Set((inscrits ?? []).map((i) => i.skill_id).filter((x): x is string => !!x))]

  async function suggerer() {
    if (!inscrits) return
    setCalcul(true)
    setErreur(null)
    try {
      const partages = inscrits.filter((i) => i.partage)
      const progressions = (await Promise.all(partages.map((i) => repository.getProgressionEleve(i.eleve_id)))).filter(
        (p): p is ProgressMap => p !== null,
      )
      setSuggestions(lacunesCommunes(progressions, cibles))
    } catch (cause) {
      setErreur(cause instanceof RepositoryError ? cause.message : 'Les progressions n’ont pas pu être lues.')
    } finally {
      setCalcul(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">
            {formatMinutes(debut)} – {formatMinutes(debut + slot.duree_min)}
            <span className="ml-2 text-[12px] font-normal text-ink-faint">{dureeLisible(slot.duree_min)}</span>
          </p>
          <p className="text-[12px] text-ink-subtle">{offre?.titre ?? 'Cours libre'}</p>
        </div>
        <Badge tone={slot.places_prises > 0 ? 'mastered' : 'neutral'}>
          {slot.places_prises} / {slot.capacite} inscrit{slot.places_prises > 1 ? 's' : ''}
        </Badge>
      </div>

      {inscrits && inscrits.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {inscrits.map((i) => (
            <li key={i.eleve_id} className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
              <span className="font-semibold">{i.prenom || 'Élève'}</span>
              {i.skill_id && <span className="text-ink-faint">· {getSkill(i.skill_id)?.label ?? i.skill_id}</span>}
              {i.partage ? (
                <Link to={`/prof/eleves/${i.eleve_id}`} className="font-semibold text-accent hover:text-accent-600">
                  Voir son graphe
                </Link>
              ) : (
                <span className="text-[11.5px] text-ink-faint">progression non partagée</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {lien && (
          <a
            href={lien}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:bg-accent-600"
          >
            Ouvrir la visio
          </a>
        )}
        {inscrits && inscrits.some((i) => i.partage) && cibles.length > 0 && (
          <Button size="sm" variant="secondary" disabled={calcul} onClick={() => void suggerer()}>
            {calcul ? 'Calcul…' : 'Que travailler ensemble ?'}
          </Button>
        )}
      </div>

      {suggestions && (
        <div className="mt-3 rounded-xl border border-divider bg-canvas p-3">
          {suggestions.length === 0 ? (
            <p className="text-[12.5px] text-ink-subtle">Aucune lacune commune : les élèves sont prêts pour ces compétences.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
              {suggestions.map((s) => (
                <li key={s.skillId}>
                  <span className="font-semibold">{getSkill(s.skillId)?.label ?? s.skillId}</span>{' '}
                  <span className="text-ink-faint">
                    ({getSkill(s.skillId)?.school_level}) · lacune de {s.eleves} élève{s.eleves > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
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
