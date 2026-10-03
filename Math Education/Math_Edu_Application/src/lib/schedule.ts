// Regles de calendrier des cours particuliers, communes aux vues eleve et
// professeur. Pures et testees : les deux ecrans de la recette du 3 octobre 2026
// se trompaient precisement sur ces calculs.

import { addDays, isSameDay, startOfDay } from './format'

/**
 * Sous-titre d'un jour dans l'en-tete de la grille eleve.
 *
 * « complet » ne se dit que d'un jour qui a des creneaux, tous pris. Un jour sans
 * aucun creneau affichait « complet » : l'eleve croyait les places parties alors
 * qu'aucun professeur n'avait rien publie.
 */
export function dayLabel(slotsOfDay: { isFull: boolean }[]): string {
  if (slotsOfDay.length === 0) return 'aucun créneau'
  const free = slotsOfDay.filter((item) => !item.isFull).length
  if (free === 0) return 'complet'
  return `${free} créneau${free > 1 ? 'x' : ''}`
}

/**
 * Jours proposes au professeur pour ouvrir des creneaux : a partir
 * d'aujourd'hui, jamais avant. La liste partait du lundi de la semaine en cours,
 * ce qui permettait de publier un samedi des creneaux sur le jeudi passe.
 */
export function publishableDays(now: Date, count: number): Date[] {
  const today = startOfDay(now)
  return Array.from({ length: count }, (_, index) => addDays(today, index))
}

// Les horaires se manipulent en minutes depuis minuit : 555 vaut 9h15. Un
// nombre se compare et se trie sans piege de fuseau, contrairement a une Date.

/** Pas de choix d'un horaire de debut : le quart d'heure. */
export const START_STEP_MIN = 15
/** Premier debut possible, 8h. */
export const FIRST_START_MIN = 8 * 60
/** Dernier debut possible, 20h : le cours finit a 21h30. */
export const LAST_START_MIN = 20 * 60

/** Tous les debuts proposables d'une journee, de 8h a 20h au quart d'heure. */
export function startTimes(): number[] {
  const count = (LAST_START_MIN - FIRST_START_MIN) / START_STEP_MIN + 1
  return Array.from({ length: count }, (_, index) => FIRST_START_MIN + index * START_STEP_MIN)
}

/** 540 vers "9h", 555 vers "9h15". Meme ecriture que `formatHour`. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Minutes depuis minuit d'une date, dans le fuseau du navigateur. */
export function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** La date et l'heure de debut d'un cours, a partir du jour et des minutes. */
export function atMinutes(day: Date, minutes: number): Date {
  const start = new Date(day)
  start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return start
}

/**
 * Un debut est passe quand le cours commencerait avant maintenant, ou a
 * l'instant meme. Un jour anterieur est passe en entier.
 */
export function isPastStart(day: Date, minutes: number, now: Date): boolean {
  if (!isSameDay(day, now)) return startOfDay(day) < startOfDay(now)
  return atMinutes(day, minutes).getTime() <= now.getTime()
}

/**
 * Deux cours du meme professeur se chevauchent quand leurs debuts sont separes
 * de moins d'une duree. Avec des cours de 1h30 a l'heure pile, rien n'empechait
 * d'ouvrir 14h et 15h, donc deux seances en meme temps de 15h a 15h30.
 */
export function overlaps(a: number, b: number, durationMin: number): boolean {
  return Math.abs(a - b) < durationMin
}

export type StartBlock = 'passé' | 'chevauche'

/**
 * Pourquoi un debut n'est pas proposable, ou null s'il l'est. `taken` regroupe
 * les debuts deja ouverts ce jour-la et ceux deja choisis dans le formulaire.
 */
export function startBlock(
  day: Date,
  minutes: number,
  now: Date,
  taken: number[],
  durationMin: number,
): StartBlock | null {
  if (isPastStart(day, minutes, now)) return 'passé'
  if (taken.some((other) => overlaps(minutes, other, durationMin))) return 'chevauche'
  return null
}
