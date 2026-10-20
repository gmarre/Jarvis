import { describe, expect, it } from 'vitest'

import { seancesCetteSemaine, serieDeJours } from './serie'

// Horloge fixee : mardi 20 octobre 2026, 18 h (heure locale).
const MAINTENANT = new Date(2026, 9, 20, 18, 0)
const le = (jour: number, heure = 10) => new Date(2026, 9, jour, heure).toISOString()

describe('serieDeJours', () => {
  it('vaut zero sans aucune tentative', () => {
    expect(serieDeJours([], MAINTENANT)).toEqual({ jours: 0, aujourdhui: false, surSept: 0 })
  })

  it('compte les jours travailles jusqu a aujourd hui, plusieurs reponses par jour comptant une fois', () => {
    const dates = [le(20), le(20, 8), le(19), le(18)]
    expect(serieDeJours(dates, MAINTENANT)).toEqual({ jours: 3, aujourdhui: true, surSept: 3 })
  })

  it('reste vivante si l eleve a travaille hier mais pas encore aujourd hui', () => {
    expect(serieDeJours([le(19), le(18)], MAINTENANT)).toMatchObject({ jours: 2, aujourdhui: false })
  })

  it('pardonne un jour manque : le 17 sans travail ne rompt pas la serie', () => {
    const dates = [le(20), le(19), le(18), le(16), le(15)]
    expect(serieDeJours(dates, MAINTENANT)).toMatchObject({ jours: 5, aujourdhui: true })
  })

  it('pardonne aussi hier manque quand l eleve n a pas encore travaille aujourd hui', () => {
    expect(serieDeJours([le(18), le(17)], MAINTENANT)).toMatchObject({ jours: 2, aujourdhui: false })
  })

  it('deux jours manques d affilee terminent la serie, sans toucher aux 7 derniers jours', () => {
    expect(serieDeJours([le(17), le(16)], MAINTENANT)).toEqual({ jours: 0, aujourdhui: false, surSept: 2 })
    const dates = [le(20), le(17), le(16)]
    expect(serieDeJours(dates, MAINTENANT)).toEqual({ jours: 1, aujourdhui: true, surSept: 3 })
  })

  it('surSept ne compte que les 7 derniers jours, aujourd hui compris', () => {
    const dates = [le(20), le(14), le(13)]
    expect(serieDeJours(dates, MAINTENANT).surSept).toBe(2)
  })

  it('traverse un changement de mois', () => {
    const dates = [new Date(2026, 10, 1, 9).toISOString(), new Date(2026, 9, 31, 9).toISOString()]
    expect(serieDeJours(dates, new Date(2026, 10, 1, 20))).toMatchObject({ jours: 2, aujourdhui: true })
  })
})

describe('seancesCetteSemaine', () => {
  // Jeudi 22 octobre 2026, midi : la semaine part du lundi 19.
  const JEUDI = new Date(2026, 9, 22, 12, 0)
  it('compte les jours travailles depuis lundi, une fois chacun', () => {
    const dates = [
      new Date(2026, 9, 18, 10).toISOString(), // dimanche d'avant : hors semaine
      new Date(2026, 9, 19, 9).toISOString(),
      new Date(2026, 9, 19, 18).toISOString(), // meme jour
      new Date(2026, 9, 21, 17).toISOString(),
    ]
    expect(seancesCetteSemaine(dates, JEUDI)).toBe(2)
  })
  it('lundi matin, rien encore', () => {
    expect(seancesCetteSemaine([], new Date(2026, 9, 19, 8))).toBe(0)
  })
})
