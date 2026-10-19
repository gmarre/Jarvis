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

// Accents : un eleve tape souvent « metre » sur une tablette. Aucune reponse de
// la banque ne se distingue d'une autre par un accent : on les retire
// (decomposition NFD, puis suppression des signes U+0300 a U+036F). Ecrit avec
// des codes plutot qu'avec les caracteres eux-memes, invisibles a la relecture.
const DIACRITIQUES = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g')

/** Minuscules, sans accents, espaces unifiees, virgule decimale unifiee. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    // cm² et cm2 s'equivalent : l'exposant se tape rarement au clavier.
    .replace(/\u00B2/g, '2')
    .replace(/\u00B3/g, '3')
    // Espaces insecables, frequents dans les grands nombres ecrits "1 024".
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,(?=\d)/g, '.')
    // Signe moins : le clavier d'un telephone ou un copier-coller donne souvent
    // le moins typographique (U+2212), un tiret demi-cadratin (U+2013) ou un
    // trait d'union insecable. Tous valent « - » (etape 5, nombres relatifs).
    .replace(/[\u2212\u2013\u2014\u2010\u2011\uFE63\uFF0D]/g, '-')
    // Apostrophe typographique du clavier d'un telephone, et ponctuation
    // finale : « C’est le triangle ! » vaut « c'est le triangle » (releve en
    // relecture, etape 4a). La ponctuation interne n'est pas touchee.
    .replace(/[’‘`]/g, "'")
    .replace(/[\s.!?;:]+$/, '')
}

/**
 * Durees et horaires : un eleve ecrit « 1 heure et 15 min », « 14:35 » ou
 * « 7 mn 50 s » pour ce que le contenu note « 1 h 15 min », « 14 h 35 »,
 * « 7 min 50 s » (releve en relecture, etape 4a). On ramene tout a h, min et s,
 * on retire le « et » entre deux unites, et on complete l'unite sous-entendue :
 * « 1 h 15 » vaut « 1 h 15 min ». S'applique apres le retrait des espaces.
 */
function normaliseDuree(compact: string): string {
  return compact
    // « 01:15 » et « 01 h 15 » : le zero devant l'heure ne change rien.
    .replace(/^0(\d)(?=[:h])/, '$1')
    .replace(/^(\d{1,2}):(\d{2})$/, '$1h$2')
    // « 1 heure, 15 minutes » : la virgule entre deux unites se lit comme « et ».
    .replace(/(heures?|h|minutes?|mn|min),(?=\d)/g, '$1')
    .replace(/(heures?|h|minutes?|mn|min)et(?=\d)/g, '$1')
    .replace(/(\d)heures?/g, '$1h')
    .replace(/(\d)(?:minutes?|mn)/g, '$1min')
    .replace(/(\d)(?:secondes?|sec)/g, '$1s')
    .replace(/^(\d+)h(\d+)$/, '$1h$2min')
    .replace(/^(\d+)min(\d+)$/, '$1min$2s')
}

/** Compare sans tenir compte des espaces : "3, 5, 8" vaut "3,5,8". */
function normalizeLoose(value: string): string {
  return normaliseDuree(normalize(value).replace(/\s/g, ''))
}

function toNumber(value: string): number | null {
  const cleaned = normalize(value)
    .replace(/\s/g, '')
    // « (-3) » : la parenthese d'un relatif ecrit comme dans un calcul.
    .replace(/^\(([+-]?\d+(?:\.\d+)?)\)$/, '$1')
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

/**
 * Noms des unites ecrits en toutes lettres, sous leur forme normalisee (sans
 * accent ni espace) : « 50 millimètres » vaut « 50 mm » quand l'unite attendue
 * est mm (releve en relecture, etape 4a). Le pluriel est ajoute plus bas.
 */
const NOMS_UNITES: Record<string, string[]> = {
  mm: ['millimetre'],
  cm: ['centimetre'],
  dm: ['decimetre'],
  m: ['metre'],
  dam: ['decametre'],
  hm: ['hectometre'],
  km: ['kilometre'],
  mg: ['milligramme'],
  g: ['gramme', 'gr'],
  kg: ['kilogramme', 'kilo'],
  t: ['tonne'],
  ml: ['millilitre'],
  cl: ['centilitre'],
  dl: ['decilitre'],
  l: ['litre'],
  hl: ['hectolitre'],
  s: ['seconde', 'sec'],
  min: ['minute', 'mn'],
  h: ['heure'],
  '°': ['degre'],
  // Temperatures (etape 5) : « -3 °C », « -3 degres », « -3 degres Celsius ».
  '°c': ['degre', 'degrecelsius', 'degrescelsius', 'c'],
  '\u20ac': ['euro', 'eur'],
}

/** Toutes les ecritures acceptees d'une unite : symbole, nom, pluriel, carre ou cube. */
function formesUnite(unit: string): Set<string> {
  const symbole = normalizeLoose(unit)
  const formes = new Set([symbole])
  const base = symbole.replace(/[23]$/, '')
  const exposant = symbole.slice(base.length)
  const suffixes = exposant === '2' ? ['carre', 'carres'] : exposant === '3' ? ['cube', 'cubes'] : ['']
  for (const nom of NOMS_UNITES[base] ?? []) {
    for (const forme of [nom, `${nom}s`]) {
      for (const suffixe of suffixes) formes.add(forme + suffixe)
    }
  }
  // « 9 cm carrés », « 8 cm cube » : le symbole suivi du mot (releve en
  // relecture, lot figures).
  if (exposant) for (const suffixe of suffixes) formes.add(base + suffixe)
  return formes
}

/**
 * Un nombre suivi de l'unite attendue, en symbole ou en toutes lettres. Une
 * autre unite que celle attendue n'est pas acceptee : « 5 cm » n'est pas
 * « 5 m ».
 */
function nombreAvecUnite(raw: string, unit: string | null | undefined): number | null {
  if (!unit) return null
  // « +8 °C » : le signe plus d'un relatif positif est permis (etape 5).
  const morceaux = normalizeLoose(raw).match(/^([+-]?\d+(?:\.\d+)?)(.+)$/)
  if (!morceaux || !formesUnite(unit).has(morceaux[2])) return null
  return Number(morceaux[1])
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
      const given = toNumber(raw) ?? nombreAvecUnite(raw, exercise.answer.unit)
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
  // Un prix s'ecrit avec ses centimes : 3,90 €, pas 3,9 € (releve en relecture,
  // etape 3). Un prix entier reste sans decimales : 42 €.
  const prix = unit === '€' && typeof value === 'number' && !Number.isInteger(value)
  const nombre = typeof value === 'number' ? (prix ? value.toFixed(2) : String(value)) : String(value)
  // Un negatif s'affiche avec le signe moins typographique, comme dans les
  // enonces : le trait d'union est trop court pour un eleve qui decouvre les
  // relatifs (etape 5). Ecrit par son code, invisible a la relecture.
  const shown =
    typeof value === 'number'
      ? nombre.replace('.', ',').replace(/^-/, String.fromCharCode(0x2212))
      : nombre
  // Le degre se colle au nombre (« 120° »), toutes les autres unites
  // s'en separent par une espace (« 12 cm »).
  if (unit === '°') return `${shown}°`
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
