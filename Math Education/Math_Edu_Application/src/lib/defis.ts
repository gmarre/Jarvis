// Cartes defi, recto et verso (sprint 2, point 4).
//
// Cycle de l'eleve sur une competence : decouvrir (carte mentale), un exercice
// simple, puis les cartes defi a retrouver de tete, puis des exercices de plus
// en plus durs. Une carte defi ne se corrige pas : l'eleve retourne la carte et
// dit s'il savait. Chaque carte a sa propre revision espacee, en cinq boites :
//
//   boite 1 : demain    boite 2 : J+3    boite 3 : J+7
//   boite 4 : J+14      boite 5 : J+30, puis tous les 30 jours
//
// « Je savais » fait monter d'une boite ; « je ne savais pas » renvoie en
// boite 1, et la carte revient a la fin de la seance en cours.
//
// Module pur : la date arrive en parametre, pour que les tests avancent
// l'horloge.

import type { Flashcard } from '@/types/content'
import type { FlashcardProgress } from '@/types/domain'

export const INTERVALLES_JOURS = [1, 3, 7, 14, 30] as const
export const BOITE_MAX = INTERVALLES_JOURS.length

export type DefiProgressMap = Record<string, FlashcardProgress>

function dansJours(jours: number, depuis: Date): string {
  const date = new Date(depuis)
  date.setDate(date.getDate() + jours)
  // Echeance le matin, comme les controles : la carte est a revoir des le
  // debut de la journee.
  date.setHours(6, 0, 0, 0)
  return date.toISOString()
}

/** Etat d'une carte apres la reponse de l'eleve. */
export function apresDefi(
  avant: FlashcardProgress | undefined,
  carte: Pick<Flashcard, 'id' | 'skill_id'>,
  savait: boolean,
  maintenant: Date,
): FlashcardProgress {
  const boite = savait ? Math.min((avant?.box ?? 0) + 1, BOITE_MAX) : 1
  return {
    card_id: carte.id,
    skill_id: carte.skill_id,
    box: boite,
    next_review_at: dansJours(INTERVALLES_JOURS[boite - 1], maintenant),
    reviews: (avant?.reviews ?? 0) + 1,
    last_knew: savait,
    updated_at: maintenant.toISOString(),
  }
}

/** La carte est-elle a revoir a cette date ? Une carte jamais vue ne l'est pas. */
export function defiDu(progression: FlashcardProgress | undefined, maintenant: Date): boolean {
  if (!progression) return false
  return new Date(progression.next_review_at).getTime() <= maintenant.getTime()
}

/**
 * Cartes d'une seance sur une competence : d'abord celles a revoir, les plus en
 * retard en premier, puis celles jamais vues, dans l'ordre du contenu. Les
 * cartes deja revues et pas encore dues ne reviennent pas : on ne fait pas
 * repeter ce qui tient.
 */
export function cartesDeLaSeance(
  cartes: Flashcard[],
  progression: DefiProgressMap,
  maintenant: Date,
): Flashcard[] {
  const dues = cartes
    .filter((c) => defiDu(progression[c.id], maintenant))
    .sort(
      (a, b) =>
        new Date(progression[a.id].next_review_at).getTime() -
        new Date(progression[b.id].next_review_at).getTime(),
    )
  const nouvelles = cartes.filter((c) => !progression[c.id])
  return [...dues, ...nouvelles]
}

/** Nombre de cartes a revoir aujourd'hui, par competence (cartes deja vues seulement). */
export function defisDusParCompetence(progression: DefiProgressMap, maintenant: Date): Map<string, number> {
  const parCompetence = new Map<string, number>()
  for (const p of Object.values(progression)) {
    if (defiDu(p, maintenant)) parCompetence.set(p.skill_id, (parCompetence.get(p.skill_id) ?? 0) + 1)
  }
  return parCompetence
}

/** Cartes d'une competence que l'eleve n'a encore jamais retournees. */
export function nombreDeNouvelles(cartes: Flashcard[], progression: DefiProgressMap): number {
  return cartes.filter((c) => !progression[c.id]).length
}
