// Rapport hebdomadaire au parent (sprint 4, point 2 ; migration 0019).
//
// Code PARTAGE : la fonction rapport-hebdo (Deno) l'emploie, les tests de
// l'application le verifient. Aucun import, aucune API propre a un moteur.
//
// Contenu factuel, sans note ni classement ni serie (etude engagement) : ce
// que l'enfant a fait sur les 7 derniers jours, et une phrase neutre s'il n'a
// pas travaille. Chaque email porte un lien de desinscription en un clic.

export interface ActiviteSemaine {
  /** Dates des reponses aux exercices. */
  tentatives: { created_at: string; is_correct: boolean }[]
  /** Competences passees ou confirmees au niveau 4 ou plus pendant la semaine. */
  acquises: number
  /** Cartes defi revues pendant la semaine. */
  cartesRevues: number
  /** Super exercices reussis pendant la semaine. */
  superReussis: number
}

export interface ResumeSemaine {
  exercices: number
  justes: number
  jours: number
  acquises: number
  cartesRevues: number
  superReussis: number
}

export function resumer(a: ActiviteSemaine): ResumeSemaine {
  const jours = new Set(a.tentatives.map((t) => t.created_at.slice(0, 10)))
  return {
    exercices: a.tentatives.length,
    justes: a.tentatives.filter((t) => t.is_correct).length,
    jours: jours.size,
    acquises: a.acquises,
    cartesRevues: a.cartesRevues,
    superReussis: a.superReussis,
  }
}

/** Lundi (AAAA-MM-JJ) de la semaine d'une date, pour « une fois par semaine au plus ». */
export function lundiDe(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const decalage = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - decalage)
  return d.toISOString().slice(0, 10)
}

export interface EmailRapport {
  sujet: string
  texte: string
  html: string
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}

export function emailRapport(prenom: string, r: ResumeSemaine, lienEspace: string, lienDesinscription: string): EmailRapport {
  const lignes =
    r.exercices === 0 && r.cartesRevues === 0
      ? [
          `${prenom} n'a pas travaillé sur Racine ces 7 derniers jours.`,
          'Une séance de 10 à 15 minutes suffit pour reprendre : le plan du jour est prêt dans son espace.',
        ]
      : [
          `Ces 7 derniers jours, ${prenom} a travaillé ${pluriel(r.jours, 'jour')} sur Racine.`,
          `${pluriel(r.exercices, 'exercice')} fait${r.exercices > 1 ? 's' : ''}, dont ${r.justes} ${r.justes > 1 ? 'réponses justes' : 'réponse juste'}.`,
          ...(r.acquises > 0 ? [`${pluriel(r.acquises, 'compétence')} acquise${r.acquises > 1 ? 's' : ''} ou confirmée${r.acquises > 1 ? 's' : ''}.`] : []),
          ...(r.cartesRevues > 0 ? [`${pluriel(r.cartesRevues, 'carte défi')} revue${r.cartesRevues > 1 ? 's' : ''}.`] : []),
          ...(r.superReussis > 0 ? [`${pluriel(r.superReussis, 'super exercice')} réussi${r.superReussis > 1 ? 's' : ''}.`] : []),
        ]
  const fin = 'Vous recevez ce résumé parce que vous l’avez activé dans votre espace parent. Pour ne plus le recevoir :'
  return {
    sujet: `Racine : la semaine de ${prenom}`,
    texte: `${lignes.join('\n')}\n\nVotre espace parent : ${lienEspace}\n\n${fin} ${lienDesinscription}`,
    html:
      lignes.map((l) => `<p>${echapper(l)}</p>`).join('') +
      `<p><a href="${echapper(lienEspace)}">Ouvrir votre espace parent</a></p>` +
      `<p style="color:#666;font-size:12px">${echapper(fin)} <a href="${echapper(lienDesinscription)}">se désinscrire</a>.</p>`,
  }
}
