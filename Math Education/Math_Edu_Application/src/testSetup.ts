// Prepare chaque fichier de test : le contenu pedagogique local est installe
// avant tout, comme le ferait le repository au demarrage de l'application.
// Les tests du moteur lisent `skills` ou `getExercisesForSkill` sans passer par
// une session.

import { installerContenu } from '@/content'
import { chargerContenuLocal } from '@/content/chargement'

installerContenu(await chargerContenuLocal())
