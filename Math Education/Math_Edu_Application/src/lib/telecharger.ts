// Telechargement d'un export RGPD en JSON, dans le navigateur. Rien ne passe
// par un serveur : le fichier est fabrique a partir de ce que la base a deja
// rendu au demandeur.

export function telechargerJson(nom: string, contenu: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}
