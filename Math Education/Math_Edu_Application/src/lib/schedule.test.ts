import { describe, expect, it } from 'vitest'

import { isSameDay } from './format'
import {
  atMinutes,
  dayLabel,
  formatMinutes,
  isPastStart,
  overlaps,
  publishableDays,
  startBlock,
  startTimes,
} from './schedule'

// Recette du 3 octobre 2026 (un samedi) : la vue eleve disait « complet » sur des
// jours vides, et la vue professeur proposait de publier sur des jours passes.

const SAMEDI_10H = new Date(2026, 9, 3, 10, 0, 0)

describe('dayLabel', () => {
  it('ne dit pas « complet » d un jour sans aucun creneau', () => {
    expect(dayLabel([])).toBe('aucun créneau')
  })

  it('dit « complet » quand tous les creneaux du jour sont pris', () => {
    expect(dayLabel([{ isFull: true }, { isFull: true }])).toBe('complet')
  })

  it('compte les creneaux libres, au singulier comme au pluriel', () => {
    expect(dayLabel([{ isFull: false }])).toBe('1 créneau')
    expect(dayLabel([{ isFull: false }, { isFull: true }, { isFull: false }])).toBe('2 créneaux')
  })
})

describe('publishableDays', () => {
  it('commence aujourd hui, jamais au lundi deja passe', () => {
    const days = publishableDays(SAMEDI_10H, 10)

    expect(days).toHaveLength(10)
    expect(isSameDay(days[0], SAMEDI_10H)).toBe(true)
    expect(days.every((day) => day >= new Date(2026, 9, 3))).toBe(true)
  })

  it('inclut le dimanche', () => {
    const days = publishableDays(SAMEDI_10H, 2)
    expect(days[1].getDay()).toBe(0)
  })
})

describe('startTimes', () => {
  it('propose de 8h a 20h au quart d heure', () => {
    const starts = startTimes()

    expect(starts[0]).toBe(8 * 60)
    expect(starts[starts.length - 1]).toBe(20 * 60)
    expect(starts).toContain(9 * 60 + 15)
    expect(starts).toHaveLength(49)
  })
})

describe('formatMinutes et atMinutes', () => {
  it('ecrit l heure comme le reste de l application', () => {
    expect(formatMinutes(540)).toBe('9h')
    expect(formatMinutes(555)).toBe('9h15')
    expect(formatMinutes(20 * 60 + 45)).toBe('20h45')
  })

  it('pose le debut a la minute pres', () => {
    const start = atMinutes(new Date(2026, 9, 4), 9 * 60 + 45)
    expect(start.getHours()).toBe(9)
    expect(start.getMinutes()).toBe(45)
    expect(start.getDate()).toBe(4)
  })
})

describe('isPastStart', () => {
  it('refuse un debut deja passe aujourd hui', () => {
    expect(isPastStart(SAMEDI_10H, 9 * 60 + 45, SAMEDI_10H)).toBe(true)
    // Un cours qui commencerait a l'instant meme est deja trop tard.
    expect(isPastStart(SAMEDI_10H, 10 * 60, SAMEDI_10H)).toBe(true)
  })

  it('accepte un debut a venir aujourd hui, au quart d heure pres', () => {
    expect(isPastStart(SAMEDI_10H, 10 * 60 + 15, SAMEDI_10H)).toBe(false)
  })

  it('accepte tout debut d un jour a venir', () => {
    expect(isPastStart(new Date(2026, 9, 4), 8 * 60, SAMEDI_10H)).toBe(false)
  })

  it('refuse tout debut d un jour passe', () => {
    expect(isPastStart(new Date(2026, 9, 1), 18 * 60, SAMEDI_10H)).toBe(true)
  })
})

describe('chevauchement', () => {
  it('refuse deux cours de 1h30 separes d une heure', () => {
    expect(overlaps(14 * 60, 15 * 60, 90)).toBe(true)
    expect(overlaps(14 * 60, 15 * 60 + 15, 90)).toBe(true)
  })

  it('accepte deux cours qui se suivent sans se toucher', () => {
    expect(overlaps(14 * 60, 15 * 60 + 30, 90)).toBe(false)
    expect(overlaps(15 * 60 + 30, 14 * 60, 90)).toBe(false)
  })

  it('dit pourquoi un debut est bloque', () => {
    const demain = new Date(2026, 9, 4)
    const pris = [14 * 60]

    expect(startBlock(SAMEDI_10H, 9 * 60, SAMEDI_10H, [], 90)).toBe('passé')
    expect(startBlock(demain, 14 * 60 + 45, SAMEDI_10H, pris, 90)).toBe('chevauche')
    expect(startBlock(demain, 15 * 60 + 30, SAMEDI_10H, pris, 90)).toBeNull()
  })
})
