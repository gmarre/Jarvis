import { describe, expect, it } from 'vitest'

import { serieDeJours } from './serie'

// Horloge fixee : mardi 20 octobre 2026, 18 h (heure locale).
const MAINTENANT = new Date(2026, 9, 20, 18, 0)
const le = (jour: number, heure = 10) => new Date(2026, 9, jour, heure).toISOString()

describe('serieDeJours', () => {
  it('vaut zero sans aucune tentative', () => {
    expect(serieDeJours([], MAINTENANT)).toEqual({ jours: 0, aujourdhui: false })
  })

  it('compte les jours consecutifs jusqu a aujourd hui, plusieurs reponses par jour comptant une fois', () => {
    const dates = [le(20), le(20, 8), le(19), le(18), le(16)]
    expect(serieDeJours(dates, MAINTENANT)).toEqual({ jours: 3, aujourdhui: true })
  })

  it('reste vivante si l eleve a travaille hier mais pas encore aujourd hui', () => {
    expect(serieDeJours([le(19), le(18)], MAINTENANT)).toEqual({ jours: 2, aujourdhui: false })
  })

  it('repart de zero apres un jour sans travail', () => {
    expect(serieDeJours([le(18), le(17)], MAINTENANT)).toEqual({ jours: 0, aujourdhui: false })
  })

  it('traverse un changement de mois', () => {
    const dates = [new Date(2026, 10, 1, 9).toISOString(), new Date(2026, 9, 31, 9).toISOString()]
    expect(serieDeJours(dates, new Date(2026, 10, 1, 20))).toEqual({ jours: 2, aujourdhui: true })
  })
})
