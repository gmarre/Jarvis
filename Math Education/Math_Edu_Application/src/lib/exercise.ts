// Correction d'un exercice.
//
// Point de vigilance produit : compter faux une reponse juste ecrite autrement
// (0,75 au lieu de 3/4, un espace en trop) casse la confiance de l'eleve plus
// surement qu'un bug. On normalise donc largement avant de comparer, et le
// schema prevoit `answer.accepted` pour les ecritures alternatives.

import type { Exercise } from '@/types/content'

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

export interface Correction {
  isCorrect: boolean
  /** Reponse attendue, mise en forme pour l'affichage du corrige. */
  expected: string
  /**
   * Erreur de raisonnement revelee par le distracteur choisi (QCM). C'est ce
   * qui permettra plus tard de diagnostiquer et pas seulement de sanctionner.
   */
  misconception: string | null
}

export function checkAnswer(exercise: Exercise, raw: string): Correction {
  const expectedValue = exercise.answer.value
  const expected = formatExpected(exercise)

  if (raw.trim() === '') {
    return { isCorrect: false, expected, misconception: null }
  }

  switch (exercise.type) {
    case 'qcm': {
      const chosen = exercise.choices?.find((c) => c.key === raw)
      return {
        isCorrect: raw === String(expectedValue),
        expected,
        misconception: chosen?.misconception ?? null,
      }
    }

    case 'vrai_faux': {
      const given = raw === 'true'
      return { isCorrect: given === Boolean(expectedValue), expected, misconception: null }
    }

    case 'numerique': {
      const given = toNumber(raw)
      const target = toNumber(String(expectedValue))
      if (given === null || target === null) {
        return { isCorrect: matchesAccepted(exercise, raw), expected, misconception: null }
      }
      const tolerance = exercise.answer.tolerance ?? 0
      const isCorrect =
        Math.abs(given - target) <= tolerance || matchesAccepted(exercise, raw)
      return { isCorrect, expected, misconception: null }
    }

    case 'texte':
    default: {
      const isCorrect =
        normalizeLoose(raw) === normalizeLoose(String(expectedValue)) ||
        matchesAccepted(exercise, raw)
      return { isCorrect, expected, misconception: null }
    }
  }
}

function matchesAccepted(exercise: Exercise, raw: string): boolean {
  const accepted = exercise.answer.accepted ?? []
  return accepted.some((value) => normalizeLoose(String(value)) === normalizeLoose(raw))
}

/** Reponse attendue en clair, pour l'ecran de correction. */
export function formatExpected(exercise: Exercise): string {
  const value = exercise.answer.value

  if (exercise.type === 'vrai_faux') return value ? 'Vrai' : 'Faux'

  if (exercise.type === 'qcm') {
    const choice = exercise.choices?.find((c) => c.key === String(value))
    return choice?.text ?? String(value)
  }

  const unit = exercise.answer.unit
  return unit ? `${value} ${unit}` : String(value)
}

const LEVEL_LABELS: Record<Exercise['level'], string> = {
  decouverte: 'Découverte',
  entrainement: 'Entraînement',
  maitrise: 'Maîtrise',
}

export function exerciseLevelLabel(level: Exercise['level']): string {
  return LEVEL_LABELS[level]
}
