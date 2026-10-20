// Rappels de travail par email (sprint 2, point 8 ; migration 0017).
//
// Code PARTAGE : la fonction rappel-revision (Deno) decide avec, les tests de
// l'application le verifient. Aucun import, aucune API propre a un moteur.
//
// Regles (Management de Projet/Etude_engagement.md, partie 4) :
//   - seulement un jour de travail choisi par l'eleve, et si rien n'est fait
//     ce jour-la ;
//   - a partir de l'heure choisie (7 h 30 a 19 h, heure de Paris), jamais
//     apres 19 h 30 : un Cron en retard n'ecrit pas le soir ;
//   - au plus 1 par jour et 3 par 7 jours ;
//   - arret apres 2 rappels d'affilee sans effet (aucune seance le jour du
//     rappel) : le rapport hebdomadaire prendra le relais (sprint 4) ;
//   - contenu factuel, sans serie ni reproche.

/** Fin de la plage d'envoi, en minutes depuis minuit (19 h 30). */
export const FIN_PLAGE = 19 * 60 + 30
export const MAX_PAR_SEMAINE = 3
export const SANS_EFFET_MAX = 2

const FORMAT_PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

export interface MomentParis {
  /** AAAA-MM-JJ, jour de Paris. */
  jour: string
  /** 1 lundi a 7 dimanche. */
  jourSemaine: number
  /** Minutes depuis minuit, heure de Paris. */
  minutes: number
}

export function momentParis(date: Date): MomentParis {
  const parts = Object.fromEntries(FORMAT_PARIS.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    jour: `${parts.year}-${parts.month}-${parts.day}`,
    jourSemaine: JOURS_COURTS.indexOf(String(parts.weekday).toLowerCase()) + 1,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/** « 17:00 » ou « 17:00:00 » en minutes. */
export function minutesDe(heure: string): number {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + (m || 0)
}

export interface SituationRappel {
  maintenant: Date
  heure: string
  /** Jours de travail choisis (1 a 7). */
  joursTravail: number[]
  pauseJusquAu: string | null
  /** Envois passes, du plus recent au plus ancien. */
  envois: { envoye_le: string; jour: string }[]
  /** Dates des exercices faits (toutes, ou au moins depuis le plus ancien envoi). */
  seances: string[]
}

export type Decision =
  | { envoyer: true }
  | { envoyer: false; raison: string; arreter?: boolean }

/** Faut-il envoyer le rappel maintenant ? Pur : tout arrive en parametre. */
export function decider(s: SituationRappel): Decision {
  const ici = momentParis(s.maintenant)
  if (s.pauseJusquAu && ici.jour <= s.pauseJusquAu) return { envoyer: false, raison: 'pause' }
  if (!s.joursTravail.includes(ici.jourSemaine)) return { envoyer: false, raison: 'pas un jour de travail' }
  if (ici.minutes < minutesDe(s.heure)) return { envoyer: false, raison: 'trop tot' }
  if (ici.minutes > FIN_PLAGE) return { envoyer: false, raison: 'trop tard' }
  if (s.envois.some((e) => e.jour === ici.jour)) return { envoyer: false, raison: 'deja envoye aujourd hui' }

  const joursSeances = new Set(s.seances.map((d) => momentParis(new Date(d)).jour))
  if (joursSeances.has(ici.jour)) return { envoyer: false, raison: 'deja travaille aujourd hui' }

  const ilYaUneSemaine = s.maintenant.getTime() - 7 * 24 * 3600 * 1000
  const recents = s.envois.filter((e) => new Date(e.envoye_le).getTime() > ilYaUneSemaine)
  if (recents.length >= MAX_PAR_SEMAINE) return { envoyer: false, raison: 'plafond de la semaine' }

  // Sans effet : aucune seance le jour du rappel. Deux d'affilee : on arrete.
  const derniers = s.envois.slice(0, SANS_EFFET_MAX)
  if (derniers.length === SANS_EFFET_MAX && derniers.every((e) => !joursSeances.has(e.jour))) {
    return { envoyer: false, raison: 'sans effet', arreter: true }
  }
  return { envoyer: true }
}

export interface EmailRappel {
  sujet: string
  texte: string
  html: string
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

/** Le rappel : factuel, sans serie, sans reproche, avec la desinscription. */
export function emailRappel(
  prenom: string,
  pourParent: boolean,
  rythme: number,
  lienTravail: string,
  lienDesinscription: string,
): EmailRappel {
  const qui = pourParent ? `${prenom} a choisi` : 'Tu as choisi'
  const sujet = pourParent ? `Racine : une séance prévue aujourd'hui pour ${prenom}` : "Racine : ta séance d'aujourd'hui"
  const corps = [
    `${qui} de travailler ${rythme} jours par semaine, et aujourd'hui en fait partie.`,
    'Une séance de 10 à 15 minutes suffit : le plan du jour est prêt.',
  ]
  const fin = pourParent
    ? 'Vous recevez cet email parce que vous avez accepté les rappels. Pour ne plus les recevoir :'
    : 'Tu reçois cet email parce que tu as activé les rappels. Pour ne plus les recevoir :'
  const texte = `${corps.join('\n')}\n\n${lienTravail}\n\n${fin} ${lienDesinscription}`
  const html =
    corps.map((l) => `<p>${echapper(l)}</p>`).join('') +
    `<p><a href="${echapper(lienTravail)}">Ouvrir le plan du jour</a></p>` +
    `<p style="color:#666;font-size:12px">${echapper(fin)} <a href="${echapper(lienDesinscription)}">se désinscrire</a>.</p>`
  return { sujet, texte, html }
}

/** La demande d'accord envoyee au parent avant 15 ans. */
export function emailAccordRappel(prenom: string, heure: string, lien: string): EmailRappel {
  const h = heure.slice(0, 5).replace(':', ' h ')
  const lignes = [
    `${prenom} aimerait recevoir un petit rappel les jours de travail qu'il ou elle a choisis sur Racine.`,
    `Ce rappel vous serait adressé, à vous, vers ${h}, et seulement si rien n'a encore été fait ce jour-là : au plus un par jour et trois par semaine.`,
    'Rien ne partira sans votre accord. Vous pourrez arrêter à tout moment par le lien de chaque email.',
  ]
  return {
    sujet: `Racine : ${prenom} demande des rappels de travail`,
    texte: `${lignes.join('\n')}\n\nAccepter ou refuser : ${lien}`,
    html:
      lignes.map((l) => `<p>${echapper(l)}</p>`).join('') +
      `<p><a href="${echapper(lien)}">Accepter ou refuser</a></p>`,
  }
}
