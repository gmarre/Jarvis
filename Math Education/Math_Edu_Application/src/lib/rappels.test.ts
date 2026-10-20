import { describe, expect, it } from 'vitest'

import { decider, emailRappel, momentParis, type SituationRappel } from '../../supabase/functions/_shared/rappels'

// Regles des rappels (Etude_engagement.md, partie 4) : la fonction serveur
// rappel-revision decide avec ce module ; ces tests en sont le contrat.

// Mercredi 21 octobre 2026, 17 h 10 a Paris (heure d'ete : UTC+2).
const MERCREDI_17H10 = new Date('2026-10-21T15:10:00Z')

function situation(extra: Partial<SituationRappel> = {}): SituationRappel {
  return {
    maintenant: MERCREDI_17H10,
    heure: '17:00',
    joursTravail: [1, 3, 5],
    pauseJusquAu: null,
    envois: [],
    seances: [],
    ...extra,
  }
}

describe('momentParis', () => {
  it('jour, jour de la semaine et minutes a Paris', () => {
    expect(momentParis(MERCREDI_17H10)).toEqual({ jour: '2026-10-21', jourSemaine: 3, minutes: 17 * 60 + 10 })
  })
  it('passe minuit a Paris avant UTC', () => {
    expect(momentParis(new Date('2026-10-20T22:30:00Z')).jour).toBe('2026-10-21')
  })
})

describe('decider', () => {
  it('un jour de travail, apres l heure, rien fait : on envoie', () => {
    expect(decider(situation())).toEqual({ envoyer: true })
  })
  it('pas un jour choisi, trop tot, trop tard, en pause', () => {
    expect(decider(situation({ joursTravail: [2, 4] })).envoyer).toBe(false)
    expect(decider(situation({ heure: '18:00' })).envoyer).toBe(false)
    expect(decider(situation({ maintenant: new Date('2026-10-21T17:45:00Z') })).envoyer).toBe(false)
    expect(decider(situation({ pauseJusquAu: '2026-10-25' })).envoyer).toBe(false)
  })
  it('deja travaille aujourd hui ou deja rappele : rien', () => {
    expect(decider(situation({ seances: ['2026-10-21T06:00:00Z'] })).envoyer).toBe(false)
    expect(decider(situation({ envois: [{ envoye_le: '2026-10-21T15:00:00Z', jour: '2026-10-21' }] })).envoyer).toBe(false)
  })
  it('au plus 3 par 7 jours', () => {
    const envois = [
      { envoye_le: '2026-10-19T15:00:00Z', jour: '2026-10-19' },
      { envoye_le: '2026-10-16T15:00:00Z', jour: '2026-10-16' },
      { envoye_le: '2026-10-15T15:00:00Z', jour: '2026-10-15' },
    ]
    const seances = ['2026-10-19T16:00:00Z', '2026-10-16T16:00:00Z', '2026-10-15T16:00:00Z']
    expect(decider(situation({ envois, seances }))).toEqual({ envoyer: false, raison: 'plafond de la semaine' })
  })
  it('deux rappels d affilee sans seance : on arrete', () => {
    const envois = [
      { envoye_le: '2026-10-19T15:00:00Z', jour: '2026-10-19' },
      { envoye_le: '2026-10-16T15:00:00Z', jour: '2026-10-16' },
    ]
    expect(decider(situation({ envois }))).toEqual({ envoyer: false, raison: 'sans effet', arreter: true })
    // Un seul des deux a ete suivi d'une seance : on continue.
    expect(decider(situation({ envois, seances: ['2026-10-16T17:00:00Z'] }))).toEqual({ envoyer: true })
  })
})

describe('emailRappel', () => {
  it('factuel, sans serie, avec le lien de desinscription', () => {
    const e = emailRappel('Léa', true, 3, 'https://app/travail', 'https://app/rappels/abc')
    expect(e.texte).toContain('Léa a choisi de travailler 3 jours par semaine')
    expect(e.texte).toContain('https://app/rappels/abc')
    expect(e.texte).not.toMatch(/série|flamme|raté/i)
  })
  it('echappe le prenom dans le HTML', () => {
    expect(emailRappel('<b>', true, 3, 'l', 'd').html).not.toContain('<b>')
  })
})
