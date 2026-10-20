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
// Super exercice (decision de Gauthier du 20 octobre 2026) : quand la
// competence a un super exercice, c'est sa reussite qui la fait passer au
// niveau 4, une fois les exercices reussis ; en attendant, elle reste a 3
// (super exercice a reussir). Le niveau 4 debloque les competences
// suivantes. Le niveau 5, le plus dur, demande en plus des controles un
// super exercice reussi sans faute ; il ne bloque rien.
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

/** Ce que l'eleve a fait du super exercice de la competence. */
export interface Epreuve {
  /** La competence a un super exercice. */
  existe: boolean
  /** Reussi au moins une fois (70 % des points). */
  reussie: boolean
  /** Reussi au moins une fois avec tous les points. */
  sansFaute: boolean
}

/** Competence sans super exercice (A001, G001, G004) : la table d'origine s'applique. */
export const SANS_EPREUVE: Epreuve = { existe: false, reussie: false, sansFaute: false }

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

/**
 * Les exercices sont-ils reussis comme il faut pour l'acquisition ? Deux
 * exercices differents dont un de maitrise ; au niveau 3 (rouverte, liste
 * remise a zero), un exercice de maitrise suffit.
 */
function exercicesFaits(etat: Pick<EtatMaitrise, 'niveau' | 'exercices_reussis'>): boolean {
  const uneMaitrise = etat.exercices_reussis.some(estDeMaitrise)
  return etat.niveau === 3 ? uneMaitrise : etat.exercices_reussis.length >= 2 && uneMaitrise
}

/** Exercices faits, super exercice pas encore reussi : c'est lui qui reste a passer. */
export function attendEpreuve(etat: EtatMaitrise, epreuve: Epreuve): boolean {
  return etat.niveau < 4 && epreuve.existe && !epreuve.reussie && exercicesFaits(etat)
}

/** Acquise, mais le niveau 5 demande encore le super exercice sans faute. */
export function viseSansFaute(etat: EtatMaitrise, epreuve: Epreuve): boolean {
  return etat.niveau === 4 && epreuve.existe && !epreuve.sansFaute
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
  /** Les exercices sont faits : le super exercice reste a reussir. */
  attendEpreuve: boolean
}

/** Etat acquis (niveau 4), avec le premier controle a J+3. */
function acquise(etat: EtatMaitrise, maintenant: Date): EtatMaitrise {
  return {
    ...etat,
    niveau: 4,
    controles_reussis: 0,
    prochain_controle: dansJours(CONTROLES_JOURS[0], maintenant),
    // Reacquise par le travail : le calendrier normal reprend.
    valide_par_test: false,
  }
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
  epreuve: Epreuve = SANS_EPREUVE,
): Evolution {
  const rien = { vientDEtreAcquise: false, controle: null, attendEpreuve: false } as const
  // Niveau 5 : plus de controle, l'etat ne bouge plus.
  if (avant.niveau === 5) return { ...rien, etat: avant }

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
        ...rien,
        controle: 'rate',
      }
    }
    const jours = calendrier(avant)
    const reussis = avant.controles_reussis + 1
    if (reussis >= jours.length) {
      // Controles faits : le niveau 5 attend encore le super exercice sans
      // faute, s'il existe. Plus de controle programme en attendant ; une
      // erreur sur la competence la rouvre toujours.
      const niveau = epreuve.existe && !epreuve.sansFaute ? 4 : 5
      return {
        ...rien,
        etat: { ...avant, niveau, controles_reussis: reussis, prochain_controle: null },
        controle: 'reussi',
      }
    }
    return {
      ...rien,
      etat: {
        ...avant,
        controles_reussis: reussis,
        prochain_controle: dansJours(jours[reussis], maintenant),
      },
      controle: 'reussi',
    }
  }

  // Niveaux 0 a 3 : la competence s'apprend. Une erreur ne fait pas
  // redescendre : elle se lit dans la fenetre des tentatives (redescente vers
  // les prerequis, lib/dag.ts).
  if (!juste) return { ...rien, etat: avant, attendEpreuve: attendEpreuve(avant, epreuve) }

  const exercices_reussis = avant.exercices_reussis.includes(exerciseId)
    ? avant.exercices_reussis
    : [...avant.exercices_reussis, exerciseId]
  const faits = exercicesFaits({ niveau: avant.niveau, exercices_reussis })

  if (faits && (!epreuve.existe || epreuve.reussie)) {
    return { ...rien, etat: acquise({ ...avant, exercices_reussis }, maintenant), vientDEtreAcquise: true }
  }

  // Exercices faits, super exercice a passer : la competence attend au
  // niveau 3, juste sous l'acquisition.
  const niveau: Niveau =
    avant.niveau === 3 || faits ? 3 : (Math.min(2, exercices_reussis.length) as Niveau)
  const etat = { ...avant, niveau, exercices_reussis }
  return { ...rien, etat, attendEpreuve: attendEpreuve(etat, epreuve) }
}

/**
 * Fait evoluer le niveau apres un super exercice dont la competence est la
 * porteuse. Reussi, il la fait passer au niveau 4 si les exercices sont
 * faits ; sans faute, il ouvre le niveau 5 si les controles sont faits.
 * Un super exercice rate ne fait rien redescendre : il melange plusieurs
 * competences, son echec ne prouve pas que celle-ci est perdue.
 */
export function apresEpreuve(
  avant: EtatMaitrise,
  passage: { reussie: boolean; sansFaute: boolean },
  maintenant: Date,
): Evolution {
  const rien = { vientDEtreAcquise: false, controle: null, attendEpreuve: false } as const
  if (avant.niveau === 5) return { ...rien, etat: avant }
  if (avant.niveau === 4) {
    const controlesFaits = avant.controles_reussis >= calendrier(avant).length
    if (passage.sansFaute && controlesFaits) {
      return { ...rien, etat: { ...avant, niveau: 5, prochain_controle: null } }
    }
    return { ...rien, etat: avant }
  }
  if (passage.reussie && exercicesFaits(avant)) {
    return { ...rien, etat: acquise(avant, maintenant), vientDEtreAcquise: true }
  }
  return { ...rien, etat: avant, attendEpreuve: !passage.reussie && exercicesFaits(avant) }
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

// =============================================================================
// Ligne de progression (table skill_progress) : ce que le serveur ecrit
// =============================================================================
//
// Sprint 6 : la progression n'est plus ecrite par le navigateur, qui pouvait la
// falsifier. La fonction `corriger` applique une reponse, `rendre-super` un
// super exercice, avec ces deux fonctions ; l'application les emploie aussi
// (mode demonstration, tests), pour que les deux calculs soient identiques.

export type StatutLigne = 'locked' | 'available' | 'in_progress' | 'mastered'

export interface LigneProgres {
  skill_id: string
  status: StatutLigne
  /** Fenetre des dernieres reponses, de la plus ancienne a la plus recente. */
  recent: boolean[]
  score: number
  attempts: number
  next_review_at: string | null
  review_box: number
  updated_at: string | null
  niveau: Niveau
  exercices_reussis: string[]
  controles_reussis: number
  prochain_controle: string | null
  valide_par_test: boolean
}

export function ligneVide(skillId: string): LigneProgres {
  return {
    skill_id: skillId,
    status: 'locked',
    recent: [],
    score: 0,
    attempts: 0,
    next_review_at: null,
    review_box: 0,
    updated_at: null,
    ...ETAT_INITIAL,
  }
}

/** Premiere relecture espacee de la carte mentale, le lendemain de l'acquisition. */
function demainMatin(depuis: Date): string {
  const date = new Date(depuis)
  date.setDate(date.getDate() + 1)
  date.setHours(6, 0, 0, 0)
  return date.toISOString()
}

function etatDeLigne(l: LigneProgres): EtatMaitrise {
  return {
    niveau: l.niveau,
    exercices_reussis: l.exercices_reussis,
    controles_reussis: l.controles_reussis,
    prochain_controle: l.prochain_controle,
    valide_par_test: l.valide_par_test,
  }
}

export interface ApresTentative extends Omit<Evolution, 'etat'> {
  ligne: LigneProgres
}

/**
 * Applique une reponse a la ligne d'une competence. `fenetre` : la taille de
 * la fenetre des dernieres reponses (mastery_threshold.out_of de la
 * competence), qui sert a reperer l'echec repete.
 */
export function apresTentative(
  base: LigneProgres,
  fenetre: number,
  exerciseId: string,
  juste: boolean,
  maintenant: Date,
  epreuve: Epreuve = SANS_EPREUVE,
): ApresTentative {
  const evolution = apresReponse(etatDeLigne(base), exerciseId, juste, maintenant, epreuve)
  const recent = [...base.recent, juste].slice(-fenetre)
  const ligne: LigneProgres = {
    ...base,
    ...evolution.etat,
    status: evolution.etat.niveau >= 4 ? 'mastered' : 'in_progress',
    recent,
    score: recent.filter(Boolean).length,
    attempts: recent.length,
    updated_at: maintenant.toISOString(),
    // La carte mentale entre en relecture espacee a l'acquisition (J+1).
    ...(evolution.vientDEtreAcquise ? { review_box: 1, next_review_at: demainMatin(maintenant) } : {}),
  }
  return { ligne, vientDEtreAcquise: evolution.vientDEtreAcquise, controle: evolution.controle, attendEpreuve: evolution.attendEpreuve }
}

/** Applique un passage du super exercice a la ligne de sa competence porteuse. */
export function apresPassageSuper(
  base: LigneProgres,
  passage: { reussie: boolean; sansFaute: boolean },
  maintenant: Date,
): { ligne: LigneProgres; vientDEtreAcquise: boolean } {
  const evolution = apresEpreuve(etatDeLigne(base), passage, maintenant)
  const ligne: LigneProgres = {
    ...base,
    ...evolution.etat,
    status: evolution.etat.niveau >= 4 ? 'mastered' : base.attempts > 0 ? 'in_progress' : base.status,
    updated_at: maintenant.toISOString(),
    ...(evolution.vientDEtreAcquise ? { review_box: 1, next_review_at: demainMatin(maintenant) } : {}),
  }
  return { ligne, vientDEtreAcquise: evolution.vientDEtreAcquise }
}
