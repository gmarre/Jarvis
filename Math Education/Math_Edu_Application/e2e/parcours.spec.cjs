// Parcours eleve, professeur et parent, en mode demonstration.
// Chaque test part d'un navigateur vierge (stockage local vide).

const { expect, test } = require('@playwright/test')

async function connexionDemo(page, bouton) {
  await page.goto('/connexion')
  await page.getByRole('button', { name: bouton }).click()
}

test('eleve : connexion, exercice corrige, parcours et cartes', async ({ page }) => {
  await connexionDemo(page, 'Élève de démonstration (Léa, 4e)')
  await expect(page).toHaveURL(/\/travail/)

  // La priorite du jour ouvre un exercice ; une reponse vide n'est pas envoyee,
  // une reponse fausse est corrigee avec la bonne reponse.
  await page.getByRole('button', { name: 'Commencer' }).first().click()
  await expect(page).toHaveURL(/\/exercice\//)
  // La page d'exercice se charge a la demande : attendre son bouton.
  await expect(page.getByRole('button', { name: 'Valider' })).toBeVisible()
  const champ = page.getByPlaceholder(/Ta réponse/)
  if (await champ.count()) {
    await champ.fill('999999')
  } else {
    await page.getByRole('radiogroup').getByRole('radio').first().click()
  }
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText(/C'est juste\.|Pas encore\. La réponse était/)).toBeVisible()

  await page.goto('/parcours')
  await expect(page.getByRole('heading').first()).toBeVisible()

  await page.goto('/cartes')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('eleve : super exercice rendu d un bloc, score et passage', async ({ page }) => {
  await connexionDemo(page, 'Élève de démonstration (Léa, 4e)')
  await expect(page).toHaveURL(/\/travail/)

  // Copie rendue sans reponse : chaque question est corrigee et comptee fausse.
  await page.goto('/super/SX-C012-01')
  await page.getByRole('button', { name: 'Commencer' }).click()
  const suivante = page.getByRole('button', { name: 'Question suivante' })
  while (await suivante.isVisible()) await suivante.click()
  await page.getByRole('button', { name: 'Rendre ma copie' }).click()

  await expect(page.getByText('Pas encore', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^0 \/ \d+ points$/ })).toBeVisible()
})

test('professeur : agenda, creneaux et eleves', async ({ page }) => {
  await connexionDemo(page, 'Espace professeur')
  await expect(page).toHaveURL(/\/prof\//)

  for (const chemin of ['/prof/agenda', '/prof/cours', '/prof/eleves']) {
    await page.goto(chemin)
    await expect(page).toHaveURL(new RegExp(chemin))
    await expect(page.getByRole('heading').first()).toBeVisible()
  }
})

test('parent : inscription, puis espace parent', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByRole('radio', { name: 'Parent' }).click()
  await page.getByLabel('Prénom').fill('Claire')
  await page.getByLabel('Email').fill('claire.parent@example.com')
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse-solide-42')
  await page.getByLabel('Confirme le mot de passe').fill('motdepasse-solide-42')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  // Selon l'etat du profil, l'inscription passe par /bienvenue.
  if (/\/bienvenue/.test(page.url()) || (await page.getByRole('button', { name: 'Continuer' }).count())) {
    await page.getByRole('button', { name: 'Continuer' }).click()
  }
  await expect(page).toHaveURL(/\/parent/)
  await expect(page.getByText('Aucun enfant rattaché')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
})
