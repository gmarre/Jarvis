import { useMemo, useState } from 'react'

import { domains, getSkill } from '@/content'
import { cn } from '@/lib/cn'
import { addDays, formatDateShort, formatWeekday, isSameDay, startOfWeek } from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Field'
import { Avatar, Level, Notice } from '@/components/ui/Misc'
import { IconCheck, IconPlus } from '@/components/ui/icons'
import { suiviEleves } from '@/mocks/mockData'
import { useSession } from '@/state/session'

// Ecran 7, vue professeur (maquette 1n, panneau de droite).
//
// Le professeur ne publie pas des creneaux dans le vide : il declare les
// domaines qu'il couvre, et l'application les propose en priorite aux eleves
// dont la lacune racine tombe dans ces domaines.

const HOURS = [14, 15, 16, 17, 18]
const DAYS_AHEAD = 10
const DUREE_MIN = 90
const PRIX_EUR = 20

export default function TeacherSchedulePage() {
  const { session, catalog, openSlots } = useSession()
  const profile = session?.profile

  const [dayOffset, setDayOffset] = useState(3)
  const [selectedHours, setSelectedHours] = useState<number[]>([14, 16])
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['C', 'A'])
  const [published, setPublished] = useState(false)

  const days = useMemo(() => {
    const monday = startOfWeek(new Date())
    return Array.from({ length: DAYS_AHEAD }, (_, index) => addDays(monday, index))
  }, [])

  const day = days[dayOffset] ?? days[0]

  const mySlots = useMemo(() => {
    if (!profile) return []
    return catalog.slots
      .filter((slot) => slot.prof_id === profile.id)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [catalog.slots, profile])

  const daySlots = mySlots.filter((slot) => isSameDay(new Date(slot.start_at), day))

  const toggleHour = (hour: number) =>
    setSelectedHours((current) =>
      current.includes(hour) ? current.filter((h) => h !== hour) : [...current, hour].sort(),
    )

  const toggleDomain = (id: string) =>
    setSelectedDomains((current) =>
      current.includes(id) ? current.filter((d) => d !== id) : [...current, id],
    )

  const publish = () => {
    if (selectedHours.length === 0) return
    openSlots(day.toISOString(), selectedHours, selectedDomains)
    setPublished(true)
    window.setTimeout(() => setPublished(false), 4000)
  }

  return (
    <AppShell>
      <PageBody className="max-w-[900px]">
        <PageHeader
          title="Ouvrir des créneaux"
          subtitle="Les élèves dont les lacunes correspondent à tes domaines les verront en priorité. 20 € pour 1h30, jusqu'à 3 élèves."
        />

        {published && (
          <Notice tone="mastered" className="mb-5">
            {selectedHours.length} créneau{selectedHours.length > 1 ? 'x' : ''} publié
            {selectedHours.length > 1 ? 's' : ''} pour le {formatWeekday(day.toISOString())}{' '}
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
                  onChange={(event) => setDayOffset(Number(event.target.value))}
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

            <SectionLabel className="mb-2.5">Heures</SectionLabel>
            <div className="mb-5 flex flex-wrap gap-2">
              {HOURS.map((hour) => {
                const alreadyOpen = daySlots.some(
                  (slot) => new Date(slot.start_at).getHours() === hour,
                )
                const active = selectedHours.includes(hour)
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => toggleHour(hour)}
                    disabled={alreadyOpen}
                    className={cn(
                      'min-h-[42px] rounded-[10px] border px-4 text-[12.5px] font-semibold transition',
                      alreadyOpen
                        ? 'cursor-not-allowed border-line bg-muted text-ink-faint'
                        : active
                          ? 'border-transparent bg-accent text-white'
                          : 'border-line bg-surface text-ink-muted hover:bg-muted',
                    )}
                  >
                    {hour}h{alreadyOpen && ' · ouvert'}
                  </button>
                )
              })}
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
                  Commission plateforme incluse
                </p>
              </div>
              <button type="button" className="text-[12.5px] font-semibold text-accent">
                Modifier
              </button>
            </div>

            <Button
              variant="dark"
              fullWidth
              size="lg"
              onClick={publish}
              disabled={selectedHours.length === 0}
            >
              {selectedHours.length === 0
                ? 'Choisis au moins une heure'
                : `Publier ${selectedHours.length} créneau${selectedHours.length > 1 ? 'x' : ''}`}
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
                            {new Date(slot.start_at).getHours()}h · 1h30
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

            <Card>
              <CardTitle>Élèves à suivre</CardTitle>
              <ul className="flex flex-col gap-2.5">
                {suiviEleves.map((eleve) => {
                  const skill = getSkill(eleve.lacune_skill_id)
                  return (
                    <li
                      key={eleve.prenom}
                      className="flex items-center gap-3 rounded-xl border border-divider px-3.5 py-3"
                    >
                      <Avatar initials={eleve.prenom.slice(0, 1) + eleve.prenom.slice(-2, -1)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {eleve.prenom} · <Level value={eleve.niveau as never} />
                        </p>
                        <p className="truncate text-[11.5px] text-ink-faint">
                          {skill ? (
                            <>
                              Lacune racine : {skill.label.toLowerCase()} (
                              <Level value={skill.school_level} />)
                            </>
                          ) : (
                            'Diagnostic en cours'
                          )}
                        </p>
                      </div>
                      <button type="button" className="shrink-0 text-xs font-semibold text-accent">
                        Graphe
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 border-t border-divider pt-3.5 text-[11px] leading-relaxed text-ink-faint">
                Tu vois la progression d'un élève uniquement s'il a autorisé le partage dans son
                profil.
              </p>
            </Card>
          </div>
        </div>
      </PageBody>
    </AppShell>
  )
}
