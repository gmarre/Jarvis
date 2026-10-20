import { describe, expect, it } from 'vitest'

import {
  ETAT_INITIAL,
  apresEpreuve,
  apresReponse,
  attendEpreuve,
  controleDu,
  estDeMaitrise,
  exerciceDeControle,
  valideeParLeTest,
  viseSansFaute,
  type Epreuve,
  type EtatMaitrise,
} from './maitrise'

// Table validee par Gauthier le 20 octobre 2026. Ces tests en sont la
// traduction executable : l'horloge est passee en parametre et avancee a la
// main, pour prouver le calendrier des controles sans attendre des semaines.

const JOUR = 24 * 3600 * 1000
const T0 = new Date(2026, 9, 20, 18, 0)
const plus = (jours: number, depuis = T0) => new Date(depuis.getTime() + jours * JOUR)

function repond(etat: EtatMaitrise, exerciseId: string, juste: boolean, quand = T0) {
  return apresReponse(etat, exerciseId, juste, quand)
}

describe('estDeMaitrise', () => {
  it('reconnait un exercice de niveau maitrise a son identifiant', () => {
    expect(estDeMaitrise('EX-A001-M-02')).toBe(true)
    expect(estDeMaitrise('EX-A001-E-01')).toBe(false)
  })
})

describe('apprendre une competence (niveaux 0 a 4)', () => {
  it('un exercice reussi donne 1, deux exercices differents sans maitrise donnent 2', () => {
    const un = repond(ETAT_INITIAL, 'EX-B044-D-01', true).etat
    expect(un.niveau).toBe(1)
    const deux = repond(un, 'EX-B044-E-01', true).etat
    expect(deux.niveau).toBe(2)
  })

  it('le meme exercice reussi deux fois ne compte qu une fois', () => {
    const un = repond(ETAT_INITIAL, 'EX-B044-D-01', true).etat
    expect(repond(un, 'EX-B044-D-01', true).etat.niveau).toBe(1)
  })

  it('deux exercices differents dont un de maitrise : acquise (4), premier controle a J+3', () => {
    const un = repond(ETAT_INITIAL, 'EX-B044-E-01', true).etat
    const evolution = repond(un, 'EX-B044-M-01', true)
    expect(evolution.vientDEtreAcquise).toBe(true)
    expect(evolution.etat.niveau).toBe(4)
    expect(controleDu(evolution.etat, plus(2))).toBe(false)
    expect(controleDu(evolution.etat, plus(3))).toBe(true)
  })

  it('un seul exercice de maitrise ne suffit pas', () => {
    expect(repond(ETAT_INITIAL, 'EX-B044-M-01', true).etat.niveau).toBe(1)
  })

  it('une erreur pendant l apprentissage ne fait pas redescendre', () => {
    const un = repond(ETAT_INITIAL, 'EX-B044-D-01', true).etat
    expect(repond(un, 'EX-B044-E-01', false).etat).toEqual(un)
  })
})

describe('scenario d horloge : controles J+3, J+10, J+30 puis 5', () => {
  it('trois controles reussis a leur echeance menent a la maitrise complete', () => {
    let etat = repond(repond(ETAT_INITIAL, 'EX-B044-E-01', true).etat, 'EX-B044-M-01', true).etat

    const j3 = plus(3)
    expect(controleDu(etat, j3)).toBe(true)
    let evolution = repond(etat, 'EX-B044-E-02', true, j3)
    expect(evolution.controle).toBe('reussi')
    etat = evolution.etat
    expect(etat.niveau).toBe(4)
    // Le prochain controle tombe 10 jours apres celui-ci, pas avant.
    expect(controleDu(etat, plus(9, j3))).toBe(false)
    expect(controleDu(etat, plus(10, j3))).toBe(true)

    const j13 = plus(10, j3)
    etat = repond(etat, 'EX-B044-M-02', true, j13).etat
    expect(controleDu(etat, plus(29, j13))).toBe(false)
    expect(controleDu(etat, plus(30, j13))).toBe(true)

    const j43 = plus(30, j13)
    evolution = repond(etat, 'EX-B044-E-01', true, j43)
    expect(evolution.etat.niveau).toBe(5)
    expect(evolution.etat.prochain_controle).toBeNull()
    expect(controleDu(evolution.etat, plus(365, j43))).toBe(false)
  })

  it('un controle rate rouvre la competence (3), un exercice de maitrise la remonte a 4', () => {
    const acquise = repond(repond(ETAT_INITIAL, 'EX-B044-E-01', true).etat, 'EX-B044-M-01', true).etat
    const rate = repond(acquise, 'EX-B044-D-02', false, plus(3))
    expect(rate.controle).toBe('rate')
    expect(rate.etat.niveau).toBe(3)
    expect(rate.etat.prochain_controle).toBeNull()

    // Un exercice d'entrainement reussi ne suffit pas a la remonter.
    const entrainement = repond(rate.etat, 'EX-B044-E-02', true, plus(4))
    expect(entrainement.etat.niveau).toBe(3)
    // Un exercice de maitrise reussi, si : le calendrier repart de J+3.
    const remontee = repond(entrainement.etat, 'EX-B044-M-02', true, plus(5))
    expect(remontee.etat.niveau).toBe(4)
    expect(remontee.vientDEtreAcquise).toBe(true)
    expect(controleDu(remontee.etat, plus(8))).toBe(true)
  })

  it('au niveau 5, plus rien ne bouge', () => {
    const cinq: EtatMaitrise = { ...ETAT_INITIAL, niveau: 5 }
    expect(repond(cinq, 'EX-B044-D-01', false).etat).toEqual(cinq)
  })
})

describe('competence validee par le test d entree', () => {
  it('part de 4 avec des controles a J+14 puis J+45, et passe a 5 apres deux reussites', () => {
    let etat = valideeParLeTest(T0)
    expect(etat.niveau).toBe(4)
    expect(controleDu(etat, plus(13))).toBe(false)
    expect(controleDu(etat, plus(14))).toBe(true)

    const j14 = plus(14)
    etat = repond(etat, 'EX-A010-E-01', true, j14).etat
    expect(etat.niveau).toBe(4)
    expect(controleDu(etat, plus(44, j14))).toBe(false)
    expect(controleDu(etat, plus(45, j14))).toBe(true)

    etat = repond(etat, 'EX-A010-M-01', true, plus(45, j14)).etat
    expect(etat.niveau).toBe(5)
  })

  it('un controle rate rouvre la competence, et le calendrier normal reprend apres', () => {
    const rate = repond(valideeParLeTest(T0), 'EX-A010-E-01', false, plus(14)).etat
    expect(rate.niveau).toBe(3)
    const remontee = repond(rate, 'EX-A010-M-01', true, plus(15)).etat
    expect(remontee.valide_par_test).toBe(false)
    expect(controleDu(remontee, plus(18))).toBe(true)
  })
})

describe('exerciceDeControle', () => {
  const exos = [
    { id: 'EX-X-D-01', level: 'decouverte' },
    { id: 'EX-X-E-01', level: 'entrainement' },
    { id: 'EX-X-M-01', level: 'maitrise' },
  ]

  it('ecarte la decouverte et prend l exercice le moins recemment fait', () => {
    const tentatives = [
      { exercise_id: 'EX-X-E-01', created_at: '2026-10-19T10:00:00Z' },
      { exercise_id: 'EX-X-M-01', created_at: '2026-10-10T10:00:00Z' },
    ]
    expect(exerciceDeControle(exos, tentatives)?.id).toBe('EX-X-M-01')
  })

  it('prefere un exercice jamais fait', () => {
    const tentatives = [{ exercise_id: 'EX-X-M-01', created_at: '2026-10-10T10:00:00Z' }]
    expect(exerciceDeControle(exos, tentatives)?.id).toBe('EX-X-E-01')
  })
})

// Decision de Gauthier du 20 octobre 2026 : le super exercice reussi fait
// passer la competence au niveau 4 ; le niveau 5 demande en plus un super
// exercice sans faute.
describe('super exercice : il fait acquerir, le sans-faute ouvre le 5', () => {
  const aFaire: Epreuve = { existe: true, reussie: false, sansFaute: false }
  const reussi: Epreuve = { existe: true, reussie: true, sansFaute: false }
  const parfait: Epreuve = { existe: true, reussie: true, sansFaute: true }

  function exercicesFaits(epreuve: Epreuve) {
    const un = apresReponse(ETAT_INITIAL, 'EX-C013-D-01', true, T0, epreuve).etat
    return apresReponse(un, 'EX-C013-M-01', true, T0, epreuve)
  }

  it('exercices faits sans super exercice reussi : niveau 3, en attente', () => {
    const r = exercicesFaits(aFaire)
    expect(r.etat.niveau).toBe(3)
    expect(r.vientDEtreAcquise).toBe(false)
    expect(r.attendEpreuve).toBe(true)
    expect(attendEpreuve(r.etat, aFaire)).toBe(true)
  })

  it('d autres exercices reussis ne suffisent pas : c est le super exercice', () => {
    const r = apresReponse(exercicesFaits(aFaire).etat, 'EX-C013-M-02', true, T0, aFaire)
    expect(r.etat.niveau).toBe(3)
  })

  it('le super exercice reussi fait passer a 4, avec un controle a J+3', () => {
    const r = apresEpreuve(exercicesFaits(aFaire).etat, { reussie: true, sansFaute: false }, T0)
    expect(r.etat.niveau).toBe(4)
    expect(r.vientDEtreAcquise).toBe(true)
    expect(controleDu(r.etat, plus(3))).toBe(true)
  })

  it('un super exercice rate ne fait rien redescendre', () => {
    const avant = exercicesFaits(aFaire).etat
    const r = apresEpreuve(avant, { reussie: false, sansFaute: false }, T0)
    expect(r.etat).toEqual(avant)
    expect(r.attendEpreuve).toBe(true)
  })

  it('reussi avant les exercices : il ne fait rien, les exercices concluent ensuite', () => {
    expect(apresEpreuve(ETAT_INITIAL, { reussie: true, sansFaute: true }, T0).etat.niveau).toBe(0)
    expect(exercicesFaits(reussi).etat.niveau).toBe(4)
  })

  it('controles faits sans le sans-faute : la competence reste a 4', () => {
    let etat = exercicesFaits(reussi).etat
    for (const j of [3, 13, 43]) etat = apresReponse(etat, 'EX-C013-E-01', true, plus(j), reussi).etat
    expect(etat.niveau).toBe(4)
    expect(etat.prochain_controle).toBeNull()
    expect(viseSansFaute(etat, reussi)).toBe(true)
    // Le sans-faute arrive ensuite : niveau 5.
    expect(apresEpreuve(etat, { reussie: true, sansFaute: true }, plus(50)).etat.niveau).toBe(5)
  })

  it('sans-faute deja fait : les trois controles donnent 5', () => {
    let etat = exercicesFaits(parfait).etat
    for (const j of [3, 13, 43]) etat = apresReponse(etat, 'EX-C013-E-01', true, plus(j), parfait).etat
    expect(etat.niveau).toBe(5)
  })

  it('un sans-faute avant la fin des controles ne saute pas les controles', () => {
    const etat = exercicesFaits(reussi).etat
    expect(apresEpreuve(etat, { reussie: true, sansFaute: true }, plus(1)).etat.niveau).toBe(4)
  })

  it('competence rouverte apres un controle rate : super deja reussi, une maitrise suffit', () => {
    const acquis = exercicesFaits(reussi).etat
    const rouverte = apresReponse(acquis, 'EX-C013-E-02', false, plus(3), reussi).etat
    expect(rouverte.niveau).toBe(3)
    expect(apresReponse(rouverte, 'EX-C013-M-02', true, plus(4), reussi).etat.niveau).toBe(4)
  })
})
