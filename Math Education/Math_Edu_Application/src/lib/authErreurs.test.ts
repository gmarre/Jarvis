import { describe, expect, it } from 'vitest'

import { messageAuth, verifierMotDePasse } from './authErreurs'

describe('verifierMotDePasse', () => {
  it('accepte deux saisies identiques de 8 caracteres', () => {
    expect(verifierMotDePasse('abcdefgh', 'abcdefgh')).toEqual({})
  })

  it('refuse un mot de passe trop court', () => {
    expect(verifierMotDePasse('abc', 'abc').motDePasse).toMatch(/8 caractères/)
  })

  it('refuse deux saisies differentes, ou une confirmation vide', () => {
    expect(verifierMotDePasse('abcdefgh', 'abcdefgi').confirmation).toMatch(/différentes/)
    expect(verifierMotDePasse('abcdefgh', '').confirmation).toMatch(/seconde fois/)
  })
})

describe('messageAuth', () => {
  it("dit qu'une adresse n'est pas confirmee, au lieu de « mot de passe incorrect »", () => {
    expect(messageAuth({ code: 'email_not_confirmed' }, 'connexion')).toMatch(/pas encore confirmée/)
  })

  it('ne distingue pas un email inconnu d un mot de passe faux a la connexion', () => {
    expect(messageAuth({ code: 'invalid_credentials' }, 'connexion')).toBe(
      'Adresse ou mot de passe incorrect.',
    )
    expect(messageAuth({ message: 'quelque chose' }, 'connexion')).toBe(
      'Adresse ou mot de passe incorrect.',
    )
  })

  it('traduit la limite d envoi des emails', () => {
    expect(messageAuth({ code: 'over_email_send_rate_limit' }, 'inscription')).toMatch(/quelques minutes/)
  })

  it("parle de l'ancien mot de passe lors d'une modification", () => {
    expect(messageAuth({ code: 'invalid_credentials' }, 'modification')).toMatch(/ancien mot de passe/)
  })
})
