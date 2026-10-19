// Melange des propositions d'un QCM a l'affichage.
//
// Pourquoi : dans le contenu, la bonne proposition est souvent a la meme place
// d'un exercice a l'autre, et un eleve qui refait un exercice retrouve la
// reponse par sa position, sans relire. On melange donc l'ORDRE d'affichage,
// sans toucher aux cles : la correction serveur compare la cle choisie, et
// certains corriges citent « la proposition c ». La pastille garde donc sa
// lettre d'origine.

/** Copie melangee (Fisher-Yates). `aleatoire` est injectable pour les tests. */
export function melanger<T>(elements: readonly T[], aleatoire: () => number = Math.random): T[] {
  const copie = [...elements]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(aleatoire() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}
