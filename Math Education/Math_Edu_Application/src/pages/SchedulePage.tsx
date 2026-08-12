import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import {
  addDays,
  formatDateShort,
  formatEuros,
  formatHour,
  formatTimeRange,
  formatWeekday,
  formatWeekdayShort,
  isSameDay,
  startOfWeek,
} from '@/lib/format'
import { AppShell, PageBody, PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, SectionLabel } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Field'
import { Avatar, EmptyState, Notice } from '@/components/ui/Misc'
import { IconChevronLeft, IconChevronRight, IconVideo } from '@/components/ui/icons'
import { useAuthenticatedSession } from '@/state/session'
import { useBookings, useSlots, type EnrichedSlot } from '@/state/useBookings'
import { useDailyPlan } from '@/state/usePlan'

// Ecran 7 : calendrier de cours, vue eleve (maquettes 1m desktop, 1n mobile).
//
// Le calendrier n'est pas un annuaire de profs : il est trie par pertinence
// pedagogique. Un creneau qui couvre la lacune racine de l'eleve remonte, et le
// professeur recoit le graphe avant la seance. C'est ce qui justifie la
// commission de la plateforme.

const DAYS_SHOWN = 6

export default function SchedulePage() {
  const { session, bookSlot, cancelBooking } = useAuthenticatedSession()
  const plan = useDailyPlan()
  const { upcoming } = useBookings()

  const gapDomains = useMemo(
    () => [...new Set(plan.rootGaps.map((skill) => skill.domain))],
    [plan.rootGaps],
  )

  const slots = useSlots(gapDomains)

  const [weekOffset, setWeekOffset] = useState(0)
  const [onlyGaps, setOnlyGaps] = useState(true)
  const [afterFive, setAfterFive] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date()
    return Math.min(Math.max((today.getDay() + 6) % 7, 0), DAYS_SHOWN - 1)
  })

  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date()), weekOffset * 7),
    [weekOffset],
  )
  const days = useMemo(
    () => Array.from({ length: DAYS_SHOWN }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )

  const weekSlots = useMemo(
    () =>
      slots.filter((item) => {
        const start = new Date(item.slot.start_at)
        if (start < weekStart || start >= addDays(weekStart, DAYS_SHOWN)) return false
        if (onlyGaps && gapDomains.length > 0 && !item.matchesGaps && !item.isBooked) return false
        if (afterFive && start.getHours() < 17 && !item.isBooked) return false
        return true
      }),
    [slots, weekStart, onlyGaps, afterFive, gapDomains],
  )

  const hours = useMemo(() => {
    const set = new Set(weekSlots.map((item) => new Date(item.slot.start_at).getHours()))
    if (set.size === 0) return [14, 15, 16, 17, 18]
    return [...set].sort((a, b) => a - b)
  }, [weekSlots])

  const selected =
    weekSlots.find((item) => item.slot.id === selectedId) ??
    weekSlots.find((item) => item.isBooked) ??
    weekSlots[0] ??
    null

  const bookingForSelected = selected
    ? session.bookings.find((b) => b.slot_id === selected.slot.id)
    : undefined

  const recommendedTeachers = useMemo(() => {
    const counts = new Map<string, { teacher: EnrichedSlot['teacher']; free: number }>()
    for (const item of weekSlots) {
      if (item.isFull || item.isBooked) continue
      const entry = counts.get(item.teacher.id)
      if (entry) entry.free += 1
      else counts.set(item.teacher.id, { teacher: item.teacher, free: 1 })
    }
    return [...counts.values()].sort((a, b) => b.free - a.free).slice(0, 3)
  }, [weekSlots])

  const daySlots = weekSlots.filter((item) =>
    isSameDay(new Date(item.slot.start_at), days[selectedDayIndex] ?? days[0]),
  )

  return (
    <AppShell
      railTop={
        <div>
          <SectionLabel className="mb-3">Filtrer</SectionLabel>
          <div className="flex flex-col gap-3">
            <Checkbox checked={onlyGaps} onChange={setOnlyGaps}>
              Sur mes lacunes
            </Checkbox>
            <Checkbox checked={afterFive} onChange={setAfterFive}>
              Après 17h
            </Checkbox>
          </div>
        </div>
      }
    >
      <PageBody>
        <PageHeader
          title="Réserver un cours"
          subtitle="20 € / 1h30, jusqu'à 3 élèves. Le professeur reçoit ton graphe et prépare la séance sur tes lacunes."
          actions={
            <div className="flex items-center overflow-hidden rounded-[10px] border border-line bg-surface">
              <button
                type="button"
                aria-label="Semaine précédente"
                onClick={() => setWeekOffset((current) => current - 1)}
                className="grid h-10 w-10 place-items-center text-ink-muted hover:bg-muted"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="border-x border-line px-4 text-[12.5px] font-semibold text-ink">
                {formatDateShort(weekStart.toISOString())} –{' '}
                {formatDateShort(addDays(weekStart, DAYS_SHOWN - 1).toISOString())}
              </span>
              <button
                type="button"
                aria-label="Semaine suivante"
                onClick={() => setWeekOffset((current) => current + 1)}
                className="grid h-10 w-10 place-items-center text-ink-muted hover:bg-muted"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          }
        />

        {/* Filtres mobiles */}
        <div className="mb-5 flex flex-wrap gap-4 lg:hidden">
          <Checkbox checked={onlyGaps} onChange={setOnlyGaps}>
            Sur mes lacunes
          </Checkbox>
          <Checkbox checked={afterFive} onChange={setAfterFive}>
            Après 17h
          </Checkbox>
        </div>

        {upcoming.length > 0 && (
          <Notice className="mb-5">
            Prochain cours : {upcoming[0].teacher.nom_court}, {formatWeekday(upcoming[0].slot.start_at)}{' '}
            {formatTimeRange(upcoming[0].slot.start_at, upcoming[0].slot.duree_min)}
            {upcoming[0].skill && <> · séance préparée sur « {upcoming[0].skill.label} »</>}.
          </Notice>
        )}

        {weekSlots.length === 0 ? (
          <Card tone="dashed" className="py-12">
            <EmptyState
              title="Aucun créneau cette semaine"
              description={
                onlyGaps
                  ? "Aucun professeur ne couvre tes lacunes sur cette semaine. Élargis le filtre ou regarde la semaine suivante."
                  : 'Aucune disponibilité publiée. Reviens dans quelques jours.'
              }
              action={
                onlyGaps ? (
                  <Button variant="secondary" size="lg" onClick={() => setOnlyGaps(false)}>
                    Voir tous les créneaux
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" onClick={() => setWeekOffset((c) => c + 1)}>
                    Semaine suivante
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            {/* Grille hebdomadaire, desktop */}
            <div className="hidden overflow-hidden rounded-panel border border-line bg-surface lg:block">
              <div
                className="grid border-b border-divider bg-canvas"
                style={{ gridTemplateColumns: `64px repeat(${DAYS_SHOWN}, 1fr)` }}
              >
                <div />
                {days.map((day) => {
                  const count = weekSlots.filter(
                    (item) => isSameDay(new Date(item.slot.start_at), day) && !item.isFull,
                  ).length
                  const hasBooking = weekSlots.some(
                    (item) => isSameDay(new Date(item.slot.start_at), day) && item.isBooked,
                  )
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'border-l border-divider px-2 py-3 text-center',
                        hasBooking && 'bg-accent-50',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[12.5px] font-semibold capitalize',
                          hasBooking ? 'text-accent-700' : 'text-ink',
                        )}
                      >
                        {formatWeekdayShort(day.toISOString())} {day.getDate()}
                      </p>
                      <p
                        className={cn(
                          'text-[11px] leading-relaxed',
                          hasBooking ? 'text-accent' : 'text-ink-faint',
                        )}
                      >
                        {hasBooking ? 'ton cours' : count === 0 ? 'complet' : `${count} créneaux`}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `64px repeat(${DAYS_SHOWN}, 1fr)`,
                  gridTemplateRows: `repeat(${hours.length}, 92px)`,
                }}
              >
                {hours.map((hour, rowIndex) => (
                  <div
                    key={`h-${hour}`}
                    className="px-2 py-2.5 text-right text-[11px] font-medium text-ink-faint"
                    style={{ gridColumn: 1, gridRow: rowIndex + 1 }}
                  >
                    {hour}h
                  </div>
                ))}

                {hours.map((hour, rowIndex) =>
                  days.map((day, columnIndex) => {
                    const item = weekSlots.find((candidate) => {
                      const start = new Date(candidate.slot.start_at)
                      return isSameDay(start, day) && start.getHours() === hour
                    })

                    return (
                      <div
                        key={`${hour}-${day.toISOString()}`}
                        className={cn(
                          'border-l border-divider p-1.5',
                          rowIndex < hours.length - 1 && 'border-b border-[#F5F3EE]',
                        )}
                        style={{ gridColumn: columnIndex + 2, gridRow: rowIndex + 1 }}
                      >
                        {item && (
                          <SlotCell
                            item={item}
                            selected={selected?.slot.id === item.slot.id}
                            onSelect={() => setSelectedId(item.slot.id)}
                          />
                        )}
                      </div>
                    )
                  }),
                )}
              </div>
            </div>

            {/* Bandeau de jours + liste, mobile */}
            <div className="lg:hidden">
              <div className="mb-4 flex gap-2 overflow-x-auto scroll-slim pb-1">
                {days.map((day, index) => {
                  const isSelected = index === selectedDayIndex
                  const count = weekSlots.filter(
                    (item) => isSameDay(new Date(item.slot.start_at), day) && !item.isFull,
                  ).length
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDayIndex(index)}
                      className={cn(
                        'w-14 shrink-0 rounded-xl border py-2.5 text-center transition',
                        isSelected
                          ? 'border-transparent bg-accent text-white'
                          : count === 0
                            ? 'border-transparent bg-muted text-ink-faint opacity-70'
                            : 'border-line bg-surface',
                      )}
                    >
                      <span
                        className={cn(
                          'block text-[10.5px] capitalize',
                          isSelected ? 'text-accent-200' : 'text-ink-faint',
                        )}
                      >
                        {formatWeekdayShort(day.toISOString())}
                      </span>
                      <span
                        className={cn(
                          'block text-[15px] font-semibold',
                          isSelected ? 'text-white' : 'text-ink',
                        )}
                      >
                        {day.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>

              {daySlots.length === 0 ? (
                <Card tone="dashed" className="py-8">
                  <EmptyState
                    title="Rien ce jour-là"
                    description="Choisis un autre jour dans le bandeau, ou change de semaine."
                  />
                </Card>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {daySlots.map((item) => (
                    <li key={item.slot.id}>
                      <SlotRow
                        item={item}
                        onBook={() => bookSlot(item.slot.id, plan.priority?.id ?? null)}
                        onCancel={() => {
                          const booking = session.bookings.find(
                            (b) => b.slot_id === item.slot.id,
                          )
                          if (booking) cancelBooking(booking.id)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Panneau lateral */}
            <div className="flex flex-col gap-4">
              {selected && (
                <Card>
                  <CardTitle>Créneau sélectionné</CardTitle>
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar
                      initials={selected.teacher.nom_court.replace(/[^A-ZÀ-Ý]/g, '').slice(0, 2)}
                      tone="neutral"
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-ink">
                        {selected.teacher.nom_court}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-faint">
                        {selected.teacher.titre} · {selected.teacher.note} ★ ·{' '}
                        {selected.teacher.nb_cours} cours
                      </p>
                    </div>
                  </div>

                  <dl className="flex flex-col gap-2.5 border-y border-divider py-3.5 text-[12.5px] font-medium text-ink-muted">
                    <DetailLine
                      label={`${formatWeekday(selected.slot.start_at)} ${formatDateShort(selected.slot.start_at)}`}
                      value={formatTimeRange(selected.slot.start_at, selected.slot.duree_min)}
                    />
                    <DetailLine label="Format" value="Visio" />
                    <DetailLine
                      label="Places"
                      value={`${selected.slot.capacite - selected.slot.places_prises} sur ${selected.slot.capacite}`}
                    />
                    <DetailLine label="Tarif" value={formatEuros(selected.slot.prix_eur)} />
                  </dl>

                  {plan.priority && (
                    <p className="my-3.5 rounded-[11px] bg-accent-50 p-3 text-[11.5px] leading-relaxed text-accent-700">
                      Séance préparée sur <b>{plan.priority.label}</b> — ta lacune racine du moment.
                    </p>
                  )}

                  {selected.isBooked ? (
                    <>
                      <div className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-muted py-3.5 text-[13.5px] font-semibold text-ink-faint">
                        <IconVideo size={16} />
                        Déjà réservé
                      </div>
                      <button
                        type="button"
                        onClick={() => bookingForSelected && cancelBooking(bookingForSelected.id)}
                        className="w-full text-center text-[12.5px] font-semibold text-wrong-600 hover:underline"
                      >
                        Annuler (gratuit jusqu'à 24h avant)
                      </button>
                    </>
                  ) : selected.isFull ? (
                    <Button variant="disabled" fullWidth disabled>
                      Complet
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      onClick={() => bookSlot(selected.slot.id, plan.priority?.id ?? null)}
                    >
                      Réserver ce créneau
                    </Button>
                  )}
                </Card>
              )}

              <Card>
                <CardTitle>Profs conseillés</CardTitle>
                <p className="mb-3.5 text-[11.5px] leading-relaxed text-ink-subtle">
                  Ceux qui couvrent tes lacunes actuelles.
                </p>
                {recommendedTeachers.length === 0 ? (
                  <p className="text-[12.5px] text-ink-faint">
                    Plus de disponibilité cette semaine.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {recommendedTeachers.map(({ teacher, free }) => (
                      <li
                        key={teacher.id}
                        className="flex items-center gap-3 rounded-xl border border-divider p-2.5"
                      >
                        <Avatar
                          initials={teacher.nom_court.replace(/[^A-ZÀ-Ý]/g, '').slice(0, 2)}
                          tone="neutral"
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold text-ink">
                            {teacher.nom_court}
                          </p>
                          <p className="truncate text-[11px] text-ink-faint">
                            {free} créneau{free > 1 ? 'x' : ''} libre{free > 1 ? 's' : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </PageBody>
    </AppShell>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="capitalize">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}

/** Case de la grille hebdomadaire. */
function SlotCell({
  item,
  selected,
  onSelect,
}: {
  item: EnrichedSlot
  selected: boolean
  onSelect: () => void
}) {
  if (item.isFull && !item.isBooked) {
    return (
      <div className="flex h-full flex-col justify-center rounded-[10px] border border-dashed border-[#D7D3C8] bg-muted px-2.5 py-2">
        <p className="text-[12px] font-semibold leading-tight text-ink-faint">Complet</p>
        <p className="truncate text-[10.5px] text-ink-faint">{item.teacher.nom_court}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex h-full w-full flex-col justify-center rounded-[10px] border px-2.5 py-2 text-left transition',
        item.isBooked
          ? 'border-transparent bg-accent'
          : selected
            ? 'border-[1.5px] border-accent bg-surface shadow-focus'
            : 'border-line bg-canvas hover:bg-surface',
      )}
    >
      <p
        className={cn(
          'truncate text-[12px] font-semibold leading-tight',
          item.isBooked ? 'text-white' : 'text-ink',
        )}
      >
        {item.teacher.nom_court}
        {item.isBooked && ' · réservé'}
      </p>
      <p
        className={cn(
          'truncate text-[10.5px] leading-relaxed',
          item.isBooked ? 'text-accent-200' : 'text-ink-subtle',
        )}
      >
        {item.isBooked
          ? 'Séance préparée'
          : `${formatHour(item.slot.start_at)} · ${formatEuros(item.slot.prix_eur)}`}
      </p>
    </button>
  )
}

/** Ligne de creneau, vue mobile. */
function SlotRow({
  item,
  onBook,
  onCancel,
}: {
  item: EnrichedSlot
  onBook: () => void
  onCancel: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border p-3.5',
        item.isBooked
          ? 'border-accent-100 bg-accent-50'
          : item.isFull
            ? 'border-dashed border-[#D7D3C8] bg-canvas opacity-75'
            : 'border-line bg-surface',
      )}
    >
      <Avatar
        initials={item.teacher.nom_court.replace(/[^A-ZÀ-Ý]/g, '').slice(0, 2)}
        tone={item.isBooked ? 'accent' : 'neutral'}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[13.5px] font-semibold leading-snug',
            item.isFull && !item.isBooked ? 'text-ink-faint' : 'text-ink',
          )}
        >
          {item.teacher.nom_court} · {formatHour(item.slot.start_at)}
        </p>
        <p className="truncate text-[11.5px] leading-relaxed text-ink-faint">
          {item.isFull && !item.isBooked
            ? 'Complet'
            : `${item.slot.duree_min} min · ${formatEuros(item.slot.prix_eur)}`}
        </p>
      </div>

      {item.isBooked ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone="accent">Réservé</Badge>
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-semibold text-wrong-600"
          >
            Annuler
          </button>
        </div>
      ) : (
        !item.isFull && (
          <Button variant="dark" size="sm" onClick={onBook} className="shrink-0">
            Réserver
          </Button>
        )
      )}
    </div>
  )
}
