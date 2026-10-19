// Regles pures de l'accord parental, partagees entre l'Edge Function
// `accord-parental` et les tests Vitest de l'application.
//
// Rien ici ne touche au reseau ni a la base : validation des demandes, age,
// frequence d'envoi, et texte des emails. Le meme fichier sert au serveur et
// aux tests, comme correction.ts, pour qu'ils ne divergent pas.

/** Duree de validite d'un lien envoye au parent. */
export const VALIDITE_JOURS = 7
/** Delai minimal entre deux envois pour un meme eleve. */
export const DELAI_ENTRE_ENVOIS_S = 120
/** Plafond d'envois par eleve sur 24 heures. */
export const ENVOIS_MAX_PAR_JOUR = 5

export type ChampModifiable = 'date_naissance' | 'email'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Age revolu a une date donnee, a partir d'une date ISO (AAAA-MM-JJ). */
export function ageAu(naissance: string, aujourdhui: Date = new Date()): number | null {
  if (!DATE_ISO.test(naissance)) return null
  const [a, m, j] = naissance.split('-').map(Number)
  const date = new Date(Date.UTC(a, m - 1, j))
  // Une date comme 2014-02-31 est refusee plutot que decalee au 3 mars.
  if (date.getUTCFullYear() !== a || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== j) {
    return null
  }
  let age = aujourdhui.getUTCFullYear() - a
  const avantAnniversaire =
    aujourdhui.getUTCMonth() < m - 1 ||
    (aujourdhui.getUTCMonth() === m - 1 && aujourdhui.getUTCDate() < j)
  if (avantAnniversaire) age -= 1
  return age
}

/** Verifie la nouvelle valeur demandee. Rend un message d'erreur, ou null. */
export function verifierValeur(
  champ: ChampModifiable,
  valeur: string,
  aujourdhui: Date = new Date(),
): string | null {
  if (champ === 'email') {
    if (valeur.length > 254 || !EMAIL.test(valeur)) return 'Cette adresse semble incomplète.'
    return null
  }
  const age = ageAu(valeur, aujourdhui)
  if (age === null) return "Cette date n'est pas valide."
  if (age < 4 || age > 120) return 'Cette date de naissance semble impossible.'
  return null
}

/**
 * Peut-on envoyer un nouvel email au parent ? `envois` : dates des envois
 * precedents pour cet eleve. Rend null si oui, sinon le message a afficher.
 */
export function refusFrequence(envois: Date[], maintenant: Date = new Date()): string | null {
  const ilYA = (s: number) => maintenant.getTime() - s * 1000
  if (envois.some((d) => d.getTime() > ilYA(DELAI_ENTRE_ENVOIS_S))) {
    return 'Un email vient de partir. Attends deux minutes avant de le renvoyer.'
  }
  if (envois.filter((d) => d.getTime() > ilYA(24 * 3600)).length >= ENVOIS_MAX_PAR_JOUR) {
    return "Trop d'emails envoyés aujourd'hui. Réessaie demain."
  }
  return null
}

/** Echappe un texte avant de l'inserer dans le HTML d'un email. */
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formaterDate(iso: string): string {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

export interface Email {
  sujet: string
  texte: string
  html: string
}

function enHtml(paragraphes: string[], lien: string, bouton: string): string {
  const corps = paragraphes.map((p) => `<p>${echapper(p)}</p>`).join('\n')
  return `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">
${corps}
<p><a href="${echapper(lien)}" style="display:inline-block;padding:12px 20px;background:#0B5ED7;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">${echapper(bouton)}</a></p>
<p style="font-size:13px;color:#6b7280">Si le bouton ne marche pas, copiez ce lien dans votre navigateur : ${echapper(lien)}</p>
</body></html>`
}

/** Email de consentement : premiere inscription d'un enfant de moins de 15 ans. */
export function emailConsentement(prenom: string, lien: string): Email {
  const paragraphes = [
    'Bonjour,',
    `${prenom} vient de créer un compte sur Racine, une application d'entraînement en mathématiques, et a indiqué votre adresse comme celle de son parent.`,
    "Avant 15 ans, la loi demande l'accord d'un parent pour traiter les données de l'enfant : prénom, classe, date de naissance, réponses aux exercices et progression. Ces données sont hébergées dans l'Union européenne, ne sont ni vendues ni utilisées pour de la publicité.",
    `Pour donner votre accord, ouvrez le lien ci-dessous. Il est valable ${VALIDITE_JOURS} jours.`,
    "Si vous ne connaissez pas cette demande, ignorez simplement ce message.",
  ]
  return {
    sujet: `Accord pour le compte Racine de ${prenom}`,
    texte: `${paragraphes.join('\n\n')}\n\n${lien}`,
    html: enHtml(paragraphes, lien, 'Voir et donner mon accord'),
  }
}

/** Email de demande de modification : un mineur veut changer son email ou sa date de naissance. */
export function emailModification(
  prenom: string,
  champ: ChampModifiable,
  valeur: string,
  lien: string,
): Email {
  const quoi =
    champ === 'email'
      ? `changer l'adresse email de son compte pour : ${valeur}`
      : `changer sa date de naissance pour le ${formaterDate(valeur)}`
  const paragraphes = [
    'Bonjour,',
    `${prenom} demande à ${quoi}.`,
    "Votre enfant étant mineur, ce changement attend votre accord. Ouvrez le lien ci-dessous pour l'accepter ou le refuser.",
    `Le lien est valable ${VALIDITE_JOURS} jours. Sans réponse, rien ne change.`,
  ]
  return {
    sujet: `Racine : ${prenom} demande une modification de son compte`,
    texte: `${paragraphes.join('\n\n')}\n\n${lien}`,
    html: enHtml(paragraphes, lien, 'Voir la demande'),
  }
}
