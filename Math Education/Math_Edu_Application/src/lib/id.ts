// Generation d'identifiants.
//
// Pourquoi ce fichier plutot qu'un appel direct a crypto.randomUUID() :
//
//  1. Le navigateur ne l'expose QUE dans un contexte securise (https, ou
//     localhost). Servir l'app sur une IP de reseau local en http, ce qui est
//     exactement ce qu'on fait pour tester sur un vrai telephone avec
//     `npm run dev -- --host`, laisse crypto.randomUUID indefini. L'app
//     planterait a la premiere reponse d'exercice, et seulement sur mobile.
//  2. Sous Node, selon la version, l'objet crypto global n'est pas toujours la.
//
// Un identifiant sert ici de cle primaire cote client, pas de secret
// cryptographique : le repli sur Math.random est donc acceptable. Il ne doit
// jamais servir a generer un jeton (par exemple le lien de consentement
// parental), qui se fabrique cote serveur.

/** Identifiant unique, au format UUID v4. */
export function newId(): string {
  const c = globalThis.crypto

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  // Repli sur des octets aleatoires, puis mise en forme UUID v4.
  if (c && typeof c.getRandomValues === 'function') {
    const octets = c.getRandomValues(new Uint8Array(16))
    return formaterUuid(octets)
  }

  // Dernier repli : pas cryptographique, mais suffisant pour une cle locale.
  const octets = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) octets[i] = Math.floor(Math.random() * 256)
  return formaterUuid(octets)
}

function formaterUuid(octets: Uint8Array): string {
  // Version 4 et variante RFC 4122, comme le fait randomUUID.
  octets[6] = (octets[6] & 0x0f) | 0x40
  octets[8] = (octets[8] & 0x3f) | 0x80

  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}
