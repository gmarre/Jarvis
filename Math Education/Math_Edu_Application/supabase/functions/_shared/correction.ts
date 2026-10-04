// Correction d'un exercice. Code PARTAGE : l'Edge Function `corriger` (Deno)
// et l'application (mode demonstration, tests) importent ce meme fichier, pour
// qu'une regle de correction ne puisse jamais differer entre les deux.
//
// Contraintes qui en decoulent : aucun import (ni alias `@/`, ni dependance),
// aucune API propre au navigateur ou a Deno. Les types sont structurels :
// `Exercise` (src/types/content.ts) leur est assignable.
//
// Point de vigilance produit : compter faux une reponse juste ecrite autrement
// (0,75 au lieu de 3/4, un espace en trop) casse la confiance de l'eleve plus
// surement qu'un bug. On normalise donc largement avant de comparer, et le
// schema prevoit `answer.accepted` pour les ecritures alternatives.

export interface ChoixACorriger {
  key: string
  text: string
  misconception: string | null
}

export interface ReponseAttendue {
  value: string | number | boolean
  accepted?: (string | number)[]
  tolerance?: number
  unit?: string | null
}

export interface ExerciceACorriger {
  type: 'numerique' | 'qcm' | 'texte' | 'vrai_faux'
  choices?: ChoixACorriger[]
  answer: ReponseAttendue
  solution_steps: string[]
}

export interface Correction {
  isCorrect: boolean
  /** Reponse attendue, mise en forme pour l'affichage du corrige. */
  expected: string
  /**
   * Cle de la bonne proposition, pour la mettre en evidence apres correction :
   * la lettre d'un QCM, 'true' ou 'false' pour un vrai/faux, null sinon.
   */
  expectedKey: string | null
  /**
   * Erreur de raisonnement revelee par le distracteur choisi (QCM). C'est ce
   * qui permet de diagnostiquer et pas seulement de sanctionner.
   */
  misconception: string | null
  /** Corrige etape par etape. */
  solutionSteps: string[]
}

/** Minuscules, sans accents parasites d'espacement, virgule decimale unifiee. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    // Espaces insecables, frequents dans les grands nombres ecrits "1 024".
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,(?=\d)/g, '.')
}

/** Compare sans tenir compte des espaces : "3, 5, 8" vaut "3,5,8". */
function normalizeLoose(value: string): string {
  return normalize(value).replace(/\s/g, '')
}

function toNumber(value: string): number | null {
  const cleaned = normalize(value).replace(/\s/g, '')
  if (cleaned === '') return null

  // Fraction saisie telle quelle : 3/4.
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** Le verdict seul : juste ou faux. */
function estJuste(exercise: ExerciceACorriger, raw: string): boolean {
  const expectedValue = exercise.answer.value
  if (raw.trim() === '') return false

  switch (exercise.type) {
    case 'qcm':
      return raw === String(expectedValue)

    case 'vrai_faux':
      return (raw === 'true') === Boolean(expectedValue)

    case 'numerique': {
      const given = toNumber(raw)
      const target = toNumber(String(expectedValue))
      if (given === null || target === null) return matchesAccepted(exercise, raw)
      const tolerance = exercise.answer.tolerance ?? floatNoise(target)
      return Math.abs(given - target) <= tolerance || matchesAccepted(exercise, raw)
    }

    case 'texte':
    default:
      return (
        normalizeLoose(raw) === normalizeLoose(String(expectedValue)) ||
        matchesAccepted(exercise, raw)
      )
  }
}

export function checkAnswer(exercise: ExerciceACorriger, raw: string): Correction {
  const value = exercise.answer.value
  const chosen = exercise.type === 'qcm' ? exercise.choices?.find((c) => c.key === raw) : undefined
  return {
    isCorrect: estJuste(exercise, raw),
    expected: formatExpected(exercise),
    expectedKey:
      exercise.type === 'qcm'
        ? String(value)
        : exercise.type === 'vrai_faux'
          ? String(Boolean(value))
          : null,
    misconception: chosen?.misconception ?? null,
    solutionSteps: exercise.solution_steps,
  }
}

/**
 * Marge minimale absorbant le bruit des flottants, et rien de plus.
 *
 * Une comparaison stricte comptait faux une reponse juste a cause de la
 * representation binaire : 3/4 saisi comme fraction donne 0.75 exactement, mais
 * une somme comme 0.1 + 0.2 ne vaut pas 0.3 en JavaScript. Cette marge est
 * volontairement minuscule : elle ne valide jamais une reponse arrondie. Une
 * tolerance pedagogique (accepter 0,33 pour un tiers) est une decision de
 * contenu et doit etre posee explicitement dans `answer.tolerance`.
 */
function floatNoise(target: number): number {
  return Math.max(Number.EPSILON, Math.abs(target) * 1e-9)
}

function matchesAccepted(exercise: ExerciceACorriger, raw: string): boolean {
  const accepted = exercise.answer.accepted ?? []
  return accepted.some((value) => normalizeLoose(String(value)) === normalizeLoose(raw))
}

/** Reponse attendue en clair, pour l'ecran de correction. */
export function formatExpected(exercise: ExerciceACorriger): string {
  const value = exercise.answer.value

  if (exercise.type === 'vrai_faux') return value ? 'Vrai' : 'Faux'

  if (exercise.type === 'qcm') {
    const choice = exercise.choices?.find((c) => c.key === String(value))
    return choice?.text ?? String(value)
  }

  const unit = exercise.answer.unit
  // Un nombre s'affiche a la francaise : 3.5 ecrit dans le contenu devient 3,5.
  // Sans cela, le corrige montrait « 3.5 » a un eleve a qui l'on apprend la
  // virgule (domaine D, nombres decimaux).
  const shown = typeof value === 'number' ? String(value).replace('.', ',') : String(value)
  return unit ? `${shown} ${unit}` : shown
}

// =============================================================================
// Recomposition depuis la base
// =============================================================================

/**
 * Ligne lue par l'Edge Function : content_exercises avec sa cle jointe
 * (migration 0005). La base range a part ce qui trahit la reponse.
 */
export interface LigneACorriger {
  type: ExerciceACorriger['type']
  choices: { key: string; text: string }[] | null
  content_exercise_keys: {
    answer: ReponseAttendue
    solution_steps: string[]
    misconceptions: Record<string, string | null>
  } | null
}

export function versExerciceACorriger(ligne: LigneACorriger): ExerciceACorriger | null {
  const cle = ligne.content_exercise_keys
  if (!cle) return null
  return {
    type: ligne.type,
    ...(ligne.choices
      ? {
          choices: ligne.choices.map((choix) => ({
            key: choix.key,
            text: choix.text,
            misconception: cle.misconceptions[choix.key] ?? null,
          })),
        }
      : {}),
    answer: cle.answer,
    solution_steps: cle.solution_steps,
  }
}
