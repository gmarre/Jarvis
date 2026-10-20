// Serie de jours de travail (les « flammes »), calculee depuis les tentatives.
//
// Avant le sprint 2, l'ecran affichait 6 en dur : un chiffre faux, donc un
// texte mensonger. La serie compte les jours avec au moins une reponse
// d'exercice.
//
// Une serie qui pardonne (etude engagement, sprint 2 point 8) : un jour manque
// ne la rompt pas, deux jours manques d'affilee la terminent, sans message.
// Une serie cassee fait decrocher a comportement egal (Silverman et Barasch,
// 2023), et une habitude survit a un oubli (Lally et al., 2010). Pas de
// mecanique punitive (recommandations CNIL pour les mineurs).
//
// La carte affiche aussi le nombre de jours travailles sur les 7 derniers :
// une mesure de regularite qui ne retombe pas a zero.

import { addDays, startOfDay } from './format'

export interface Serie {
  /** Jours travailles dans la serie en cours, 0 si elle est terminee. */
  jours: number
  /** L'eleve a deja travaille aujourd'hui. */
  aujourdhui: boolean
  /** Jours travailles sur les 7 derniers, aujourd'hui compris. */
  surSept: number
}

/** Jours manques d'affilee qui terminent une serie. */
const MANQUES_QUI_TERMINENT = 2

/** `dates` : horodatages ISO des tentatives, dans n'importe quel ordre. */
export function serieDeJours(dates: string[], maintenant: Date = new Date()): Serie {
  const jours = new Set(dates.map((d) => startOfDay(new Date(d)).getTime()))
  const auj = startOfDay(maintenant)
  const aujourdhui = jours.has(auj.getTime())

  let surSept = 0
  for (let i = 0; i < 7; i++) if (jours.has(addDays(auj, -i).getTime())) surSept += 1

  if (jours.size === 0) return { jours: 0, aujourdhui, surSept }
  const premier = Math.min(...jours)

  // Point de depart : aujourd'hui si l'eleve a travaille, sinon hier (la
  // journee en cours n'est pas encore manquee).
  let jour = aujourdhui ? auj : addDays(auj, -1)
  let n = 0
  let manques = 0
  while (startOfDay(jour).getTime() >= premier) {
    if (jours.has(startOfDay(jour).getTime())) {
      n += 1
      manques = 0
    } else {
      manques += 1
      if (manques >= MANQUES_QUI_TERMINENT) break
    }
    jour = addDays(jour, -1)
  }
  return { jours: n, aujourdhui, surSept }
}

/**
 * Seances de la semaine en cours (lundi a aujourd'hui), pour « 2 séances sur 3
 * cette semaine » (rythme choisi par l'eleve, etude engagement, point 2). Une
 * seance = un jour avec au moins une reponse.
 */
export function seancesCetteSemaine(dates: string[], maintenant: Date = new Date()): number {
  const auj = startOfDay(maintenant)
  // getDay : 0 dimanche ; on compte depuis le lundi.
  const lundi = addDays(auj, -((auj.getDay() + 6) % 7))
  const jours = new Set(dates.map((d) => startOfDay(new Date(d)).getTime()))
  let n = 0
  for (let j = lundi; j.getTime() <= auj.getTime(); j = addDays(j, 1)) if (jours.has(j.getTime())) n += 1
  return n
}
