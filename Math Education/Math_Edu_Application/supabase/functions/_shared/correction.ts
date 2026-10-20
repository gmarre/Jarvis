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

/** Reponse texte lue comme de l'algebre (etape 7). Voir « Algebre » plus bas. */
export type FormeAttendue =
  | 'expression'
  | 'reduite'
  | 'developpee'
  | 'factorisee'
  | 'meme_calcul'
  | 'equation'
  | 'inegalite'
  | 'solutions'

export interface ReponseAttendue {
  value: string | number | boolean
  accepted?: (string | number)[]
  tolerance?: number
  unit?: string | null
  forme?: FormeAttendue
  /** Lettres de l'expression, par defaut ["x"]. */
  variables?: string[]
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

// Caracteres speciaux ecrits par leur code : l'outil de deploiement des Edge
// Functions transforme les sequences d'echappement en caracteres invisibles a
// la relecture.
const car = (...codes: number[]) => String.fromCharCode(...codes)
const FOIS = car(0xd7)
const AUTRES_FOIS = new RegExp(`[*${car(0xb7, 0x2219, 0x22c5)}]`, 'g')
const CARRE = new RegExp(car(0xb2), 'g')
const CUBE = new RegExp(car(0xb3), 'g')
const ESPACES_SPECIALES = new RegExp(`[${car(0xa0, 0x202f, 0x2009)}]`, 'g')
const MOINS_VARIANTS = new RegExp(`[${car(0x2212, 0x2013, 0x2014, 0x2010, 0x2011, 0xfe63, 0xff0d)}]`, 'g')
const DIVISE = new RegExp(car(0xf7), 'g')
const EURO = car(0x20ac)

/**
 * Signes de multiplication : « 3,2 × 10^4 », « 3,2 x 10^4 », « 3,2*10^4 »,
 * « 3,2·10^4 » s'ecrivent tous avec ×. La lettre x n'est lue comme un signe
 * qu'entre deux nombres, pour ne pas toucher a une inconnue (etape 7).
 * Rien n'est calcule : « 2^5 » n'est pas 32, sinon un eleve repondrait
 * « Calcule 2⁵ » en recopiant l'enonce.
 */
function multiplicationsEnClair(value: string): string {
  return value
    .replace(AUTRES_FOIS, FOIS)
    .replace(/(?<=\d)\s*x\s*(?=\d)/g, FOIS)
    // « 1,496 fois 10^8 » : le mot, tape sur un telephone (relecture, etape 6).
    .replace(/(?<=\d)\s*fois\s*(?=\d)/g, FOIS)
}

/** Minuscules, sans accents, espaces unifiees, virgule decimale unifiee. */
function normalize(value: string): string {
  return multiplicationsEnClair(exposantsEnClair(value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')))
    // cm² et cm2 s'equivalent : l'exposant se tape rarement au clavier.
    .replace(CARRE, '2')
    .replace(CUBE, '3')
    // Espaces insecables, frequents dans les grands nombres ecrits "1 024".
    .replace(ESPACES_SPECIALES, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,(?=\d)/g, '.')
    // Signe moins : le clavier d'un telephone ou un copier-coller donne souvent
    // le moins typographique (U+2212), un tiret demi-cadratin (U+2013) ou un
    // trait d'union insecable. Tous valent « - » (etape 5, nombres relatifs).
    .replace(MOINS_VARIANTS, '-')
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
    .replace(DIVISE, '/')
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
  // Temperatures (etape 5) : « -3 °C », « -3 degres », « -3 degres Celsius »,
  // et « 7,7° » sans le C (releve en relecture, super exercices B2).
  '°c': ['degre', 'degrecelsius', 'degrescelsius', 'c', '°'],
  [EURO]: ['euro', 'eur'],
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
  // Idem pour « -(-3/7) » et « -(3/-7) » : deux signes moins ne s'annulent
  // jamais ici.
  const signes = [entoure, morceaux[1], morceaux[3]].filter(Boolean).length
  if (signes > 1) return null
  if (morceaux[1] || morceaux[3]) signe = -signe
  return `${signe < 0 ? '-' : ''}${morceaux[2]}/${morceaux[4]}`
}

// =============================================================================
// Algebre (etape 7) : expressions, equations, inegalites, listes de solutions
// =============================================================================
//
// Une reponse de type texte avec `answer.forme` est lue comme de l'algebre,
// pas comme un texte : « 5 + 3x », « 3*x+5 » et « 3 × x + 5 » valent « 3x + 5 ».
// Deux ecritures sont equivalentes si elles prennent la meme valeur en huit
// valeurs de chaque lettre (exact pour les polynomes du college, de degre au
// plus 5). La forme demandee (reduite, factorisee...) se controle ensuite sur
// l'arbre de l'expression. Rien n'est jamais devine : « 3x2 » (x² ? x × 2 ?)
// est refuse.

type Noeud =
  | { t: 'num'; v: number }
  | { t: 'var'; nom: string }
  | { t: 'neg'; e: Noeud }
  | { t: 'racine'; e: Noeud }
  | { t: '+' | '-' | '*' | '/' | '^'; g: Noeud; d: Noeud }

const RACINE = car(0x221a)
const PLUS_OU_MOINS = car(0xb1)
const ENSEMBLE_VIDE = car(0x2205)
const INFERIEUR_OU_EGAL = [car(0x2264), car(0x2a7d)]
const SUPERIEUR_OU_EGAL = [car(0x2265), car(0x2a7e)]
const EXPOSANT_PARTOUT = new RegExp(`${MOINS_EXPOSANT}?[${CHIFFRES_EXPOSANTS.join('')}]+`, 'g')

/** Ecriture ramenee a l'ASCII, sans espace : * pour fois, ^ pour l'exposant, √ pour la racine. */
function texteAlgebrique(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .replace(MOINS_VARIANTS, '-')
    // En algebre, un exposant suit aussi une lettre : x² est un carre.
    .replace(EXPOSANT_PARTOUT, (bloc) =>
      '^' +
      [...bloc].map((c) => (c === MOINS_EXPOSANT ? '-' : String(CHIFFRES_EXPOSANTS.indexOf(c)))).join(''),
    )
    .replace(/\*\*/g, '^')
    .replace(AUTRES_FOIS, '*')
    .replace(new RegExp(FOIS, 'g'), '*')
    .replace(DIVISE, '/')
    .replace(/racine\s*(carree\s*)?(de\s*)?/g, RACINE)
    // Crochets ecrits comme au college : « (x − 2)[3x + 4] » (releve en
    // relecture de l'etape 7, lot L5).
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    // « x => 7 », « x =< 2 » : l'ordre inverse, frequent au clavier.
    .replace(/=>/g, '>=')
    .replace(/=</g, '<=')
    .replace(ESPACES_SPECIALES, ' ')
    .replace(/\s+/g, '')
    .replace(/(?<=\d),(?=\d)/g, '.')
}

/**
 * Arbre d'une expression, ou null si l'ecriture n'est pas lisible. Une lettre
 * absente de `variables` refuse l'ecriture, sauf x qui se lit alors comme le
 * signe fois (calcul numerique : « (7 + 5) x 3 »).
 */
function lireExpression(texte: string, variables: string[]): Noeud | null {
  const s = variables.includes('x') ? texte : texte.replace(/x/g, '*')
  let i = 0
  const voir = (): string | undefined => s[i]
  const debutFacteur = (c: string | undefined) =>
    c !== undefined && (/[\d(]/.test(c) || c === RACINE || variables.includes(c))

  function primaire(): Noeud | null {
    const c = voir()
    if (c === undefined) return null
    if (/\d/.test(c)) {
      const m = /^\d+(?:\.\d+)?/.exec(s.slice(i)) as RegExpExecArray
      i += m[0].length
      return { t: 'num', v: Number(m[0]) }
    }
    if (c === '(') {
      i += 1
      const e = somme()
      if (e === null || voir() !== ')') return null
      i += 1
      return e
    }
    if (c === RACINE) {
      i += 1
      const e = puissance()
      return e ? { t: 'racine', e } : null
    }
    if (variables.includes(c)) {
      i += 1
      return { t: 'var', nom: c }
    }
    return null
  }

  function puissance(): Noeud | null {
    const base = primaire()
    if (!base || voir() !== '^') return base
    i += 1
    let negatif = false
    if (voir() === '-') {
      negatif = true
      i += 1
    }
    const exposant = primaire()
    if (!exposant) return null
    return { t: '^', g: base, d: negatif ? { t: 'neg', e: exposant } : exposant }
  }

  function unaire(): Noeud | null {
    if (voir() === '-') {
      i += 1
      const e = unaire()
      return e ? { t: 'neg', e } : null
    }
    if (voir() === '+') {
      i += 1
      return unaire()
    }
    return puissance()
  }

  function produit(): Noeud | null {
    let g = unaire()
    while (g) {
      const c = voir()
      if (c === '*' || c === '/') {
        i += 1
        const d = unaire()
        if (!d) return null
        g = { t: c, g, d }
      } else if (debutFacteur(c)) {
        // « x2 », « (x+1)2 » : un chiffre colle apres une lettre ou une
        // parenthese est ambigu. Refuse, jamais devine.
        if (/\d/.test(c as string)) return null
        const d = puissance()
        if (!d) return null
        g = { t: '*', g, d }
      } else {
        return g
      }
    }
    return null
  }

  function somme(): Noeud | null {
    let g = produit()
    while (g && (voir() === '+' || voir() === '-')) {
      const op = voir() as '+' | '-'
      i += 1
      const d = produit()
      if (!d) return null
      g = { t: op, g, d }
    }
    return g
  }

  const arbre = somme()
  return arbre && i === s.length ? arbre : null
}

function evaluer(n: Noeud, valeurs: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var':
      return valeurs[n.nom]
    case 'neg':
      return -evaluer(n.e, valeurs)
    case 'racine':
      return Math.sqrt(evaluer(n.e, valeurs))
    case '+':
      return evaluer(n.g, valeurs) + evaluer(n.d, valeurs)
    case '-':
      return evaluer(n.g, valeurs) - evaluer(n.d, valeurs)
    case '*':
      return evaluer(n.g, valeurs) * evaluer(n.d, valeurs)
    case '/':
      return evaluer(n.g, valeurs) / evaluer(n.d, valeurs)
    case '^':
      return Math.pow(evaluer(n.g, valeurs), evaluer(n.d, valeurs))
  }
}

function egaux(a: number, b: number, tolerance = 0): boolean {
  return Math.abs(a - b) <= tolerance + 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
}

/** Valeurs d'essai : ni 0 ni 1 seuls, pour ne pas confondre x et x², ni 2x et x + 2. */
const POINTS = [-3, -1.5, -0.5, 0.25, 1, 2, 3.5, 7]

/** Meme valeur partout (au signe pres si `signe` vaut -1). */
function equivalentes(a: Noeud, b: Noeud, variables: string[], signe = 1): boolean {
  let essais = 0
  for (let k = 0; k < POINTS.length; k++) {
    const valeurs: Record<string, number> = {}
    variables.forEach((v, j) => {
      valeurs[v] = POINTS[(k + 3 * j) % POINTS.length] + 0.37 * j
    })
    const va = evaluer(a, valeurs)
    const vb = signe * evaluer(b, valeurs)
    if (!Number.isFinite(va) && !Number.isFinite(vb)) continue
    if (!egaux(va, vb)) return false
    essais += 1
  }
  return essais >= 4
}

function lettresDe(n: Noeud): Set<string> {
  switch (n.t) {
    case 'num':
      return new Set()
    case 'var':
      return new Set([n.nom])
    case 'neg':
    case 'racine':
      return lettresDe(n.e)
    default:
      return new Set([...lettresDe(n.g), ...lettresDe(n.d)])
  }
}

function nombresDe(n: Noeud): number[] {
  switch (n.t) {
    case 'num':
      return [n.v]
    case 'var':
      return []
    case 'neg':
    case 'racine':
      return nombresDe(n.e)
    default:
      return [...nombresDe(n.g), ...nombresDe(n.d)]
  }
}

/** Termes d'une somme, avec leur signe : 2x − (−3) donne [+2x, −(−3)]. */
function termes(n: Noeud, signe = 1, sortie: { signe: number; n: Noeud }[] = []) {
  if (n.t === '+') {
    termes(n.g, signe, sortie)
    termes(n.d, signe, sortie)
  } else if (n.t === '-') {
    termes(n.g, signe, sortie)
    termes(n.d, -signe, sortie)
  } else if (n.t === 'neg') {
    termes(n.e, -signe, sortie)
  } else {
    sortie.push({ signe, n })
  }
  return sortie
}

/** Facteurs d'un produit ; le signe ne compte pas dans sa structure (−2x a pour facteurs 2 et x). */
function facteurs(n: Noeud): Noeud[] {
  if (n.t === 'neg') return facteurs(n.e)
  return n.t === '*' ? [...facteurs(n.g), ...facteurs(n.d)] : [n]
}

const estNombre = (n: Noeud) => n.t === 'num' || (n.t === '/' && n.g.t === 'num' && n.d.t === 'num')

/**
 * Signature d'un monome reduit (« x^2 », « x^1*y^1 », « 1 » pour une
 * constante), ou null : deux coefficients (3 × 2x), une lettre repetee (x × x),
 * une parenthese.
 */
function monome(n: Noeud): string | null {
  let coefficients = 0
  const puissances = new Map<string, number>()
  const ajouter = (lettre: string, exposant: number) => {
    if (puissances.has(lettre)) return false
    puissances.set(lettre, exposant)
    return true
  }
  for (const f of facteurs(n)) {
    if (estNombre(f)) {
      coefficients += 1
    } else if (f.t === 'var') {
      if (!ajouter(f.nom, 1)) return null
    } else if (f.t === '^' && f.g.t === 'var' && f.d.t === 'num' && Number.isInteger(f.d.v)) {
      if (!ajouter(f.g.nom, f.d.v)) return null
    } else if (f.t === '/' && f.d.t === 'num' && monome(f.g) !== null && monome(f.g) !== '1') {
      // « x/2 », « 3x/4 » : un coefficient ecrit en diviseur.
      coefficients += 1
      for (const [lettre, exposant] of monome(f.g)!.split('*').map((p) => p.split('^'))) {
        if (!ajouter(lettre, Number(exposant))) return null
      }
    } else {
      return null
    }
  }
  if (coefficients > 1) return null
  return (
    [...puissances.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([lettre, exposant]) => `${lettre}^${exposant}`)
      .join('*') || '1'
  )
}

/**
 * Une somme ecrite a plat : aucune somme entre parentheses derriere un signe
 * (« x − (3 − x) », « −(x − 3) », « x + (2 + x) »). Le controle porte sur
 * l'expression lue et non sur le texte : « (x + 9) » ou « (−24)x² » sont des
 * ecritures reduites (releve en relecture de l'etape 7, lot L3).
 */
function aPlat(n: Noeud): boolean {
  const somme = (e: Noeud) => e.t === '+' || e.t === '-'
  if (n.t === 'neg') return !somme(n.e) && aPlat(n.e)
  if (n.t === '+' || n.t === '-') return !somme(n.d) && aPlat(n.g) && aPlat(n.d)
  return true
}

/** Forme reduite (ou developpee) : une somme a plat de monomes distincts. */
function formeReduite(n: Noeud): boolean {
  if (!aPlat(n)) return false
  const vus = new Set<string>()
  for (const { n: terme } of termes(n)) {
    const signature = monome(terme)
    if (signature === null || vus.has(signature)) return false
    vus.add(signature)
  }
  return true
}

/**
 * Coefficients entiers d'un polynome d'une lettre (degre 6 au plus), du terme
 * constant au plus haut degre, ou null s'ils ne sont pas tous entiers. Calcules
 * par interpolation en 0, 1, ..., 6 (systeme de Vandermonde).
 */
function coefficientsEntiers(n: Noeud, lettre: string): number[] | null {
  const taille = 7
  const lignes = Array.from({ length: taille }, (_, k) => {
    const ligne = Array.from({ length: taille }, (_, j) => k ** j)
    ligne.push(evaluer(n, { [lettre]: k }))
    return ligne
  })
  for (let c = 0; c < taille; c++) {
    let pivot = c
    for (let l = c + 1; l < taille; l++) if (Math.abs(lignes[l][c]) > Math.abs(lignes[pivot][c])) pivot = l
    ;[lignes[c], lignes[pivot]] = [lignes[pivot], lignes[c]]
    for (let l = 0; l < taille; l++) {
      if (l === c) continue
      const r = lignes[l][c] / lignes[c][c]
      for (let j = c; j <= taille; j++) lignes[l][j] -= r * lignes[c][j]
    }
  }
  const coefficients = lignes.map((ligne, c) => ligne[taille] / ligne[c])
  if (coefficients.some((x) => !Number.isFinite(x) || Math.abs(x - Math.round(x)) > 1e-6)) return null
  return coefficients.map((x) => Math.round(x))
}

function pgcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : pgcd(b, a % b)
}

/**
 * Un facteur a plusieurs termes qui se factorise encore : ses coefficients ont
 * un diviseur commun (2x + 6), ou la lettre est commune a tous ses termes
 * (2x² − 3x). « Factoriser » au college veut la factorisation complete :
 * « 3(2x² − 3x) » et « 1(2x + 6) » ne sont pas acceptes (releve par les
 * redacteurs de l'etape 7).
 */
function encoreFactorisable(f: Noeud): boolean {
  const lettres = [...lettresDe(f)]
  if (lettres.length !== 1) return false
  const c = coefficientsEntiers(f, lettres[0])
  if (!c) return false
  const nonNuls = c.filter((x) => x !== 0)
  if (nonNuls.length < 2) return false
  return nonNuls.reduce(pgcd) > 1 || c[0] === 0
}

/** Une somme de monomes distincts (ou un seul terme) : « x + 3 − 5 » ne l'est pas. */
function termesReduits(n: Noeud): boolean {
  const vus = new Set<string>()
  for (const { n: terme } of termes(n)) {
    const signature = monome(terme)
    if (signature === null || vus.has(signature)) return false
    vus.add(signature)
  }
  return true
}

/**
 * Forme factorisee : un produit (ou une puissance) dont un facteur contient
 * une lettre, factorise completement, chaque facteur reduit. Un facteur 1 ne
 * compte pas : « 1(16x² − 9) » n'est pas une factorisation (releve par les
 * redacteurs de l'etape 7), pas plus que « (x + 3 − 5)(x + 3 + 5) ».
 */
function formeFactorisee(n: Noeud): boolean {
  let e = n
  while (e.t === 'neg') e = e.e
  const reduit = (f: Noeud) => termesReduits(f)
  if (e.t === '^') return lettresDe(e.g).size > 0 && reduit(e.g) && !encoreFactorisable(e.g)
  if (e.t !== '*') return false
  const fs = facteurs(e).filter((f) => !(f.t === 'num' && f.v === 1))
  if (fs.length < 2 && !(fs.length === 1 && fs[0].t === '^')) return false
  return fs.some((f) => lettresDe(f).size > 0) && fs.every(reduit) && !fs.some(encoreFactorisable)
}

const OPERATEURS_INEGALITE: [string[], string][] = [
  [['>=', ...SUPERIEUR_OU_EGAL], '>='],
  [['<=', ...INFERIEUR_OU_EGAL], '<='],
  [['>'], '>'],
  [['<'], '<'],
]
const SENS_INVERSE: Record<string, string> = { '>=': '<=', '<=': '>=', '>': '<', '<': '>' }

/** « x ≥ 4 », « 4 <= x » : la lettre, le sens ramene a « lettre a gauche », la borne. */
function lireInegalite(texte: string, variables: string[]): { lettre: string; op: string; borne: number } | null {
  for (const [ecritures, op] of OPERATEURS_INEGALITE) {
    for (const ecriture of ecritures) {
      const morceaux = texte.split(ecriture)
      if (morceaux.length !== 2) continue
      const [g, d] = morceaux.map((m) => lireExpression(m, variables))
      if (!g || !d) return null
      if (g.t === 'var' && lettresDe(d).size === 0) return { lettre: g.nom, op, borne: evaluer(d, {}) }
      if (d.t === 'var' && lettresDe(g).size === 0) return { lettre: d.nom, op: SENS_INVERSE[op], borne: evaluer(g, {}) }
      return null
    }
  }
  return null
}

/** « 3 ; -5/2 », « x = 3 ou x = -2,5 », « ±7 », « aucune solution » : les valeurs, triees. */
function lireSolutions(texte: string): number[] | null {
  if (/^(aucunesolution|pasdesolution|aucune|s=)?$/.test(texte.replace(ENSEMBLE_VIDE, '').replace(/[{}]/g, ''))) {
    return texte.length > 0 ? [] : null
  }
  // « S = {−5 ; 3/2} » : l'ensemble des solutions ecrit comme en 3e (releve
  // en relecture de l'etape 7, lot L6).
  texte = texte.replace(/^s=/, '').replace(/^\{(.*)\}$/, '$1')
  const valeurs: number[] = []
  for (let morceau of texte.split(/;|et|ou|,/)) {
    morceau = morceau.replace(/^[a-z]=/, '')
    if (morceau === '') return null
    let double = false
    if (morceau.startsWith(PLUS_OU_MOINS)) {
      double = true
      morceau = morceau.slice(1)
    }
    const n = lireExpression(morceau, [])
    if (!n) return null
    const v = evaluer(n, {})
    if (!Number.isFinite(v)) return null
    valeurs.push(v)
    if (double) valeurs.push(-v)
  }
  return valeurs.sort((a, b) => a - b)
}

/**
 * « P = 6x » pour une formule de perimetre : le nom de la grandeur, ecrit
 * comme en 6e (P = 2 × (L + l)), est retire avant la lecture d'une
 * expression (releve en relecture de l'etape 7, lot L1). Pas pour une
 * equation ni une inegalite, et jamais quand le nom est une lettre de
 * l'expression : « x = 6x » reste refuse.
 */
function sansNom(raw: string, forme: FormeAttendue, variables: string[]): string {
  if (forme === 'equation' || forme === 'inegalite' || forme === 'solutions') return raw
  const m = raw.match(/^\s*(\p{L}+)\s*=\s*([^=]+)$/u)
  if (!m || variables.includes(m[1].toLowerCase())) return raw
  return m[2]
}

/** Une equation deja resolue : une lettre seule d'un cote, un nombre de l'autre. */
function resolue(g: Noeud, d: Noeud): boolean {
  const seule = (n: Noeud) => n.t === 'var'
  const nombre = (n: Noeud) => lettresDe(n).size === 0
  return (seule(g) && nombre(d)) || (seule(d) && nombre(g))
}

/**
 * « 2x + 4 € » pour une expression en euros : l'unite attendue, tapee a la fin,
 * est retiree avant la lecture (releve par les redacteurs de l'etape 7). Une
 * autre unite reste, et l'expression devient illisible : refusee.
 */
function sansUnite(raw: string, unit: string | null | undefined): string {
  if (!unit) return raw
  const texte = texteAlgebrique(raw)
  const formes = [...formesUnite(unit)].sort((a, b) => b.length - a.length)
  for (const forme of formes) {
    if (forme && texte.endsWith(forme) && texte.length > forme.length) return texte.slice(0, -forme.length)
  }
  return raw
}

/** La saisie `raw` repond-elle a l'attendu `attendu`, sous la forme demandee ? */
function algebreJuste(forme: FormeAttendue, attendu: string, raw: string, variables: string[], tolerance: number): boolean {
  const donne = texteAlgebrique(raw)
  const voulu = texteAlgebrique(attendu)
  if (donne === '') return false

  if (forme === 'solutions') {
    const a = lireSolutions(donne)
    const b = lireSolutions(voulu)
    return a !== null && b !== null && a.length === b.length && a.every((v, k) => egaux(v, b[k], tolerance))
  }

  if (forme === 'inegalite') {
    const a = lireInegalite(donne, variables)
    const b = lireInegalite(voulu, variables)
    return a !== null && b !== null && a.lettre === b.lettre && a.op === b.op && egaux(a.borne, b.borne, tolerance)
  }

  if (forme === 'equation') {
    const [ag, ad, ...resteA] = donne.split('=')
    const [bg, bd, ...resteB] = voulu.split('=')
    if (resteA.length || resteB.length || ad === undefined || bd === undefined) return false
    const membres = [ag, ad, bg, bd].map((m) => lireExpression(m, variables))
    if (membres.some((m) => m === null)) return false
    const [g1, d1, g2, d2] = membres as Noeud[]
    // « x = 7 » a la meme difference que « x + 5 = 12 » : c'est la solution,
    // pas l'equation demandee (releve par les redacteurs de l'etape 7). Une
    // ecriture resolue n'est acceptee que si l'attendu l'est aussi.
    if (resolue(g1, d1) && !resolue(g2, d2)) return false
    const ecart1: Noeud = { t: '-', g: g1, d: d1 }
    const ecart2: Noeud = { t: '-', g: g2, d: d2 }
    // Meme equation, ou membres echanges : 42 = 3x + 15 vaut 3x + 15 = 42.
    return equivalentes(ecart1, ecart2, variables, 1) || equivalentes(ecart1, ecart2, variables, -1)
  }

  const a = lireExpression(donne, forme === 'meme_calcul' ? [] : variables)
  const b = lireExpression(voulu, forme === 'meme_calcul' ? [] : variables)
  if (!a || !b) return false

  if (forme === 'meme_calcul') {
    // Meme calcul : memes nombres, meme valeur, et un calcul (pas le resultat).
    const na = nombresDe(a).sort((x, y) => x - y)
    const nb = nombresDe(b).sort((x, y) => x - y)
    return (
      a.t !== 'num' &&
      na.length === nb.length &&
      na.every((v, k) => v === nb[k]) &&
      egaux(evaluer(a, {}), evaluer(b, {}))
    )
  }

  if (!equivalentes(a, b, variables)) return false
  if (forme === 'reduite' || forme === 'developpee') return formeReduite(a)
  if (forme === 'factorisee') return formeFactorisee(a)
  return true
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
      const forme = exercise.answer.forme
      if (forme) {
        const variables = exercise.answer.variables ?? ['x']
        const saisie = sansUnite(sansNom(raw, forme, variables), exercise.answer.unit)
        return [expectedValue, ...(exercise.answer.accepted ?? [])].some((attendu) =>
          algebreJuste(forme, String(attendu), saisie, variables, exercise.answer.tolerance ?? 0),
        )
      }
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
