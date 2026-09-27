// Age et consentement parental.
//
// Extrait de LoginPage parce que le nouvel ecran de complementation de profil
// (/bienvenue, retour de connexion Google) doit appliquer exactement la meme
// regle. Deux copies de cette logique finiraient par diverger, et c'est une
// regle juridique, pas un detail d'affichage.
//
// En France, en dessous de 15 ans, le traitement des donnees d'un mineur exige
// l'accord d'un titulaire de l'autorite parentale. La quasi-totalite des
// utilisateurs de l'application sont concernes.
//
// Ce fichier n'exporte aucun composant, pour garder le rechargement a chaud de
// Vite fonctionnel sur les ecrans qui l'utilisent.

/** Seuil legal francais : en dessous, l'accord d'un parent est obligatoire. */
export const MINIMUM_AGE_WITHOUT_CONSENT = 15

/**
 * Age revolu a la date de reference, ou null si la date est absente ou invalide.
 *
 * `now` est injectable pour que le calcul soit testable : sans ca, un test sur
 * un anniversaire du jour ne serait reproductible qu'un jour par an.
 */
export function ageFrom(birthDate: string, now: Date = new Date()): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  // Une date de naissance dans le futur est une saisie erronee, pas un age.
  if (birth.getTime() > now.getTime()) return null

  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

/**
 * L'accord d'un parent est-il requis pour ce compte ?
 *
 * Tant que la date de naissance n'est pas saisie, on repond oui pour un eleve :
 * mieux vaut demander le consentement a tort que l'oublier.
 */
export function needsParentalConsent(
  role: string,
  birthDate: string,
  now: Date = new Date(),
): boolean {
  if (role !== 'eleve') return false
  const age = ageFrom(birthDate, now)
  return age === null || age < MINIMUM_AGE_WITHOUT_CONSENT
}
