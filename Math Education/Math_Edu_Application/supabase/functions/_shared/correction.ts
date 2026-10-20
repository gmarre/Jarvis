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

// Exposants (etape 6, puissances) : « 10³ », « 10⁻³ », « 10^3 », « 10**3 »,
// « 10 puissance 3 » s'ecrivent tous « 10^3 ». Un exposant ne se lit comme tel
// qu'apres un chiffre ou une parenthese : apres une lettre, « cm² » reste une
// unite (« cm2 »). Sans cette regle, « 10³ » devenait « 103 » et etait accepte
// pour la reponse 103. Les exposants Unicode sont ecrits par leur code.
const CHIFFRES_EXPOSANTS = [0x2070, 0xb9, 0xb2, 0xb3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079].map(
  (code) => String.fromCharCode(code),
)
const MOINS_EXPOSANT = String.fromCharCode(0x207b)
const EXPOSANT = new RegExp(`(?<=[\\d)])(${MOINS_EXPOSANT}?[${CHIFFRES_EXPOSANTS.join('')}]+)`, 'g')

function exposantsEnClair(value: string): string {
  return value
    .replace(EXPOSANT, (bloc) =>
      '^' +
      [...bloc]
        .map((c) => (c === MOINS_EXPOSANT ? '-' : String(CHIFFRES_EXPOSANTS.indexOf(c))))
        .join(''),
    )
    .replace(/\*\*/g, '^')
    .replace(/(\d)\s*puissance\s*/g, '$1^')
    .replace(/\^\s*\(\s*(-?\d+)\s*\)/g, '^$1')
    .replace(/\^\s+/g, '^')
}

/**
 * Signes de multiplication : « 3,2 × 10^4 », « 3,2 x 10^4 », « 3,2*10^4 »,
 * « 3,2·10^4 » s'ecrivent tous avec ×. La lettre x n'est lue comme un signe
 * qu'entre deux nombres, pour ne pas toucher a une inconnue (etape 7).
 * Rien n'est calcule : « 2^5 » n'est pas 32, sinon un eleve repondrait
 * « Calcule 2⁵ » en recopiant l'enonce.
 */
function multiplicationsEnClair(value: string): string {
  return value
    .replace(/[*\u00B7\u2219\u22C5]/g, '\u00D7')
    .replace(/(?<=\d)\s*x\s*(?=\d)/g, '\u00D7')
    // \u00AB 1,496 fois 10^8 \u00BB : le mot, tape sur un telephone (relecture, etape 6).
    .replace(/(?<=\d)\s*fois\s*(?=\d)/g, '\u00D7')
}

/** Minuscules, sans accents, espaces unifiees, virgule decimale unifiee. */
function normalize(value: string): string {
  return multiplicationsEnClair(exposantsEnClair(value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')))
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
  let cleaned = normalize(value)
    .replace(/\s/g, '')
    // « (-3) » : la parenthese d'un relatif ecrit comme dans un calcul.
    .replace(/^\(([+-]?\d+(?:\.\d+)?)\)$/, '$1')
    // « 3 ÷ 4 » se lit comme la fraction 3/4 (etape 6).
    .replace(/\u00F7/g, '/')
  if (cleaned === '') return null

  // « −(5/2) » et « (−5)/2 » : le signe devant la fraction, ou un terme entre
  // parentheses, comme dans un calcul ecrit (etape 6, fractions relatives).
  let signe = 1
  const entoure = cleaned.match(/^-\((.+)\)$/)
  if (entoure) {
    signe = -1
    cleaned = entoure[1]
  }
  cleaned = cleaned.replace(/\(([+-]?\d+(?:\.\d+)?)\)/g, '$1')

  // Fraction saisie telle quelle : 3/4.
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return (signe * Number(fraction[1])) / denominator
  }

  // « 1e3 » : Number() lit la notation exponentielle de JavaScript, qu'aucun
  // eleve n'ecrit ; on ne l'accepte pas.
  if (/e/.test(cleaned)) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? signe * parsed : null
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
  // « 225 cm^2 » : l'exposant tape comme dans une puissance (relecture, etape 6).
  if (exposant) formes.add(`${base}^${exposant}`)
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

/**
 * Fraction ecrite avec son signe, ramenee a « -a/b » ou « a/b » sans etre
 * reduite : « 6/(-10) », « (-6)/10 », « -(6/10) », « 6/-10 » valent tous
 * « -6/10 » (releve en relecture, etape 6), mais « -3/-5 » ne vaut pas « 3/5 ». La
 * forme demandee (irreductible ou non) reste exigee : 6/10 n'est pas 3/5.
 */
function fractionSignee(value: string): string | null {
  let texte = normalizeLoose(value)
  let signe = 1
  const entoure = texte.match(/^-\((.+)\)$/)
  if (entoure) {
    signe = -1
    texte = entoure[1]
  }
  texte = texte.replace(/\((-?\d+(?:\.\d+)?)\)/g, '$1')
  const morceaux = texte.match(/^(-?)(\d+(?:\.\d+)?)\/(-?)(\d+(?:\.\d+)?)$/)
  if (!morceaux) return null
  // « -3/-7 » n'est pas ramene a « 3/7 » : simplifier les deux signes est
  // souvent ce que l'exercice evalue (C034, relecture de l'etape 6).
  if (morceaux[1] && morceaux[3]) return null
  if (morceaux[1] || morceaux[3]) signe = -signe
  return `${signe < 0 ? '-' : ''}${morceaux[2]}/${morceaux[4]}`
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
      // « n = 13 » pour « Que vaut n ? » : l'eleve recopie la lettre de
      // l'enonce (releve en relecture, etape 6). Seule une lettre isolee est
      // retiree, l'egalite d'un calcul n'est pas lue.
      const saisie = raw.replace(/^\s*[a-zA-Z]\s*=\s*/, '')
      const given = toNumber(saisie) ?? nombreAvecUnite(saisie, exercise.answer.unit)
      const target = toNumber(String(expectedValue))
      if (given === null || target === null) return matchesAccepted(exercise, raw)
      // La tolerance du contenu est une borne incluse : le bruit des flottants
      // s'y ajoute, sans quoi 8,655 sort de 8,66 ± 0,005 et 8,665 y entre.
      const tolerance = (exercise.answer.tolerance ?? 0) + floatNoise(target)
      return Math.abs(given - target) <= tolerance || matchesAccepted(exercise, raw)
    }

    case 'texte':
    default: {
      if (
        normalizeLoose(raw) === normalizeLoose(String(expectedValue)) ||
        matchesAccepted(exercise, raw)
      ) {
        return true
      }
      const fraction = fractionSignee(raw)
      if (fraction === null) return false
      return [expectedValue, ...(exercise.answer.accepted ?? [])].some(
        (attendue) => fractionSignee(String(attendue)) === fraction,
      )
    }
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

/**
 * Espace fine insecable (U+202F) entre les tranches de trois chiffres de la
 * partie entiere, comme dans les enonces : « 1 000 000 » plutot que
 * « 1000000 » (releve en redaction, etape 6). Ecrite par son code.
 */
function milliers(nombre: string): string {
  const [entiere, decimale] = nombre.split('.')
  const signe = entiere.startsWith('-') ? '-' : ''
  const chiffres = entiere.replace('-', '')
  if (chiffres.length < 4) return nombre
  const groupe = chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, String.fromCharCode(0x202f))
  return signe + groupe + (decimale !== undefined ? `.${decimale}` : '')
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
      ? milliers(nombre).replace('.', ',').replace(/^-/, String.fromCharCode(0x2212))
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
