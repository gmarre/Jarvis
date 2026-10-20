// Niveau de maitrise sur 5 et controles espaces (sprint 2, point 2).
//
// Table validee par Gauthier le 20 octobre 2026 (CLAUDE.md, sprint 2) :
//   0  pas encore travaillee
//   1  un exercice reussi
//   2  deux exercices differents reussis, aucun de niveau maitrise
//   3  rouverte apres un controle rate : un exercice de maitrise reussi la
//      remonte a 4
//   4  acquise (deux exercices differents reussis, dont un de maitrise) ;
//      controles a J+3, J+10, J+30 ; trois controles reussis d'affilee : 5
//   5  completement acquise, plus de controle
// Une competence validee par le test d'entree part de 4, avec des controles
// plus espaces (J+14, J+45). Un controle rate fait redescendre a 3.
//
// Ce module est pur : il ne lit ni la date du systeme ni le contenu, tout
// arrive en parametre, pour que les tests puissent avancer l'horloge.

export type Niveau = 0 | 1 | 2 | 3 | 4 | 5

/** Jours avant chaque controle d'une competence acquise par le travail. */
export const CONTROLES_JOURS = [3, 10, 30] as const
/** Jours avant chaque controle d'une competence validee par le test d'entree. */
export const CONTROLES_JOURS_TEST = [14, 45] as const

export interface EtatMaitrise {
  niveau: Niveau
  /** Exercices differents reussis depuis la derniere ouverture. */
  exercices_reussis: string[]
  /** Controles reussis d'affilee au niveau 4. */
  controles_reussis: number
  /** Date du prochain controle (ISO), null si aucun n'est prevu. */
  prochain_controle: string | null
  /** Acquise par le test d'entree plutot que par le travail. */
  valide_par_test: boolean
}

export const ETAT_INITIAL: EtatMaitrise = {
  niveau: 0,
  exercices_reussis: [],
  controles_reussis: 0,
  prochain_controle: null,
  valide_par_test: false,
}

/** Un exercice de niveau maitrise : son identifiant porte « -M- ». */
export function estDeMaitrise(exerciseId: string): boolean {
  return /-M-\d+$/.test(exerciseId)
}

function dansJours(jours: number, depuis: Date): string {
  const date = new Date(depuis)
  date.setDate(date.getDate() + jours)
  // Echeance le matin, comme les revisions des cartes : la competence
  // apparait des le debut de la journee.
  date.setHours(6, 0, 0, 0)
  return date.toISOString()
}

/** Calendrier des controles applicable a cette competence. */
function calendrier(etat: EtatMaitrise): readonly number[] {
  return etat.valide_par_test ? CONTROLES_JOURS_TEST : CONTROLES_JOURS
}

/** Etat d'une competence que le test d'entree vient de valider. */
export function valideeParLeTest(maintenant: Date): EtatMaitrise {
  return {
    niveau: 4,
    exercices_reussis: [],
    controles_reussis: 0,
    prochain_controle: dansJours(CONTROLES_JOURS_TEST[0], maintenant),
    valide_par_test: true,
  }
}

/** Le controle est-il du a cette date ? */
export function controleDu(etat: EtatMaitrise, maintenant: Date): boolean {
  if (etat.niveau !== 4 || !etat.prochain_controle) return false
  return new Date(etat.prochain_controle).getTime() <= maintenant.getTime()
}

export interface Evolution {
  etat: EtatMaitrise
  /** La competence vient d'atteindre le niveau 4 par le travail. */
  vientDEtreAcquise: boolean
  /** Un controle vient d'avoir lieu (niveau 4 au depart). */
  controle: 'reussi' | 'rate' | null
}

/**
 * Fait evoluer le niveau apres une reponse a un exercice de la competence.
 *
 * Au niveau 4, toute reponse compte comme un controle, qu'il soit du ou que
 * l'eleve revienne de lui-meme sur la competence : une erreur sur une
 * competence acquise doit la rouvrir, peu importe le moment.
 */
export function apresReponse(
  avant: EtatMaitrise,
  exerciseId: string,
  juste: boolean,
  maintenant: Date,
): Evolution {
  // Niveau 5 : plus de controle, l'etat ne bouge plus.
  if (avant.niveau === 5) return { etat: avant, vientDEtreAcquise: false, controle: null }

  if (avant.niveau === 4) {
    if (!juste) {
      return {
        etat: {
          ...avant,
          niveau: 3,
          exercices_reussis: [],
          controles_reussis: 0,
          prochain_controle: null,
        },
        vientDEtreAcquise: false,
        controle: 'rate',
      }
    }
    const jours = calendrier(avant)
    const reussis = avant.controles_reussis + 1
    if (reussis >= jours.length) {
      return {
        etat: { ...avant, niveau: 5, controles_reussis: reussis, prochain_controle: null },
        vientDEtreAcquise: false,
        controle: 'reussi',
      }
    }
    return {
      etat: {
        ...avant,
        controles_reussis: reussis,
        prochain_controle: dansJours(jours[reussis], maintenant),
      },
      vientDEtreAcquise: false,
      controle: 'reussi',
    }
  }

  // Niveaux 0 a 3 : la competence s'apprend. Une erreur ne fait pas
  // redescendre : elle se lit dans la fenetre des tentatives (redescente vers
  // les prerequis, lib/dag.ts).
  if (!juste) return { etat: avant, vientDEtreAcquise: false, controle: null }

  const exercices_reussis = avant.exercices_reussis.includes(exerciseId)
    ? avant.exercices_reussis
    : [...avant.exercices_reussis, exerciseId]
  const uneMaitrise = exercices_reussis.some(estDeMaitrise)

  const acquise =
    avant.niveau === 3
      ? // Rouverte : un exercice de maitrise reussi suffit a la remonter.
        estDeMaitrise(exerciseId)
      : exercices_reussis.length >= 2 && uneMaitrise

  if (acquise) {
    return {
      etat: {
        niveau: 4,
        exercices_reussis,
        controles_reussis: 0,
        prochain_controle: dansJours(CONTROLES_JOURS[0], maintenant),
        // Reacquise par le travail : le calendrier normal reprend.
        valide_par_test: false,
      },
      vientDEtreAcquise: true,
      controle: null,
    }
  }

  const niveau: Niveau = avant.niveau === 3 ? 3 : (Math.min(2, exercices_reussis.length) as Niveau)
  return {
    etat: { ...avant, niveau, exercices_reussis },
    vientDEtreAcquise: false,
    controle: null,
  }
}

/** Libelle court d'un niveau, pour l'ecran. */
export function libelleNiveau(niveau: Niveau): string {
  return [
    'Pas encore travaillée',
    'Un exercice réussi',
    'Deux exercices réussis',
    'À consolider',
    'Acquise',
    'Complètement acquise',
  ][niveau]
}

/**
 * Exercice propose pour un controle : un exercice d'entrainement ou de
 * maitrise (la decouverte ne prouve pas que la competence tient), le moins
 * recemment fait, pour ne pas controler la memoire d'une reponse.
 */
export function exerciceDeControle<E extends { id: string; level: string }>(
  exercices: E[],
  tentatives: { exercise_id: string; created_at: string }[],
): E | null {
  const candidats = exercices.filter((e) => e.level !== 'decouverte')
  const pool = candidats.length > 0 ? candidats : exercices
  if (pool.length === 0) return null
  const derniere = (id: string) =>
    Math.max(
      0,
      ...tentatives.filter((t) => t.exercise_id === id).map((t) => new Date(t.created_at).getTime()),
    )
  return [...pool].sort((a, b) => derniere(a.id) - derniere(b.id))[0]
}
