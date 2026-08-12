// Formatage francais : niveaux scolaires, dates, initiales, durees.

import type { SchoolLevel } from '@/types/content'

/**
 * Un niveau scolaire s'ecrit avec un exposant : 4e devient 4 puis "e" en
 * exposant. On renvoie les deux morceaux, la mise en forme reste au composant.
 */
export function splitLevel(level: SchoolLevel | null): { base: string; sup: string } {
  if (!level) return { base: '', sup: '' }
  const match = level.match(/^(\d+)(e|nde|ere|re)$/)
  if (!match) return { base: level, sup: '' }
  const [, digits, suffix] = match
  return { base: digits, sup: suffix === 'ere' ? 're' : suffix }
}

/** Version texte simple, pour les attributs title et aria-label. */
export function levelText(level: SchoolLevel | null): string {
  return level ?? 'niveau non renseigne'
}

export function initials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

const DATE_LONG = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const WEEKDAY_SHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

export function formatDateLong(iso: string): string {
  return DATE_LONG.format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return DATE_SHORT.format(new Date(iso))
}

export function formatWeekday(iso: string): string {
  return WEEKDAY.format(new Date(iso))
}

export function formatWeekdayShort(iso: string): string {
  return WEEKDAY_SHORT.format(new Date(iso)).replace('.', '')
}

/** "14h" ou "14h30", jamais "14:00" : on ecrit a des collegiens. */
export function formatHour(iso: string): string {
  const date = new Date(iso)
  const minutes = date.getMinutes()
  return minutes === 0 ? `${date.getHours()}h` : `${date.getHours()}h${String(minutes).padStart(2, '0')}`
}

export function formatTimeRange(iso: string, durationMin: number): string {
  const end = new Date(new Date(iso).getTime() + durationMin * 60_000)
  return `${formatHour(iso)} – ${formatHour(end.toISOString())}`
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

/** "il y a 3 jours", "aujourd'hui", "demain". */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const target = startOfDay(new Date(iso))
  const today = startOfDay(now)
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days === -1) return 'hier'
  if (days < 0) return `il y a ${Math.abs(days)} jours`
  return `dans ${days} jours`
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

/** Duree en secondes vers "8 min" ou "45 s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  return `${Math.round(seconds / 60)} min`
}

/** Lundi de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}
