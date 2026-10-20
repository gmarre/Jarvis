import { describe, expect, it } from 'vitest'

import { emailRapport, lundiDe, resumer } from '../../supabase/functions/_shared/rapport'

describe('rapport hebdomadaire', () => {
  it('resume : exercices, justes, jours distincts', () => {
    const r = resumer({
      tentatives: [
        { created_at: '2026-10-19T16:00:00Z', is_correct: true },
        { created_at: '2026-10-19T16:05:00Z', is_correct: false },
        { created_at: '2026-10-21T17:00:00Z', is_correct: true },
      ],
      acquises: 1,
      cartesRevues: 4,
      superReussis: 0,
    })
    expect(r).toEqual({ exercices: 3, justes: 2, jours: 2, acquises: 1, cartesRevues: 4, superReussis: 0 })
  })

  it('le lundi de la semaine', () => {
    expect(lundiDe(new Date('2026-10-25T18:00:00Z'))).toBe('2026-10-19')
    expect(lundiDe(new Date('2026-10-19T08:00:00Z'))).toBe('2026-10-19')
  })

  it('email factuel, avec la desinscription, sans serie ni note', () => {
    const r = resumer({ tentatives: [{ created_at: '2026-10-20T10:00:00Z', is_correct: true }], acquises: 0, cartesRevues: 0, superReussis: 0 })
    const e = emailRapport('Léa', r, 'https://app/parent', 'https://app/rapport/abc')
    expect(e.texte).toContain('Léa a travaillé 1 jour')
    expect(e.texte).toContain('https://app/rapport/abc')
    expect(e.texte).not.toMatch(/série|note|classement/i)
  })

  it('semaine sans travail : une phrase neutre', () => {
    const r = resumer({ tentatives: [], acquises: 0, cartesRevues: 0, superReussis: 0 })
    expect(emailRapport('Tom', r, 'l', 'd').texte).toContain("Tom n'a pas travaillé")
  })
})
