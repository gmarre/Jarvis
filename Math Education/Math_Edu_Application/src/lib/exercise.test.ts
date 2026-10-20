import { describe, expect, it } from 'vitest'

import { chargerContenuLocal } from '@/content/chargement'
import { checkAnswer, formatExpected } from './exercise'
import { versExerciceACorriger } from '../../supabase/functions/_shared/correction'
import { toPublicExercise, type Exercise } from '@/types/content'

// La banque complete, reponses comprises : celle que l'application installe
// n'en a plus depuis la phase 3.
const { exercises } = await chargerContenuLocal()

// La regle produit posee en tete de lib/exercise.ts : compter faux une reponse
// juste ecrite autrement casse la confiance de l'eleve plus surement qu'un bug.
// Ces tests verrouillent la normalisation.

function byType(type: Exercise['type']): Exercise {
  const found = exercises.find((exercise) => exercise.type === type)
  if (!found) throw new Error(`Aucun exercice de type ${type} dans le contenu`)
  return found
}

describe('checkAnswer, exercices numeriques', () => {
  const exercise = byType('numerique')
  const expected = String(exercise.answer.value)

  it('accepte la reponse exacte', () => {
    expect(checkAnswer(exercise, expected).isCorrect).toBe(true)
  })

  it('accepte les espaces autour de la reponse', () => {
    expect(checkAnswer(exercise, `  ${expected}  `).isCorrect).toBe(true)
  })

  it('refuse une reponse vide', () => {
    expect(checkAnswer(exercise, '').isCorrect).toBe(false)
    expect(checkAnswer(exercise, '   ').isCorrect).toBe(false)
  })

  it('refuse une autre valeur', () => {
    expect(checkAnswer(exercise, String(Number(expected) + 1)).isCorrect).toBe(false)
  })
})

describe('checkAnswer, normalisation des ecritures', () => {
  const fraction: Exercise = {
    ...byType('numerique'),
    type: 'numerique',
    answer: { value: 0.75 },
  }

  it('accepte une fraction pour un decimal', () => {
    expect(checkAnswer(fraction, '3/4').isCorrect).toBe(true)
  })

  it('accepte la virgule decimale francaise', () => {
    expect(checkAnswer(fraction, '0,75').isCorrect).toBe(true)
  })

  it('accepte un zero de fin', () => {
    expect(checkAnswer(fraction, '0,750').isCorrect).toBe(true)
  })

  it('refuse une valeur arrondie : la tolerance pedagogique est une decision de contenu', () => {
    expect(checkAnswer(fraction, '0,7').isCorrect).toBe(false)
  })

  it('absorbe le bruit des flottants', () => {
    const bruite: Exercise = { ...fraction, answer: { value: 0.1 + 0.2 } }
    expect(checkAnswer(bruite, '0,3').isCorrect).toBe(true)
  })

  it('honore une tolerance explicite du contenu', () => {
    const tolerant: Exercise = { ...fraction, answer: { value: 3.14159, tolerance: 0.01 } }
    expect(checkAnswer(tolerant, '3,14').isCorrect).toBe(true)
    expect(checkAnswer(tolerant, '3,1').isCorrect).toBe(false)
  })

  it('traite les deux bornes de la tolerance de la meme facon', () => {
    const arrondi: Exercise = { ...fraction, answer: { value: 8.66, tolerance: 0.005 } }
    expect(checkAnswer(arrondi, '8,655').isCorrect).toBe(true)
    expect(checkAnswer(arrondi, '8,665').isCorrect).toBe(true)
    expect(checkAnswer(arrondi, '8,67').isCorrect).toBe(false)
  })

  it('lit « fois » entre deux nombres et « cm^2 » comme unite', () => {
    const scientifique: Exercise = { ...fraction, type: 'texte', answer: { value: '1,496 × 10^8' } }
    expect(checkAnswer(scientifique, '1,496 fois 10 puissance 8').isCorrect).toBe(true)
    expect(checkAnswer(scientifique, '14,96 fois 10^7').isCorrect).toBe(false)
    const aire: Exercise = { ...fraction, answer: { value: 225, unit: 'cm²' } }
    expect(checkAnswer(aire, '225 cm^2').isCorrect).toBe(true)
    expect(checkAnswer(aire, '225 m^2').isCorrect).toBe(false)
  })

  it('accepte toutes les ecritures du signe d une fraction, sans la reduire', () => {
    const negative: Exercise = { ...fraction, type: 'texte', answer: { value: '-3/5', accepted: ['-6/10'] } }
    for (const saisie of ['3/(-5)', '(-3)/5', '-(3/5)', '3/-5', '−3/5', '6/(−10)', '(−6)/10']) {
      expect(checkAnswer(negative, saisie).isCorrect).toBe(true)
    }
    for (const saisie of ['3/5', '-3/-5', '-12/20', '-5/3']) {
      expect(checkAnswer(negative, saisie).isCorrect).toBe(false)
    }
    const positive: Exercise = { ...negative, answer: { value: '3/5' } }
    // Les deux signes a simplifier sont souvent ce que l'exercice evalue.
    expect(checkAnswer(positive, '-3/-5').isCorrect).toBe(false)
    expect(checkAnswer(positive, '(-3)/(-5)').isCorrect).toBe(false)
  })

  it('accepte « n = 13 » quand l enonce demande la valeur de n', () => {
    const exposant: Exercise = { ...fraction, answer: { value: 13 } }
    expect(checkAnswer(exposant, 'n = 13').isCorrect).toBe(true)
    expect(checkAnswer(exposant, 'n=13').isCorrect).toBe(true)
    expect(checkAnswer(exposant, 'n = 12').isCorrect).toBe(false)
    expect(checkAnswer(exposant, '10 = 13').isCorrect).toBe(false)
  })

  it('accepte les ecritures listees dans answer.accepted', () => {
    const alternatives: Exercise = {
      ...fraction,
      type: 'texte',
      answer: { value: 'trois quarts', accepted: ['3/4', '0,75'] },
    }
    expect(checkAnswer(alternatives, '3/4').isCorrect).toBe(true)
    expect(checkAnswer(alternatives, 'Trois Quarts').isCorrect).toBe(true)
  })
})

describe('checkAnswer, vrai ou faux', () => {
  const exercise = byType('vrai_faux')

  it('compare des booleens, pas des chaines', () => {
    const attendu = Boolean(exercise.answer.value)
    expect(checkAnswer(exercise, String(attendu)).isCorrect).toBe(true)
    expect(checkAnswer(exercise, String(!attendu)).isCorrect).toBe(false)
  })
})

describe('checkAnswer, QCM', () => {
  const exercise = byType('qcm')

  it('valide la bonne cle', () => {
    expect(checkAnswer(exercise, String(exercise.answer.value)).isCorrect).toBe(true)
  })

  it('remonte l erreur de raisonnement du distracteur choisi', () => {
    const distracteur = exercise.choices?.find(
      (choice) => choice.key !== String(exercise.answer.value) && choice.misconception,
    )
    if (!distracteur) return

    const correction = checkAnswer(exercise, distracteur.key)
    expect(correction.isCorrect).toBe(false)
    expect(correction.misconception).toBe(distracteur.misconception)
  })
})

describe('formatExpected', () => {
  it('rend un libelle lisible pour chaque exercice du contenu', () => {
    for (const exercise of exercises) {
      const rendu = formatExpected(exercise)
      expect(rendu.length).toBeGreaterThan(0)
      expect(rendu).not.toContain('undefined')
    }
  })

  it('affiche un nombre decimal avec une virgule, unite comprise', () => {
    const base = byType('numerique')
    const decimal: Exercise = { ...base, answer: { value: 3.5 } }
    const avecUnite: Exercise = { ...base, answer: { value: 12.75, unit: '€' } }

    expect(formatExpected(decimal)).toBe('3,5')
    expect(formatExpected(avecUnite)).toBe('12,75 €')
  })

  it('affiche un prix avec ses centimes, et un prix entier sans decimales', () => {
    const base = byType('numerique')
    expect(formatExpected({ ...base, answer: { value: 3.9, unit: '€' } })).toBe('3,90 €')
    expect(formatExpected({ ...base, answer: { value: 42, unit: '€' } })).toBe('42 €')
    expect(formatExpected({ ...base, answer: { value: 3.9, unit: 'kg' } })).toBe('3,9 kg')
  })

  it('accepte la virgule a la saisie d une reponse decimale', () => {
    const base = byType('numerique')
    const decimal: Exercise = { ...base, answer: { value: 3.5 } }

    expect(checkAnswer(decimal, '3,5').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '3.5').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '3,50').isCorrect).toBe(true)
    expect(checkAnswer(decimal, '35').isCorrect).toBe(false)
  })
})

describe('checkAnswer, ce que le serveur renvoie apres correction', () => {
  it('donne la bonne proposition d un QCM et le corrige', () => {
    const exercise = byType('qcm')
    const correction = checkAnswer(exercise, 'z')
    expect(correction.expectedKey).toBe(String(exercise.answer.value))
    expect(correction.solutionSteps).toEqual(exercise.solution_steps)
  })

  it('donne true ou false pour un vrai/faux, rien pour une saisie libre', () => {
    const vraiFaux = byType('vrai_faux')
    expect(checkAnswer(vraiFaux, 'true').expectedKey).toBe(String(Boolean(vraiFaux.answer.value)))
    expect(checkAnswer(byType('numerique'), '1').expectedKey).toBeNull()
  })
})

describe('separation de la reponse', () => {
  it('la version publique ne porte ni reponse, ni corrige, ni misconception', () => {
    for (const exercise of exercises) {
      const publique = toPublicExercise(exercise)
      const texte = JSON.stringify(publique)
      expect(publique).not.toHaveProperty('answer')
      expect(publique).not.toHaveProperty('solution_steps')
      expect(texte).not.toContain('misconception')
      expect(publique.answer_unit).toBe(exercise.answer.unit ?? null)
    }
  })

  it('le serveur recompose l exercice et corrige comme l application', () => {
    // Meme decoupage que publier_contenu() (migration 0005), puis la
    // recomposition de l'Edge Function : le verdict doit etre identique.
    for (const exercise of exercises) {
      const recompose = versExerciceACorriger({
        type: exercise.type,
        choices: exercise.choices?.map(({ key, text }) => ({ key, text })) ?? null,
        content_exercise_keys: {
          answer: exercise.answer,
          solution_steps: exercise.solution_steps,
          misconceptions: Object.fromEntries(
            (exercise.choices ?? []).map((c) => [c.key, c.misconception]),
          ),
        },
      })
      expect(recompose).not.toBeNull()
      const reponses = [String(exercise.answer.value), 'faux', ...(exercise.choices ?? []).map((c) => c.key)]
      for (const reponse of reponses) {
        expect(checkAnswer(recompose!, reponse)).toEqual(checkAnswer(exercise, reponse))
      }
    }
  })

  it('refuse de corriger un exercice sans cle', () => {
    expect(versExerciceACorriger({ type: 'qcm', choices: null, content_exercise_keys: null })).toBeNull()
  })
})

describe('checkAnswer, espaces des grands nombres', () => {
  it('accepte 1 024 ecrit avec une espace insecable, fine ou ordinaire', () => {
    const base = byType('numerique')
    const grand: Exercise = { ...base, answer: { value: 1024 } }
    // Construits par code : un caractere invisible colle dans la source se
    // perd ou se remplace sans qu'on le voie.
    for (const espace of [0x00a0, 0x202f, 0x2009, 0x20]) {
      expect(checkAnswer(grand, `1${String.fromCharCode(espace)}024`).isCorrect).toBe(true)
    }
  })
})

describe('checkAnswer, ponctuation et apostrophes', () => {
  it('accepte une reponse texte suivie de ponctuation ou avec une apostrophe typographique', () => {
    const base = byType('numerique')
    const texte: Exercise = {
      ...base,
      type: 'texte',
      answer: { value: "c'est le triangle", accepted: ['le triangle'] },
    }
    // Construit par code : une apostrophe typographique collee dans la source
    // pourrait etre remplacee sans qu'on le voie.
    const typo = String.fromCharCode(0x2019)
    for (const saisie of ['le triangle.', 'Le triangle !', `C${typo}est le triangle`, "c'est le triangle ?"]) {
      expect(checkAnswer(texte, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(texte, 'le carre.').isCorrect).toBe(false)
  })

  it('accepte un nombre suivi d un point final', () => {
    const base = byType('numerique')
    const nombre: Exercise = { ...base, answer: { value: 113 } }
    expect(checkAnswer(nombre, '113.').isCorrect).toBe(true)
    expect(checkAnswer(nombre, '113,5').isCorrect).toBe(false)
  })
})

describe('checkAnswer, accents et unites en toutes lettres', () => {
  // Caracteres construits par code : invisibles ou faciles a remplacer dans la source.
  const e = String.fromCharCode(0x00e8)
  const carre = String.fromCharCode(0x00b2)

  it('ignore les accents dans une reponse texte', () => {
    const base = byType('numerique')
    const texte: Exercise = { ...base, type: 'texte', answer: { value: `le m${e}tre` } }
    expect(checkAnswer(texte, 'le metre').isCorrect).toBe(true)
    expect(checkAnswer(texte, `LE M${e}TRE`).isCorrect).toBe(true)
  })

  it("accepte le nombre suivi de l'unite attendue, en symbole ou en toutes lettres", () => {
    const base = byType('numerique')
    const longueur: Exercise = { ...base, answer: { value: 50, unit: 'mm' } }
    for (const saisie of ['50 mm', '50mm', `50 millim${e}tres`, '50 millimetre']) {
      expect(checkAnswer(longueur, saisie).isCorrect).toBe(true)
    }
    const masse: Exercise = { ...base, answer: { value: 3, unit: 'kg' } }
    expect(checkAnswer(masse, '3 kilos').isCorrect).toBe(true)
    const aire: Exercise = { ...base, answer: { value: 12, unit: `cm${carre}` } }
    for (const saisie of [`12 cm${carre}`, '12 cm2', `12 centim${e}tres carr${String.fromCharCode(0x00e9)}s`, `12 cm carr${String.fromCharCode(0x00e9)}s`]) {
      expect(checkAnswer(aire, saisie).isCorrect).toBe(true)
    }
    const prix: Exercise = { ...base, answer: { value: 35, unit: String.fromCharCode(0x20ac) } }
    expect(checkAnswer(prix, '35 euros').isCorrect).toBe(true)
  })

  it("refuse une autre unite que celle attendue, et un mauvais nombre", () => {
    const base = byType('numerique')
    const longueur: Exercise = { ...base, answer: { value: 5, unit: 'm' } }
    expect(checkAnswer(longueur, '5 cm').isCorrect).toBe(false)
    expect(checkAnswer(longueur, '5 kilometres').isCorrect).toBe(false)
    expect(checkAnswer(longueur, '6 metres').isCorrect).toBe(false)
    const sansUnite: Exercise = { ...base, answer: { value: 5 } }
    expect(checkAnswer(sansUnite, '5 metres').isCorrect).toBe(false)
  })
})

describe('checkAnswer, durees et horaires', () => {
  const base = () => byType('numerique')

  it('accepte les ecritures courantes d une duree en heures et minutes', () => {
    const duree: Exercise = { ...base(), type: 'texte', answer: { value: '1 h 15 min' } }
    for (const saisie of ['1 h 15 min', '1h15', '1 h 15', '1 heure 15', '1 heure et 15 minutes', '1 h et 15 min', '1 h 15 mn', '1 heure 15 min.']) {
      expect(checkAnswer(duree, saisie).isCorrect).toBe(true)
    }
    for (const saisie of ['01:15', '01 h 15', '1 heure, 15 minutes']) {
      expect(checkAnswer(duree, saisie).isCorrect).toBe(true)
    }
    for (const saisie of ['1 h 50', '1 h 05', '75 min', '2 h 15']) {
      expect(checkAnswer(duree, saisie).isCorrect).toBe(false)
    }
  })

  it('accepte un horaire ecrit avec h, heures ou deux-points', () => {
    const horaire: Exercise = { ...base(), type: 'texte', answer: { value: '14 h 35' } }
    for (const saisie of ['14 h 35', '14h35', '14:35', '14 heures 35', '14 heures et 35 minutes', '14 h 35 min', '14 heures, 35 minutes']) {
      expect(checkAnswer(horaire, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(horaire, '15 h 35').isCorrect).toBe(false)
  })

  it('accepte minutes et secondes, abreviations comprises', () => {
    const duree: Exercise = { ...base(), type: 'texte', answer: { value: '7 min 50 s' } }
    for (const saisie of ['7 min 50', '7 minutes 50 secondes', '7 mn 50 s', '7 min et 50 sec']) {
      expect(checkAnswer(duree, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(duree, '4 min 70 s').isCorrect).toBe(false)
    const minutes: Exercise = { ...base(), answer: { value: 15, unit: 'min' } }
    expect(checkAnswer(minutes, '15 mn').isCorrect).toBe(true)
  })
})

describe('checkAnswer, angles en degres', () => {
  const angle: Exercise = { ...byType('numerique'), answer: { value: 120, unit: '°' } }

  it('affiche le degre colle au nombre', () => {
    expect(formatExpected(angle)).toBe('120°')
  })

  it.each(['120', '120°', '120 °', '120 degres', '120 degrés', '120 degré'])('accepte « %s »', (saisie) => {
    expect(checkAnswer(angle, saisie).isCorrect).toBe(true)
  })

  it('refuse une autre mesure', () => {
    expect(checkAnswer(angle, '60°').isCorrect).toBe(false)
  })
})

describe('checkAnswer, nombres relatifs', () => {
  const relatif: Exercise = { ...byType('numerique'), answer: { value: -3 } }

  // Le moins typographique, le tiret demi-cadratin et la parenthese arrivent
  // par le clavier d'un telephone ou un copier-coller.
  it.each(['-3', '- 3', '\u22123', '\u2013 3', '(-3)', '-3,0'])('accepte « %s »', (saisie) => {
    expect(checkAnswer(relatif, saisie).isCorrect).toBe(true)
  })

  it('refuse le nombre oppose', () => {
    expect(checkAnswer(relatif, '3').isCorrect).toBe(false)
    expect(checkAnswer(relatif, '(3)').isCorrect).toBe(false)
  })

  it('accepte une reponse attendue ecrite avec le moins typographique', () => {
    const ecrite: Exercise = { ...relatif, answer: { value: '\u22123' } }
    expect(checkAnswer(ecrite, '-3').isCorrect).toBe(true)
  })

  it('accepte une temperature en degres Celsius', () => {
    const temperature: Exercise = { ...relatif, answer: { value: -3, unit: '°C' } }
    for (const saisie of ['-3 °C', '-3°C', '\u22123 °C', '-3 degres', '-3 degrés Celsius', '-3']) {
      expect(checkAnswer(temperature, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(temperature, '-3 cm').isCorrect).toBe(false)
    const chaud: Exercise = { ...relatif, answer: { value: 8, unit: '°C' } }
    for (const saisie of ['+8 °C', '+8', '8 °C', '(+8)']) {
      expect(checkAnswer(chaud, saisie).isCorrect).toBe(true)
    }
  })
})

describe('formatExpected, nombres relatifs', () => {
  it('affiche un negatif avec le signe moins typographique', () => {
    const moins = String.fromCharCode(0x2212)
    const base = byType('numerique')
    expect(formatExpected({ ...base, answer: { value: -3 } })).toBe(`${moins}3`)
    expect(formatExpected({ ...base, answer: { value: -2.5, unit: '°C' } })).toBe(`${moins}2,5 °C`)
    expect(formatExpected({ ...base, answer: { value: 4 } })).toBe('4')
  })
})

describe('checkAnswer, puissances et notation scientifique (etape 6)', () => {
  const sup = (...codes: number[]) => String.fromCharCode(...codes)
  const trois = sup(0xb3)
  const moinsTrois = sup(0x207b, 0xb3)

  it('ne lit plus « 10³ » comme 103', () => {
    const cent3: Exercise = { ...byType('numerique'), answer: { value: 103 } }
    expect(checkAnswer(cent3, `10${trois}`).isCorrect).toBe(false)
    expect(checkAnswer(cent3, '103').isCorrect).toBe(true)
  })

  it('ne calcule pas une puissance : « 2^5 » ne vaut pas 32', () => {
    const trenteDeux: Exercise = { ...byType('numerique'), answer: { value: 32 } }
    expect(checkAnswer(trenteDeux, '2^5').isCorrect).toBe(false)
  })

  it('reconnait les ecritures d une puissance attendue en texte', () => {
    const puissance: Exercise = { ...byType('numerique'), type: 'texte', answer: { value: '10^-3' } }
    for (const saisie of ['10^-3', `10${moinsTrois}`, '10^(-3)', '10 puissance -3', '10**-3', '10 ^ -3']) {
      expect(checkAnswer(puissance, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(puissance, '10^3').isCorrect).toBe(false)
  })

  it('reconnait une notation scientifique ecrite de plusieurs facons', () => {
    const scientifique: Exercise = { ...byType('numerique'), type: 'texte', answer: { value: '3,2 \u00D7 10^4' } }
    for (const saisie of ['3,2 \u00D7 10^4', '3,2x10^4', '3.2 x 10^4', '3,2*10^4', `3,2 \u00D7 10${sup(0x2074)}`]) {
      expect(checkAnswer(scientifique, saisie).isCorrect).toBe(true)
    }
    expect(checkAnswer(scientifique, '32000').isCorrect).toBe(false)
    expect(checkAnswer(scientifique, '32 \u00D7 10^3').isCorrect).toBe(false)
  })

  it('garde les unites d aire et de volume', () => {
    const aire: Exercise = { ...byType('numerique'), answer: { value: 12, unit: 'cm' + sup(0xb2) } }
    expect(checkAnswer(aire, '12 cm' + sup(0xb2)).isCorrect).toBe(true)
    expect(checkAnswer(aire, '12 cm2').isCorrect).toBe(true)
  })
})

describe('checkAnswer, fractions relatives et signe de division (etape 6)', () => {
  const moinsCinqDemis: Exercise = { ...byType('numerique'), answer: { value: '-5/2' } }

  it.each(['-5/2', '(-5)/2', '-(5/2)', '5/-2', '-2,5', '\u2212(5/2)'])('accepte « %s »', (saisie) => {
    expect(checkAnswer(moinsCinqDemis, saisie).isCorrect).toBe(true)
  })

  it('refuse le signe oublie et la notation exponentielle de JavaScript', () => {
    expect(checkAnswer(moinsCinqDemis, '5/2').isCorrect).toBe(false)
    const mille: Exercise = { ...byType('numerique'), answer: { value: 1000 } }
    expect(checkAnswer(mille, '1e3').isCorrect).toBe(false)
  })

  it('lit le signe \u00F7 comme une barre de fraction', () => {
    const troisQuarts: Exercise = { ...byType('numerique'), answer: { value: '3/4' } }
    expect(checkAnswer(troisQuarts, '3\u00F74').isCorrect).toBe(true)
  })
})

describe('formatExpected, grands nombres', () => {
  it('separe les milliers par une espace fine', () => {
    const fine = String.fromCharCode(0x202f)
    const base = byType('numerique')
    expect(formatExpected({ ...base, answer: { value: 1000000 } })).toBe(`1${fine}000${fine}000`)
    expect(formatExpected({ ...base, answer: { value: 2024.5 } })).toBe(`2${fine}024,5`)
    expect(formatExpected({ ...base, answer: { value: -12345 } })).toBe(`${String.fromCharCode(0x2212)}12${fine}345`)
    expect(formatExpected({ ...base, answer: { value: 999 } })).toBe('999')
  })
})

