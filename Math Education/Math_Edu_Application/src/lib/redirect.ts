// Nettoyage des destinations de redirection.
//
// Ce fichier n'exporte aucun composant, pour que le rechargement a chaud de Vite
// reste fonctionnel sur les ecrans qui s'en servent (meme raison que la
// separation state/session.ts et state/SessionProvider.tsx).

/**
 * Destination de retour apres connexion, nettoyee.
 *
 * On ne fait pas confiance a la valeur recue : `//evil.com` et `/\evil.com` sont
 * interpretes par le navigateur comme des adresses externes, ce qui transforme
 * l'ecran de connexion en redirection ouverte. Un lien piege du type
 * `https://app/\evil.com` renverrait l'eleve chez un tiers juste apres qu'il a
 * saisi son mot de passe.
 *
 * On n'accepte donc qu'un chemin interne simple, et on retombe sur l'accueil
 * dans tous les autres cas.
 */
export function safeRedirect(target: string | undefined): string {
  if (!target) return '/'
  // Une URL absolue, un protocole, un nom d'hote : tout cela sort de l'app.
  if (!target.startsWith('/')) return '/'
  // Second caractere interdit : un slash ou un antislash de plus ouvre a nouveau
  // sur l'exterieur, c'est la forme utilisee pour contourner le test precedent.
  if (/^\/[\\/]/.test(target)) return '/'
  // Renvoyer sur la connexion depuis la connexion boucle.
  if (target === '/connexion') return '/'
  return target
}
