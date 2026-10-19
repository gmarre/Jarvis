import { describe, expect, it } from 'vitest'

import {
  ageAu,
  echapper,
  emailConsentement,
  emailModification,
  refusFrequence,
  verifierValeur,
} from '../../supabase/functions/_shared/accord'

// Regles de l'Edge Function accord-parental : meme fichier cote serveur.

const AUJOURDHUI = new Date(Date.UTC(2026, 9, 19))

describe('ageAu', () => {
  it('compte un age revolu, anniversaire compris', () => {
    expect(ageAu('2011-10-19', AUJOURDHUI)).toBe(15)
    expect(ageAu('2011-10-20', AUJOURDHUI)).toBe(14)
  })

  it('refuse une date impossible au lieu de la decaler', () => {
    expect(ageAu('2014-02-31', AUJOURDHUI)).toBeNull()
    expect(ageAu('19/10/2014', AUJOURDHUI)).toBeNull()
  })
})

describe('verifierValeur', () => {
  it('accepte une adresse et une date plausibles', () => {
    expect(verifierValeur('email', 'lea@test.fr', AUJOURDHUI)).toBeNull()
    expect(verifierValeur('date_naissance', '2013-05-01', AUJOURDHUI)).toBeNull()
  })

  it('refuse une adresse incomplete et une date absurde', () => {
    expect(verifierValeur('email', 'lea@test', AUJOURDHUI)).not.toBeNull()
    expect(verifierValeur('date_naissance', '2025-01-01', AUJOURDHUI)).not.toBeNull()
    expect(verifierValeur('date_naissance', '1800-01-01', AUJOURDHUI)).not.toBeNull()
  })
})

describe('refusFrequence', () => {
  const maintenant = new Date('2026-10-19T12:00:00Z')
  const ilYA = (minutes: number) => new Date(maintenant.getTime() - minutes * 60_000)

  it('laisse partir un premier envoi', () => {
    expect(refusFrequence([], maintenant)).toBeNull()
  })

  it('impose deux minutes entre deux envois', () => {
    expect(refusFrequence([ilYA(1)], maintenant)).toMatch(/deux minutes/)
    expect(refusFrequence([ilYA(3)], maintenant)).toBeNull()
  })

  it('plafonne a 5 envois par jour', () => {
    const cinq = [10, 20, 30, 40, 50].map(ilYA)
    expect(refusFrequence(cinq, maintenant)).toMatch(/demain/)
    expect(refusFrequence([...cinq.slice(1), ilYA(25 * 60)], maintenant)).toBeNull()
  })
})

describe('emails', () => {
  it('echappe le prenom saisi par l eleve dans le HTML', () => {
    const email = emailConsentement('<script>x</script>', 'http://localhost:5173/accord/abc')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain(echapper('<script>x</script>'))
  })

  it('montre au parent la valeur exacte demandee', () => {
    const email = emailModification('Lea', 'date_naissance', '2013-05-01', 'http://x/accord/abc')
    expect(email.texte).toContain('01/05/2013')
    expect(emailModification('Lea', 'email', 'lea2@test.fr', 'http://x').texte).toContain('lea2@test.fr')
  })
})
