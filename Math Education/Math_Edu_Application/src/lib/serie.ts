// Serie de jours de travail (les « flammes »), calculee depuis les tentatives.
//
// Avant le sprint 2, l'ecran affichait 6 en dur : un chiffre faux, donc un
// texte mensonger. La serie compte les jours calendaires consecutifs avec au
// moins une reponse d'exercice. Elle reste vivante tant que l'eleve a
// travaille hier : on ne la casse pas le matin, avant qu'il ait eu le temps de
// s'y mettre. Pas de mecanique punitive (recommandations CNIL pour les
// mineurs) : une serie interrompue repart simplement de zero, sans message.

import { addDays, startOfDay } from './format'

export interface Serie {
  /** Nombre de jours consecutifs de travail, 0 si la serie est interrompue. */
  jours: number
  /** L'eleve a deja travaille aujourd'hui. */
  aujourdhui: boolean
}

/** `dates` : horodatages ISO des tentatives, dans n'importe quel ordre. */
export function serieDeJours(dates: string[], maintenant: Date = new Date()): Serie {
  const jours = new Set(dates.map((d) => startOfDay(new Date(d)).getTime()))
  const auj = startOfDay(maintenant)
  const aujourdhui = jours.has(auj.getTime())

  // Point de depart : aujourd'hui si l'eleve a travaille, sinon hier.
  let jour = aujourdhui ? auj : addDays(auj, -1)
  let n = 0
  while (jours.has(startOfDay(jour).getTime())) {
    n += 1
    jour = addDays(jour, -1)
  }
  return { jours: n, aujourdhui }
}
