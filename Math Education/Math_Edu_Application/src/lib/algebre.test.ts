import { describe, expect, it } from 'vitest'

import { checkAnswer, type ExerciceACorriger, type FormeAttendue } from '../../supabase/functions/_shared/correction'

// Lecture des expressions (etape 7, section 5 du compte rendu du cartographe,
// _travail/etape7_dag_F.md). Chaque situation reprend ses exemples de saisies
// justes et fausses : ces tests sont le contrat de la correction algebrique.

function exo(value: string, forme: FormeAttendue, extra: Partial<ExerciceACorriger['answer']> = {}): ExerciceACorriger {
  return { type: 'texte', answer: { value, forme, ...extra }, solution_steps: ['.'] }
}

function verdicts(exercice: ExerciceACorriger, saisies: string[]): Record<string, boolean> {
  return Object.fromEntries(saisies.map((s) => [s, checkAnswer(exercice, s).isCorrect]))
}

function tousJustes(exercice: ExerciceACorriger, saisies: string[]) {
  const faux = Object.entries(verdicts(exercice, saisies)).filter(([, ok]) => !ok)
  expect(faux.map(([s]) => s)).toEqual([])
}

function tousFaux(exercice: ExerciceACorriger, saisies: string[]) {
  const acceptes = Object.entries(verdicts(exercice, saisies)).filter(([, ok]) => ok)
  expect(acceptes.map(([s]) => s)).toEqual([])
}

describe('forme reduite', () => {
  const e = exo('3x + 5', 'reduite')
  it('accepte toutes les ecritures de 3x + 5', () => {
    tousJustes(e, ['3x+5', '5 + 3x', '3*x+5', '3 × x + 5', '3·x+5', 'x*3+5', '3X + 5', '+5+3x'])
  })
  it('refuse une autre expression, une forme non reduite, une ecriture ambigue', () => {
    tousFaux(e, ['8x', '3x+6', '3(x + 1) + 2', '2x + x + 5', '3 × 1x + 5 + 0', '3x5', ''])
  })

  const carre = exo('6x² − 2x', 'reduite')
  it('lit x², x^2, x**2 et le moins typographique', () => {
    tousJustes(carre, ['6x^2-2x', '-2x+6x²', '6x**2 - 2x', '6*x^2-2*x', '6x²−2x'])
  })
  it('refuse 6x × x − 2x (non reduite) et 6x2 − 2x (ambigu)', () => {
    tousFaux(carre, ['6x×x-2x', '6x2-2x', '6x^2+2x'])
  })

  it('des parentheses inutiles ne font pas refuser (releve du lot L3)', () => {
    tousJustes(exo('x + 9', 'reduite'), ['(x+9)', '(9 + x)'])
    tousJustes(exo('−24x²', 'reduite'), ['(-24)x²', '-24x^(2)', '(−24x²)'])
    tousFaux(exo('−x + 3', 'reduite'), ['-(x-3)', '0 - (x - 3)'])
    tousFaux(exo('2x − 3', 'reduite'), ['x - (3 - x)', 'x + (x - 3)'])
  })

  it('decimaux et autre lettre', () => {
    tousJustes(exo('2,5x + 1', 'reduite'), ['1+2,5x', '2,50x+1', '2.5x+1'])
    const n = exo('2n + 1', 'reduite', { variables: ['n'] })
    tousJustes(n, ['2×n+1', '1+2n', 'n×2+1'])
    tousFaux(n, ['2x+1', '2n'])
  })

  it('un coefficient en diviseur : x/2 + 1', () => {
    tousJustes(exo('x/2 + 1', 'reduite'), ['1 + x/2', '0,5x + 1', '1/2x+1'])
  })
})

describe('forme developpee', () => {
  const e = exo('x² + 8x + 15', 'developpee')
  it('accepte l ordre libre', () => {
    tousJustes(e, ['x^2+8x+15', '15 + 8x + x²'])
  })
  it('refuse la forme factorisee, une somme non reduite, une erreur', () => {
    tousFaux(e, ['(x+3)(x+5)', 'x² + 5x + 3x + 15', 'x² + 15'])
  })
})

describe('forme factorisee', () => {
  const e = exo('(x − 3)(x + 3)', 'factorisee')
  it('accepte l ordre des facteurs et les signes de produit', () => {
    tousJustes(e, ['(x+3)(x-3)', '(x-3)*(x+3)', '(x - 3) × (x + 3)', '(3+x)(x-3)'])
  })
  it('refuse la forme developpee et un autre produit', () => {
    tousFaux(e, ['x² − 9', '(x − 3)²', '(x+9)(x-1)'])
  })
  const k = exo('5(x + 3)', 'factorisee')
  it('5(x + 3)', () => {
    tousJustes(k, ['5×(x+3)', '(x+3)×5', '5(3+x)', '(x + 3) * 5'])
    tousFaux(k, ['5x + 15', '5x+3'])
  })
  it('un carre : (x + 5)²', () => {
    tousJustes(exo('(x + 5)²', 'factorisee'), ['(5+x)^2', '(x+5)(x+5)'])
  })
})

describe('expression libre (formule)', () => {
  const e = exo('2 × (a + 4)', 'expression', { variables: ['a'] })
  it('toute ecriture equivalente', () => {
    tousJustes(e, ['2(a+4)', '2a + 8', '(a+4)×2'])
    tousFaux(e, ['2 × a + 4', 'a + 4', '2(x+4)'])
  })
})

describe('meme calcul (programme de calcul en une expression)', () => {
  const e = exo('(7 + 5) × 3 − 4', 'meme_calcul', { variables: [] })
  it('memes nombres, meme valeur, x lu comme fois', () => {
    tousJustes(e, ['3 × (5 + 7) − 4', '(7+5)*3-4', '(7 + 5) x 3 - 4', '(5+7)×3-4'])
  })
  it('refuse le resultat, un resultat intermediaire, un autre calcul', () => {
    tousFaux(e, ['32', '7 + 5 × 3 − 4', '12 × 3 − 4'])
  })
})

describe('equation', () => {
  const e = exo('41 + x = 3(9 + x)', 'equation')
  it('membres echanges ou developpes', () => {
    tousJustes(e, ['3(9+x) = 41 + x', '41 + x = 27 + 3x', 'x+41=3*(x+9)'])
  })
  it('refuse la solution seule et une autre equation', () => {
    tousFaux(e, ['x = 7', '41 = 3 × 9 + x', '41 + x = 3 × 9 + x', '41 + x'])
  })
  it('refuse la solution ecrite comme une equation (x = 7 pour x + 5 = 12)', () => {
    tousFaux(exo('x + 5 = 12', 'equation'), ['x = 7', '7 = x'])
    tousJustes(exo('x + 5 = 12', 'equation'), ['5 + x = 12', '12 = x + 5'])
  })
  const m = exo('3x + 15 = 42', 'equation')
  it('3x + 15 = 42', () => {
    tousJustes(m, ['15+3x=42', '42=3x+15', '3*x+15=42'])
  })
})

describe('inegalite', () => {
  const e = exo('x ⩾ −4', 'inegalite')
  it('toutes les ecritures du sens et de la borne', () => {
    tousJustes(e, ['x >= -4', 'x ≥ −4', '-4 <= x', 'x ⩾ -4', 'x ≥ -4,0'])
  })
  it('refuse l autre sens, l inegalite stricte, une autre borne', () => {
    tousFaux(e, ['x ⩽ −4', 'x > −4', 'x >= 4', '-4 >= x'])
  })
  it('x ≤ −3', () => {
    tousJustes(exo('x ≤ −3', 'inegalite'), ['x <= -3', '-3 ≥ x'])
  })
})

describe('liste de solutions', () => {
  const e = exo('−4 ; 2', 'solutions')
  it('ordre libre, separateurs, x = facultatif', () => {
    tousJustes(e, ['2 ; -4', 'x = -4 ou x = 2', '-4 et 2', '2; -4', 'x=2;x=-4'])
  })
  it('refuse une seule solution ou des solutions fausses', () => {
    tousFaux(e, ['2', '4 ; -2', '-4 ; 2 ; 3'])
  })
  it('fractions et decimaux : 3 ; −5/2', () => {
    tousJustes(exo('3 ; −5/2', 'solutions'), ['-5/2 ; 3', '3 et -5/2', 'x = 3 ou x = -5/2', '3 ; -2,5'])
  })
  it('± et racines : x² = 49 et x² = 5', () => {
    tousJustes(exo('7 ; −7', 'solutions'), ['-7 ; 7', '7 et -7', '±7'])
    tousJustes(exo('√5 ; −√5', 'solutions'), ['±√5', 'racine de 5 ; -racine de 5', 'racine carrée de 5 et -√5'])
    tousFaux(exo('√5 ; −√5', 'solutions'), ['√5', '±5', '2,24 ; -2,24'])
  })
  it('valeurs approchees avec tolerance', () => {
    tousJustes(exo('2,24 ; −2,24', 'solutions', { tolerance: 0.005 }), ['±2,24', '-2,236 ; 2,236', '±√5'])
  })
  it('aucune solution', () => {
    const vide = exo('aucune solution', 'solutions')
    tousJustes(vide, ['pas de solution', 'aucune', 'Aucune solution', '∅', 'S = ∅'])
    tousFaux(vide, ['0', '-1'])
  })
})

describe('mode numerique inchange', () => {
  it('3x4 reste refuse pour 12, sans forme', () => {
    const numerique: ExerciceACorriger = { type: 'numerique', answer: { value: 12 }, solution_steps: ['.'] }
    expect(checkAnswer(numerique, '3x4').isCorrect).toBe(false)
  })
  it('un texte sans forme reste compare comme un texte', () => {
    const texte: ExerciceACorriger = { type: 'texte', answer: { value: '3x + 5' }, solution_steps: ['.'] }
    expect(checkAnswer(texte, '5 + 3x').isCorrect).toBe(false)
    expect(checkAnswer(texte, '3x+5').isCorrect).toBe(true)
  })
})

describe('factorisation complete (etape 7, releve des redacteurs)', () => {
  it('refuse un facteur qui se factorise encore', () => {
    tousJustes(exo('3x(2x − 3)', 'factorisee'), ['3x(2x-3)', 'x×3×(2x-3)', '(2x-3)*3x'])
    tousFaux(exo('3x(2x − 3)', 'factorisee'), ['3(2x² − 3x)', 'x(6x-9)', '6x²-9x'])
    tousJustes(exo('2(x + 3)', 'factorisee'), ['2(x+3)', '(3+x)×2'])
    tousFaux(exo('2(x + 3)', 'factorisee'), ['1(2x+6)', '(2x+6)'])
  })
  it('refuse un facteur 1 et des facteurs non reduits (releve du lot L5)', () => {
    tousFaux(exo('(4x − 3)(4x + 3)', 'factorisee'), ['1(16x² − 9)', '1*(16x^2-9)'])
    tousFaux(exo('(x − 2)(3x + 4)', 'factorisee'), ['(x − 2)(5x + 1 − 2x + 3)'])
    tousFaux(exo('(x − 2)(x + 8)', 'factorisee'), ['(x + 3 − 5)(x + 3 + 5)'])
    tousJustes(exo('(x − 2)(x + 8)', 'factorisee'), ['(x+8)(x-2)', '1(x-2)(x+8)'])
  })
  it('garde les identites remarquables et les carres', () => {
    tousJustes(exo('(2x − 3)(2x + 3)', 'factorisee'), ['(2x+3)(2x-3)'])
    tousJustes(exo('(x + 5)²', 'factorisee'), ['(5+x)^2'])
    tousFaux(exo('4(x + 1)²', 'factorisee'), ['(2x+2)^2'])
  })
})

describe('unite tapee apres une expression', () => {
  it('l unite attendue est retiree, une autre unite refusee', () => {
    const e = exo('2x + 4', 'expression', { unit: '€' })
    tousJustes(e, ['2x + 4 €', '2x+4', '4 + 2x euros'])
    tousFaux(e, ['2x + 4 cm', '2x €'])
  })
})
