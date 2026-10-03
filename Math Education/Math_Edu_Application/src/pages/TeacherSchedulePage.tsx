import { useMemo, useState } from 'react'

import { domains } from '@/content'
import { cn } from '@/lib/cn'
import { formatDateShort, formatWeekday, isSameDay } from '@/lib/format'
import {
  formatMinutes,
  isPastStart,
  minutesOf,
  publishableDays,
  startBlock,
  startTimes,
  type StartBlock,
} from '@/lib/schedule'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Misc'
import { IconCheck, IconClose, IconPlus } from '@/components/ui/icons'
import { useSession } from '@/state/session'

// Ecran 7, vue professeur (maquette 1n, panneau de droite).
//
// Le professeur ne publie pas des creneaux dans le vide : il declare les
// domaines qu'il couvre, et l'application les propose en priorite aux eleves
// dont la lacune racine tombe dans ces domaines.

// Le professeur choisit son debut au quart d'heure, de 8h a 20h. La maquette
// imposait des heures pleines de 14h a 18h : ni matin, ni 17h30.
const STARTS = startTimes()
const DAYS_AHEAD = 10
const DUREE_MIN = 90
const PRIX_EUR = 20

const BLOCK_LABEL: Record<StartBlock, string> = {
  passé: 'passé',
  chevauche: 'chevauche un autre créneau',
}

export default function TeacherSchedulePage() {
  const { session, catalog, openSlots } = useSession()
  const profile = session?.profile

  // Demain par defaut : aujourd'hui, une partie de la journee est deja passee.
  const [dayOffset, setDayOffset] = useState(1)
  /** Debuts choisis, en minutes depuis minuit, pas encore publies. */
  const [selectedStarts, setSelectedStarts] = useState<number[]>([])
  const [draftStart, setDraftStart] = useState<number | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['C', 'A'])
  const [published, setPublished] = useState<number | null>(null)

  // A partir d'aujourd'hui : un professeur ne publie pas sur un jour passe.
  const days = useMemo(() => publishableDays(new Date(), DAYS_AHEAD), [])

  const day = days[dayOffset] ?? days[0]

  const mySlots = useMemo(() => {
    if (!profile) return []
    return catalog.slots
      .filter((slot) => slot.prof_id === profile.id)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [catalog.slots, profile])

  const daySlots = mySlots.filter((slot) => isSameDay(new Date(slot.start_at), day))

  const openStarts = daySlots.map((slot) => minutesOf(new Date(slot.start_at)))

  // Un debut est bloque s'il est passe, ou s'il chevauche un creneau deja ouvert
  // ou deja choisi : un professeur ne donne pas deux cours a la fois.
  const blockOf = (minutes: number) =>
    startBlock(day, minutes, new Date(), [...openStarts, ...selectedStarts], DUREE_MIN)

  const firstFree = STARTS.find((minutes) => blockOf(minutes) === null) ?? null
  const draft = draftStart !== null && blockOf(draftStart) === null ? draftStart : firstFree

  // Le temps passe pendant que le formulaire est ouvert : un debut choisi a 9h50
  // pour 10h ne part plus a 10h05.
  const startsToPublish = selectedStarts.filter((minutes) => !isPastStart(day, minutes, new Date()))

  const changeDay = (offset: number) => {
    setDayOffset(offset)
    // Les debuts choisis valaient pour l'autre jour, ses creneaux et son heure.
    setSelectedStarts([])
    setDraftStart(null)
  }

  const addStart = () => {
    if (draft === null) return
    setSelectedStarts((current) => [...current, draft].sort((a, b) => a - b))
    setDraftStart(null)
  }

  const removeStart = (minutes: number) =>
    setSelectedStarts((current) => current.filter((m) => m !== minutes))

  const toggleDomain = (id: string) =>
    setSelectedDomains((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id],
    )

  const publish = () => {
    if (startsToPublish.length === 0) return
    openSlots(day.toISOString(), startsToPublish, selectedDomains)
    setPublished(startsToPublish.length)
    setSelectedStarts([])
    window.setTimeout(() => setPublished(null), 4000)
  }

  return (
    <AppShell>
      <PageBody className="max-w-[900px]">
        <PageHeader
          title="Ouvrir des créneaux"
          subtitle="Les élèves dont les lacunes correspondent à tes domaines les verront en priorité. 20 € pour 1h30, jusqu'à 3 élèves."
        />

        {published !== null && (
          <Notice tone="mastered" className="mb-5">
            {published} créneau{published > 1 ? 'x' : ''} publié
            {published > 1 ? 's' : ''} pour le {formatWeekday(day.toISOString())}{' '}
            {formatDateShort(day.toISOString())}.
          </Notice>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Field label="Jour" htmlFor="jour">
                <Select
                  id="jour"
                  value={dayOffset}
                  onChange={(event) => changeDay(Number(event.target.value))}
                >
                  {days.map((candidate, index) => (
                    <option key={candidate.toISOString()} value={index}>
                      {formatWeekday(candidate.toISOString())}{' '}
                      {formatDateShort(candidate.toISOString())}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Durée" htmlFor="duree">
                <Select id="duree" defaultValue={DUREE_MIN} disabled>
                  <option value={DUREE_MIN}>1h30 · jusqu'à 3 élèves</option>
                </Select>
              </Field>
            </div>

            <div className="mb-3 flex items-end gap-2">
              <Field label="Heure de début" htmlFor="debut" className="flex-1">
                <Select
                  id="debut"
                  value={draft ?? ''}
                  disabled={draft === null}
                  onChange={(event) => setDraftStart(Number(event.target.value))}
                >
                  {draft === null && <option value="">Plus aucun horaire ce jour-là</option>}
                  {STARTS.map((minutes) => {
                    const block = blockOf(minutes)
                    const reason = openStarts.includes(minutes)
                      ? 'déjà ouvert'
                      : selectedStarts.includes(minutes)
                        ? 'déjà choisi'
                        : block && BLOCK_LABEL[block]
                    return (
                      <option key={minutes} value={minutes} disabled={block !== null}>
                        {formatMinutes(minutes)} – {formatMinutes(minutes + DUREE_MIN)}
                        {reason && ` · ${reason}`}
                      </option>
                    )
                  })}
                </Select>
              </Field>
              {draft !== null && (
                <Button variant="secondary" size="lg" onClick={addStart} className="shrink-0">
                  <IconPlus size={15} />
                  Ajouter
                </Button>
              )}
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {selectedStarts.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-ink-faint">
                  Ajoute un ou plusieurs horaires, au quart d'heure. Deux cours d'une même
                  journée ne peuvent pas se chevaucher.
                </p>
              ) : (
                selectedStarts.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => removeStart(minutes)}
                    aria-label={`Retirer ${formatMinutes(minutes)}`}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-accent px-4 text-[12.5px] font-semibold text-white transition hover:bg-accent-600"
                  >
                    {formatMinutes(minutes)} – {formatMinutes(minutes + DUREE_MIN)}
                    <IconClose size={13} />
                  </button>
                ))
              )}
            </div>

            <SectionLabel className="mb-2.5">Domaines couverts</SectionLabel>
            <div className="mb-5 flex flex-wrap gap-2">
              {domains.map((domain) => {
                const active = selectedDomains.includes(domain.id)
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => toggleDomain(domain.id)}
                    className={cn(
                      'inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition',
                      active
                        ? 'bg-accent-50 text-accent-700'
                        : 'border border-dashed border-locked-200 text-ink-faint hover:bg-muted',
                    )}
                  >
                    {domain.name}
                    {active ? <IconCheck size={13} /> : <IconPlus size={13} />}
                  </button>
                )
              })}
            </div>

            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-divider bg-canvas px-3.5 py-3">
              <div>
                <p className="text-[12.5px] font-semibold leading-snug text-ink">
                  {PRIX_EUR} € pour 1h30
                </p>
                <p className="text-[11px] leading-relaxed text-ink-faint">
                  Tarif fixé par la plateforme, commission incluse
                </p>
              </div>
            </div>

            <Button
              variant="dark"
              fullWidth
              size="lg"
              onClick={publish}
              disabled={startsToPublish.length === 0}
            >
              {startsToPublish.length === 0
                ? 'Ajoute au moins un horaire'
                : `Publier ${startsToPublish.length} créneau${startsToPublish.length > 1 ? 'x' : ''}`}
            </Button>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardTitle>
                Mes créneaux · {formatWeekday(day.toISOString())} {formatDateShort(day.toISOString())}
              </CardTitle>
              {daySlots.length === 0 ? (
                <p className="rounded-card border border-dashed border-locked-200 p-5 text-center text-[12.5px] leading-relaxed text-ink-subtle">
                  Aucun créneau ouvert ce jour-là.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {daySlots.map((slot) => {
                    const full = slot.places_prises >= slot.capacite
                    return (
                      <li
                        key={slot.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-divider px-3.5 py-3"
                      >
                        <div>
                          <p className="text-[13px] font-semibold text-ink">
                            {formatMinutes(minutesOf(new Date(slot.start_at)))} –{' '}
                            {formatMinutes(minutesOf(new Date(slot.start_at)) + slot.duree_min)}
                          </p>
                          <p className="text-[11.5px] text-ink-faint">
                            {slot.domaines
                              .map((id) => domains.find((d) => d.id === id)?.name ?? id)
                              .join(' · ') || 'Tous domaines'}
                          </p>
                        </div>
                        <Badge tone={full ? 'neutral' : 'mastered'} dot={!full}>
                          {slot.places_prises} / {slot.capacite}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {/* La carte « Élèves à suivre » est retiree jusqu'a l'espace professeur
                v1 : elle montrait des eleves factices (mocks/mockData) a un vrai
                professeur. Mieux vaut absent que faux. */}
          </div>
        </div>
      </PageBody>
    </AppShell>
  )
}
